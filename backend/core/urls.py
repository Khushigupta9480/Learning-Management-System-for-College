from django.urls import path
from core.views import *

urlpatterns = [
    path('register/', register),
    path('send-magic-link/', send_magic_link),
    path('verify-token/', verify_token),
    path('login-password/', login_with_password),
    path('dashboard/', dashboard),
    path('upload-course/', upload_course),
    path('edit-course/<str:course_id>/', edit_course),
    path('delete-course/<str:course_id>/', delete_course),
    path('teacher-dashboard/', teacher_dashboard),
    path('add-video-to-playlist/<str:course_id>/', add_video_to_playlist),
    path('courses/', get_courses),
    path('enroll/', enroll_course),
    path('my-courses/', my_courses),
    path('upload-assignment/', upload_assignment),
    path('list-assignments/', list_assignments),
    path('submit-assignment/', submit_assignment),
    path('view-submissions/', view_submissions),
    path('admin-dashboard/', admin_dashboard),
    path('serve_video/<str:video_id>', serve_video, name='serve_video'),
    
    path('update-video-progress/', update_video_progress, name='update_video_progress'),

]
