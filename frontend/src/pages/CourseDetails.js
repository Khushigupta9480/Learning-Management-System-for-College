// src/pages/CourseDetails.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const CourseDetails = () => {
  const { id } = useParams(); // course ID from URL
  const [course, setCourse] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/course-details/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourse(res.data);
      } catch (err) {
        console.error('Error fetching course:', err);
      }
    };

    fetchCourse();
  }, [id, token]);

  const renderVideo = (video) => {
    if (video.youtube_link) {
      return (
        <iframe
          width="100%"
          height="200"
          src={video.youtube_link}
          frameBorder="0"
          allowFullScreen
          title={video.title}
        />
      );
    } else if (video.video_url) {
      return (
        <video width="100%" height="200" controls>
          <source src={video.video_url} type="video/mp4" />
        </video>
      );
    } else {
      return <p>No video available</p>;
    }
  };

  if (!course) return <p>Loading...</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <h2>{course.title}</h2>
      <p><strong>Description:</strong> {course.description}</p>
      <p><strong>Instructor:</strong> {course.instructor}</p>
      <p><strong>Enrollments:</strong> {course.enrollments}</p>

      <h3>🎥 Course Videos</h3>
      {course.videos.length === 0 ? (
        <p>No videos added yet.</p>
      ) : (
        course.videos.map((video, idx) => (
          <div key={idx} style={{ marginBottom: '2rem' }}>
            <h4>{idx + 1}. {video.title}</h4>
            <p>{video.description}</p>
            {renderVideo(video)}
          </div>
        ))
      )}
    </div>
  );
};

export default CourseDetails;
