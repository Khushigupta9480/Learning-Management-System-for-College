import jwt
import datetime
import bcrypt
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.models import *
import json
from django.conf import settings
from core.utils import jwt_auth
from django.http import FileResponse
from pymongo import MongoClient
import gridfs
from bson import ObjectId
from django.http import StreamingHttpResponse, HttpResponseNotFound
from django.core.files.uploadedfile import InMemoryUploadedFile
from gridfs import GridFS
from mongoengine.connection import get_db
import traceback


SECRET_KEY = settings.SECRET_KEY  # use env variable later

#Register
@csrf_exempt
def register(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        role = data.get('role')

        if not all([username, password, email, role]):
            return JsonResponse({'error': 'All fields are required'}, status=400)

        if role == 'admin':
            return JsonResponse({'error': 'You cannot register as admin'}, status=403)

        if User.objects(email=email).first() or User.objects(username=username).first():
            return JsonResponse({'error': 'Email or Username already exists'}, status=400)

        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        user = User(username=username, email=email, password=hashed_pw.decode(), role=role)
        user.save()

        return JsonResponse({'message': 'User registered successfully'})


@csrf_exempt
def send_magic_link(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')

        user = User.objects(email=email).first()
        if not user:
            return JsonResponse({'error': 'User not found'}, status=404)

        token = jwt.encode({
            'id': str(user.id),
            'email': user.email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        }, SECRET_KEY, algorithm='HS256')

        magic_link = f"http://localhost:8000/verify-token/?token={token}"
        print(f"✨ Magic login link for {email}: {magic_link}")  # ✅ Console log

        return JsonResponse({'message': 'Magic link sent (check console)'})


@csrf_exempt
def verify_token(request):
    token = request.GET.get('token')
    if not token:
        return JsonResponse({'error': 'Token missing'}, status=400)

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        email = decoded.get('email')

        user = User.objects(email=email).first()
        if not user:
            return JsonResponse({'error': 'User not found'}, status=404)

        # ✅ Create a new full JWT like in login
        new_payload = {
            'id': str(user.id),
            'email': user.email,
            'username': user.username,
            'role': user.role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        new_token = jwt.encode(new_payload, SECRET_KEY, algorithm='HS256')

        return JsonResponse({'token': new_token})

    except jwt.ExpiredSignatureError:
        return JsonResponse({'error': 'Token expired'}, status=400)
    except jwt.InvalidTokenError:
        return JsonResponse({'error': 'Invalid token'}, status=400)
    
    
@csrf_exempt
def login_with_password(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')  # ✅ should be username
        password = data.get('password')

        user = User.objects(username=username).first()  # ✅ not email

        if user and bcrypt.checkpw(password.encode(), user.password.encode()):
            payload = {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
            return JsonResponse({'token': token})
        else:
            return JsonResponse({'error': 'Invalid username or password'}, status=401)


@csrf_exempt
@jwt_auth
def dashboard(request):
    user = request.user
    return JsonResponse({
        'id': str(user.id),
        'username': user.username,
        'role': user.role
    })

#ONLY TEACHER CAN UPLOAD COURSE

import re

def extract_youtube_id(link):
    if not link:
        return None
    match = re.search(r'(?:embed/|watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})', link)
    return match.group(1) if match else None


@csrf_exempt
@jwt_auth
def upload_course(request):
    if request.method == 'POST':
        if request.user.role != 'teacher':
            return JsonResponse({'error': 'Only teachers can upload courses'}, status=403)

        title = request.POST.get('title')
        description = request.POST.get('description')

        video_title = request.POST.get('video_title')
        video_description = request.POST.get('video_description')
        youtube_link = request.POST.get('youtube_link')
        video_file = request.FILES.get('video')

        if not title or not video_title:
            return JsonResponse({'error': 'Course and video title are required'}, status=400)

        try:
            video_id = None

            if video_file:
                db = get_db()
                fs = GridFS(db)
                stored_id = fs.put(video_file, filename=video_file.name)
                video_id = str(stored_id)  # Convert ObjectId to string

            elif youtube_link:
                video_id = extract_youtube_id(youtube_link)

            first_video = Video(
                title=video_title,
                description=video_description,
                youtube_link=youtube_link,
                video_id=video_id  # This can now be either a YouTube ID or a GridFS file ID
            )

            course = Course(
                title=title,
                description=description,
                created_by=request.user,
                videos=[first_video]
            )
            course.save()

            return JsonResponse({'message': 'Course playlist created with first video', 'video_id': video_id})

        except Exception as e:
            print("UPLOAD ERROR:", str(e))
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@jwt_auth
def add_video_to_playlist(request, course_id):
    if request.method == 'POST':
        try:
            course = Course.objects.get(id=course_id, created_by=request.user)
        except Course.DoesNotExist:
            return JsonResponse({'error': 'Course not found or unauthorized'}, status=404)

        video_title = request.POST.get('video_title')
        video_description = request.POST.get('video_description')
        youtube_link = request.POST.get('youtube_link')
        video_file = request.FILES.get('video')

        if not video_title:
            return JsonResponse({'error': 'Video title is required'}, status=400)

        try:
            video_id = None
            if video_file:
                db = get_db()
                fs = GridFS(db)
                video_id = fs.put(video_file, filename=video_file.name)

            elif youtube_link:
                video_id = extract_youtube_id(youtube_link)

            new_video = Video(
                title=video_title,
                description=video_description,
                youtube_link=youtube_link if youtube_link else None,
                video_id=video_id if video_id else None
            )

            course.videos.append(new_video)
            course.save()

            return JsonResponse({'message': 'Video added to playlist'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@jwt_auth
def delete_course(request, course_id):
    if request.method == 'DELETE':
        try:
            course = Course.objects.get(id=course_id, created_by=request.user)
            Enrollment.objects(course=course).delete()  # Delete enrollments
            course.delete()  # Delete course
            return JsonResponse({'message': 'Course deleted successfully'})
        except Course.DoesNotExist:
            return JsonResponse({'error': 'Course not found or unauthorized'}, status=404)

@csrf_exempt
@jwt_auth
def edit_course(request, course_id):
    if request.method == 'PUT':
        try:
            course = Course.objects.get(id=course_id)

            if request.user != course.created_by:
                return JsonResponse({'error': 'Unauthorized'}, status=403)

            data = json.loads(request.body)
            title = data.get('title')
            description = data.get('description')
            youtube_link = data.get('youtube_link')

            if title:
                course.title = title
            if description:
                course.description = description
            course.youtube_link = youtube_link if youtube_link else None

            course.save()
            return JsonResponse({'message': 'Course updated successfully'})
        except Course.DoesNotExist:
            return JsonResponse({'error': 'Course not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@jwt_auth
def teacher_dashboard(request):
    if request.method == 'GET':
        try:
            teacher = request.user
            courses = Course.objects(created_by=teacher).order_by('-created_at')

            uploaded_courses = []
            enrolled_students = []

            for course in courses:
                enroll_count = Enrollment.objects(course=course).count()
                first_video = course.videos[0] if course.videos else None

                uploaded_courses.append({
                    'id': str(course.id),
                    'title': course.title,
                    'description': course.description,
                    'created_at': course.created_at.strftime('%Y-%m-%d'),
                    'enrollments': enroll_count,
                    'video_id': str(first_video.video_id) if first_video and first_video.video_id else None,
                    'youtube_link': first_video.youtube_link if first_video else None,
                    'videos': [{
        'title': v.title,
        'description': v.description,
        'youtube_link': v.youtube_link,
        'video_url': f"/get-video/{v.video_id}/" if v.video_id else None
    } for v in course.videos],
    'instructor': teacher.username
                })

                enrollments = Enrollment.objects(course=course)
                students = [enroll.student.username for enroll in enrollments]

                enrolled_students.append({
                    'course_id': str(course.id),
                    'title': course.title,
                    'students': students
                })

            return JsonResponse({
                'uploaded_courses': uploaded_courses,
                'enrolled_students': enrolled_students
            }, safe=False)

        except Exception as e:
            print("❌ ERROR in teacher_dashboard:\n", traceback.format_exc())
            return JsonResponse({'error': str(e)}, status=500)



        
#ALL USERS CAN VIEW ALL COURSES
@csrf_exempt
@jwt_auth
def get_courses(request):
    if request.method == 'GET':
        try:
            print("Request received from:", request.user.username)
            courses = Course.objects.order_by('-created_at')
            course_list = []
            for course in courses:
                enroll_count = Enrollment.objects(course=course).count()
                
                # Build full videos list
                videos = []
                for video in course.videos:
                    first_video = course.videos[0] if course.videos else None
                    video_data = {
                        'title': video.title,
                        'description': video.description,
                        'youtube_link': video.youtube_link,
                        'video_id': str(video.video_id) if video.video_id else None,
                        'video_url': f"http://localhost:8000/serve_video/{video.video_id}" if video.video_id else None,
                        'uploaded_at': video.uploaded_at.strftime('%Y-%m-%d')
                    }
                    videos.append(video_data)

                course_list.append({
                    'id': str(course.id),
                    'title': course.title,
                    'description': course.description,
                    'created_by': course.created_by.username,
                    'created_at': course.created_at.strftime('%Y-%m-%d'),
                    'enrollments': enroll_count,
                    'video_id': str(first_video.video_id) if first_video and first_video.video_id else None,
                    'youtube_link': first_video.youtube_link if first_video else None,
                    'instructor': course.created_by.username,
                    'videos': videos  # include all videos
                })
            return JsonResponse({'courses': course_list})
        except Exception as e:
            print("ERROR IN GET COURSES:", str(e))
            return JsonResponse({'error': str(e)}, status=500)


client = MongoClient('mongodb://localhost:27017/')
db = client['lms']
fs = gridfs.GridFS(db)

from django.http import FileResponse, HttpResponse, HttpResponseNotFound, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from bson.objectid import ObjectId

@csrf_exempt
def serve_video(request, video_id):
    try:
        file = fs.get(ObjectId(video_id))
        # Support for video seek (Range header)
        start = 0
        end = file.length - 1

        range_header = request.headers.get('Range')
        if range_header:
            match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            if match:
                start = int(match.group(1))
                if match.group(2):
                    end = int(match.group(2))

        file.seek(start)
        chunk = file.read(end - start + 1)
        response = HttpResponse(chunk, content_type='video/mp4')
        response['Content-Length'] = end - start + 1
        response['Content-Range'] = f'bytes {start}-{end}/{file.length}'
        response['Accept-Ranges'] = 'bytes'
        response.status_code = 206 if range_header else 200
        return response

    except Exception as e:
        print("Error serving video:", str(e))
        return HttpResponseNotFound('Video not found')

#STUDENTS ENROLL IN A COURSE
from bson import ObjectId

@csrf_exempt
@jwt_auth
def enroll_course(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            course_id = data.get('course_id')

            if not course_id:
                return JsonResponse({'error': 'Course ID is required'}, status=400)

            # Convert to ObjectId
            course = Course.objects.get(id=ObjectId(course_id))

            # Prevent duplicate enrollments
            if Enrollment.objects(course=course, student=request.user).first():
                return JsonResponse({'error': 'Already enrolled'}, status=400)

            Enrollment(course=course, student=request.user).save()
            return JsonResponse({'message': 'Enrolled successfully'})

        except Course.DoesNotExist:
            return JsonResponse({'error': 'Course not found'}, status=404)
        except Exception as e:
            print("ERROR IN enroll_course:", str(e))
            return JsonResponse({'error': str(e)}, status=500)

#ALL COURSES ENROLLED BY STUDENT
@csrf_exempt
@jwt_auth
def my_courses(request):
    if request.method == 'GET':
        try:
            user = request.user
            enrollments = Enrollment.objects(student=user).order_by('-enrolled_at')
            print(f"Enrollments for {user.username}: {enrollments}")
            course_list = []

            for enrollment in enrollments:
                try:
                    course = enrollment.course
                    enrolled_at = getattr(enrollment, 'enrolled_at', None)

                    # Map video_id → progress from Enrollment
                    video_progress_map = {
                        vp.video_id: vp.progress for vp in enrollment.video_progress
                    }

                    # Build full video list with progress
                    video_list = []
                    for video in course.videos:
                        video_dict = video.to_mongo().to_dict()
                        youtube_id = extract_youtube_id(video.youtube_link)
                        video_dict['video_id'] = youtube_id
                        video_dict['progress'] = video_progress_map.get(youtube_id, 0)
                        video_list.append(video_dict)

                    # First video preview
                    first_video = course.videos[0] if course.videos else None
                    youtube_link = first_video.youtube_link if first_video else None
                    video_url = (
                        f"http://localhost:8000/serve_video/{first_video.video_id}"
                        if first_video and hasattr(first_video, 'video_id') else None
                    )

                    course_list.append({
                        'id': str(course.id),
                        'title': course.title,
                        'description': course.description,
                        'created_by': course.created_by.username,
                        'created_at': course.created_at.strftime('%Y-%m-%d'),
                        'youtube_link': youtube_link,
                        'video_url': video_url,
                        'videos': video_list,  # now includes progress
                        'enrolled_at': enrolled_at.strftime('%Y-%m-%d') if enrolled_at else "N/A",
                        'progress': enrollment.progress,
                        'is_completed': enrollment.is_completed
                    })

                except Exception as inner_e:
                    print(f"Skipping broken enrollment: {inner_e}")
                    continue

            return JsonResponse({'courses': course_list})

        except Exception as e:
            print("ERROR IN my_courses:", str(e))
            return JsonResponse({'error': str(e)}, status=500)


#ONLY TEACHER CAN UPLOAD ASSIGNMENTS FOR COURSES      
@csrf_exempt
@jwt_auth
def upload_assignment(request):
    if request.method == 'POST':
        if request.user.role != 'teacher':
            return JsonResponse({'error': 'Only teachers can upload assignments'}, status=403)

        data = json.loads(request.body)
        title = data.get('title')
        description = data.get('description', '')
        course_id = data.get('course_id')

        try:
            course = Course.objects.get(id=course_id)
            assignment = Assignment(
                title=title,
                description=description,
                course=course,
                created_by=request.user
            )
            assignment.save()
            return JsonResponse({'message': 'Assignment uploaded successfully'})
        except Course.DoesNotExist:
            return JsonResponse({'error': 'Course not found'}, status=404)

#STUDENT & TEACHER CAN SEE LIST OF ASSIGNMENTS      
@csrf_exempt
@jwt_auth
def list_assignments(request):
    if request.method == 'GET':
        course_id = request.GET.get('course_id')

        try:
            course = Course.objects.get(id=course_id)
            assignments = Assignment.objects(course=course)

            data = []
            for a in assignments:
                data.append({
                    'id': str(a.id),
                    'title': a.title,
                    'description': a.description,
                    'created_by': a.created_by.username,
                    'created_at': a.created_at.strftime('%Y-%m-%d %H:%M')
                })

            return JsonResponse({'assignments': data})
        except Course.DoesNotExist:
            return JsonResponse({'error': 'Course not found'}, status=404)


#STUDENTS CAN SUBMIT ASSIGNMENTS ONLY ONCE     
@csrf_exempt
@jwt_auth
def submit_assignment(request):
    if request.method == 'POST':
        if request.user.role != 'student':
            return JsonResponse({'error': 'Only students can submit assignments'}, status=403)

        data = json.loads(request.body)
        assignment_id = data.get('assignment_id')
        content = data.get('content')

        try:
            assignment = Assignment.objects.get(id=assignment_id)
            existing = Submission.objects(assignment=assignment, student=request.user).first()
            if existing:
                return JsonResponse({'message': 'Already submitted'}, status=400)

            submission = Submission(
                assignment=assignment,
                student=request.user,
                content=content
            )
            submission.save()
            return JsonResponse({'message': 'Submission successful'})
        except Assignment.DoesNotExist:
            return JsonResponse({'error': 'Assignment not found'}, status=404)

#ONLY TEACHER CAN VIEW ALL SUBMISSIONS
@csrf_exempt
@jwt_auth
def view_submissions(request):
    if request.method == 'GET':
        if request.user.role != 'teacher':
            return JsonResponse({'error': 'Only teachers can view submissions'}, status=403)

        assignment_id = request.GET.get('assignment_id')

        try:
            assignment = Assignment.objects.get(id=assignment_id)
            submissions = Submission.objects(assignment=assignment)
            result = []
            for sub in submissions:
                result.append({
                    'student': sub.student.username,
                    'content': sub.content,
                    'submitted_at': sub.submitted_at.strftime('%Y-%m-%d %H:%M')
                })
            return JsonResponse({'submissions': result})
        except Assignment.DoesNotExist:
            return JsonResponse({'error': 'Assignment not found'}, status=404)


@csrf_exempt
@jwt_auth
def admin_dashboard(request):
    if request.method == 'GET':
        if request.user.role != 'admin':
            return JsonResponse({'error': 'Unauthorized'}, status=403)

        # Total users (excluding admins)
        users = User.objects(role__ne='admin')
        total_users = users.count()

        # Total courses
        courses = Course.objects()
        total_courses = courses.count()

        # Get enrollments for each course
        course_data = []
        top_course = None
        max_enrollments = 0

        for course in courses:
            enroll_count = Enrollment.objects(course=course).count()

            if enroll_count > max_enrollments:
                max_enrollments = enroll_count
                top_course = course

            course_data.append({
                'id': str(course.id),
                'title': course.title,
                'description': course.description,
                'created_by': course.created_by.username,
                'created_at': course.created_at.strftime('%Y-%m-%d %H:%M'),
                'enrollments': enroll_count
            })

        # Prepare top course
        top_course_data = {
            'title': top_course.title,
            'enrollments': max_enrollments,
            'created_by': top_course.created_by.username
        } if top_course else {}

        return JsonResponse({
            'total_users': total_users,
            'total_courses': total_courses,
            'users': [
                {
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                } for user in users
            ],
            'courses': course_data,
            'top_course': top_course_data
        })

@csrf_exempt
@jwt_auth
def update_video_progress(request):
    if request.method == 'POST':
        print("Update progress called ✅")
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    try:
        data = json.loads(request.body)
        course_id = data.get('course_id')
        video_id = data.get('video_id')  # this is actually the string stored in video.video_id
        progress = data.get('progress')

        if not course_id or not video_id:
            return JsonResponse({'error': 'course_id and video_id are required'}, status=400)

        # Get the student's enrollment for that course
        enrollment = Enrollment.objects.get(student=request.user, course=course_id)

        # Find the video in the course
        course = Course.objects.get(id=course_id)
        found_video = None
        for video in course.videos:
            if video.video_id == video_id:
                found_video = video
                break

        if not found_video:
            return JsonResponse({'error': 'Video not found in course'}, status=404)

        # Check if video progress already exists
        existing = None
        for vp in enrollment.video_progress:
            if vp.video_id == video_id:
                existing = vp
                break

        if existing:
            existing.progress = max(existing.progress, progress)  # only update if it's higher
        else:
            enrollment.video_progress.append(VideoProgress(video_id=video_id, progress=progress))

        # Update overall course progress
        total = len(course.videos)
        completed = sum([vp.progress for vp in enrollment.video_progress])
        enrollment.progress = round(completed / total, 2)

        # Check for completion
        if enrollment.progress >= 95:
            enrollment.is_completed = True

        enrollment.save()
        return JsonResponse({'message': 'Progress updated'})

    except Enrollment.DoesNotExist:
        return JsonResponse({'error': 'Enrollment not found'}, status=404)
    except Exception as e:
        print("ERROR IN update_video_progress:", str(e))
        return JsonResponse({'error': str(e)}, status=500)
