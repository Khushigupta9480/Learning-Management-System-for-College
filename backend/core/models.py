
from mongoengine import Document,EmbeddedDocument,EmbeddedDocumentField, EmbeddedDocumentListField, StringField, ReferenceField, DateField,ListField,EmailField,CASCADE,FloatField,BooleanField
import datetime
from bson import ObjectId
from mongoengine import ObjectIdField

class User(Document):
    ROLE_CHOICES = ('student', 'teacher', 'admin')

    username = StringField(required=True, unique=True)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)  # store hashed passwords
    role = StringField(choices=ROLE_CHOICES, default='student')
    enrolled_courses = ListField(ReferenceField('Course'))

class Video(EmbeddedDocument):
    title = StringField(required=True)
    description = StringField()
    youtube_link = StringField(null=True)
    video_id = StringField() 
    uploaded_at = DateField(default=datetime.date.today)

class Course(Document):
    title = StringField(required=True)
    description = StringField()
    created_by = ReferenceField(User, required=True, reverse_delete_rule=CASCADE)
    created_at = DateField(default=datetime.date.today)
    videos = EmbeddedDocumentListField(Video)

    def delete(self, *args, **kwargs):
        # Automatically delete enrollments when course is deleted
        from .models import Enrollment  # or adjust import to avoid circular import
        Enrollment.objects(course=self).delete()
        return super().delete(*args, **kwargs)

class VideoProgress(EmbeddedDocument):
    video_id = StringField(required=True)
    progress = FloatField(default=0.0)

class Enrollment(Document):
    student = ReferenceField(User, reverse_delete_rule=CASCADE)
    course = ReferenceField(Course, reverse_delete_rule=CASCADE)
    enrolled_at = DateField(default=datetime.date.today)
    progress = FloatField(default=0.0)  # percentage completion
    is_completed = BooleanField(default=False)
    video_progress = ListField(EmbeddedDocumentField(VideoProgress)) 

#Done with /register /login /dashboard /upload-course /courses /enroll

class Assignment(Document):
    title = StringField(required=True)
    description = StringField()
    course = ReferenceField(Course, required=True)
    created_by = ReferenceField(User, required=True)
    created_at = DateField(default=datetime.date.today)

class Submission(Document):
    assignment = ReferenceField(Assignment, required=True)
    student = ReferenceField(User, required=True)
    content = StringField()  # this could be a text answer or file link
    submitted_at = DateField(default=datetime.date.today)

#Done with /upload-assignment /list-assignments /submit-assignment /view-submissions

