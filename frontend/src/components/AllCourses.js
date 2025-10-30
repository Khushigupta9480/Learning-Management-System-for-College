// src/components/AllCourses.js
import React from 'react';

const AllCourses = ({ availableCourses, handleEnroll, renderYouTube }) => {
  return (
    <div>
      <h3>🌐 All Available Courses</h3>
      {availableCourses.length === 0 ? (
        <p>No available courses at the moment.</p>
      ) : (
        <div className="course-grid">
          {availableCourses.map(course => (
            <div className="course-card" key={course.id}>
              <strong>{course.title}</strong><br />
              <small>{course.description}</small><br />
              <em>Instructor: {course.created_by}</em><br />
              <em>Uploaded: {course.created_at}</em><br />
              <strong>Total Enrollments: {course.enrollments}</strong><br />

              <div style={{ marginTop: '1rem' }}>
                {course.youtube_link
                  ? renderYouTube(course, false)
                  : course.video_url
                    ? (
                      <video width="100%" height="200" controls>
                        <source src={course.video_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )
                    : <p>No video available</p>}
              </div>

              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllCourses;
