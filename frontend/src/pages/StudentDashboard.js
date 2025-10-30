import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import YouTube from 'react-youtube';
import './Dashboard.css';
import { FaUserCircle } from 'react-icons/fa';

// ... all your imports remain unchanged ...

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [user, setUser] = useState({ username: '', email: '' });
  const [availableCourses, setAvailableCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [viewCourse, setViewCourse] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');
  const progressIntervals = useRef({});

  useEffect(() => {
    decodeToken();
    fetchCourses();
    fetchMyCourses();
  }, []);

  const decodeToken = () => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ username: payload.username, email: payload.email });
    } catch (err) {
      console.error('Invalid token');
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get('http://localhost:8000/courses/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableCourses(res.data.courses);
    } catch (err) {
      setError('Failed to load courses');
    }
  };

  const fetchMyCourses = async () => {
    try {
      const res = await axios.get('http://localhost:8000/my-courses/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyCourses(res.data.courses || []);

      // Update open viewCourse with fresh data
      if (viewCourse) {
        const updated = res.data.courses.find(c => c.id === viewCourse.id);
        if (updated) setViewCourse(updated);
      }
    } catch (err) {
      setError('Failed to load your enrolled courses');
    }
  };


  const handleEnroll = async (courseId) => {
    try {
      const res = await axios.post('http://localhost:8000/enroll/', { course_id: courseId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(res.data.message);
      setError('');
      fetchMyCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Enrollment failed');
    }
  };

  const trackVideoProgress = (courseId, videoId, player) => {
    // Clear previous interval for this video
    clearInterval(progressIntervals.current[videoId]);

    const intervalId = setInterval(() => {
      let currentTime = 0;
      let duration = 0;

      try {
        if (player && typeof player.getCurrentTime === 'function') {
          currentTime = player.getCurrentTime();
          duration = player.getDuration();
        }
      } catch (err) {
        console.warn('Player API error:', err);
      }

      if (duration > 0) {
        const progress = Math.floor((currentTime / duration) * 100);

        axios.post('http://localhost:8000/update-video-progress/', {
          course_id: courseId,
          video_id: videoId,
          progress
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(() => {
            // Refresh the user's course progress in frontend
            fetchMyCourses();
          })
          .catch((err) => {
            console.error("Progress update failed", err);
          });

        if (progress >= 100) {
          clearInterval(intervalId);
        }
      }
    }, 10000); // Every 10 seconds

    progressIntervals.current[videoId] = intervalId;
  };

  const renderAllVideo = (video, courseId) => {
    const ytVideoId = getYouTubeVideoId(video.youtube_link);


    if (ytVideoId) {
      return (
        <div>
          <YouTube
            videoId={ytVideoId}
            opts={{ width: '100%', height: '200', playerVars: { enablejsapi: 1 } }}

          />
        </div>
      );
    } else if (video.video_url) {
      return (
        <div>
          <video
            width="100%"
            height="200"
            controls

          >
            <source src={video.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

        </div>
      );
    } else {
      return <p>No video available</p>;
    }
  };


  const renderVideo = (video, courseId, isTracking = false) => {
    const ytVideoId = getYouTubeVideoId(video.youtube_link);
    const progress = video.progress || 0;

    if (ytVideoId) {
      return (
        <div>
          <YouTube
            videoId={ytVideoId}
            opts={{ width: '100%', height: '200', playerVars: { enablejsapi: 1 } }}
            onStateChange={
              isTracking
                ? (e) => {
                  if (e.data === window.YT.PlayerState.PLAYING) {
                    trackVideoProgress(courseId, video.video_id, e.target);
                  }
                }
                : null
            }
          />
          <p><strong>Progress:</strong><strong style={{color:'red'}}> {progress}%</strong> </p>
        </div>
      );
    } else if (video.video_url) {
      return (
        <div>
          <video
            width="100%"
            height="200"
            controls
            onPlay={() => {
              if (isTracking) trackVideoProgress(courseId, video.video_id, null);
            }}
          >
            <source src={video.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <p><strong>Progress:</strong> {progress}%</p>
        </div>
      );
    } else {
      return <p>No video available</p>;
    }
  };



  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };



  const renderFirstYouTubeEmbed = (youtubeLink) => {
    const videoId = getYouTubeVideoId(youtubeLink);
    if (!videoId) return <p>Invalid YouTube link</p>;

    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;

    return (
      <iframe
        width="100%"
        height="200"
        src={embedUrl}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube Preview"
      ></iframe>
    );
  };

  const renderAllCourseDetails = (course) => {
    return (
      <div>
        <button style={{ marginTop: '1rem' }} onClick={() => setViewCourse(null)}>← Back</button>
        <h3>{course.title}</h3>
        <p><strong>Description:</strong> {course.description}</p>
        <p><strong>Instructor:</strong> {course.instructor || course.created_by}</p>
        <h4>📺 Videos</h4>
        {course.videos && course.videos.length > 0 ? (
          <div className="course-grid">
            {course.videos.map((video, idx) => (
              <div key={idx} className="course-card">
                <h4>{idx + 1}. {video.title}</h4>
                <p>{video.description}</p>
                {renderAllVideo(video, course.id)}
              </div>
            ))}
          </div>
        ) : (
          <p>No videos found in this course</p>
        )}

      </div>
    );
  };

  const calculateCourseProgress = (videos = []) => {
    if (!videos.length) return 0;
    const totalProgress = videos.reduce((sum, v) => sum + (v.progress || 0), 0);
    return Math.floor(totalProgress / videos.length);
  };

  const renderCourseDetails = (course, isTracking = false) => {
    const overallProgress = calculateCourseProgress(course.videos);
    return (
      <div>
        <button style={{ marginTop: '1rem' }} onClick={() => setViewCourse(null)}>← Back</button>
        <h3>{course.title}</h3>
        <p><strong>Description:</strong> {course.description}</p>
        <p><strong>Instructor:</strong> {course.instructor || course.created_by}</p>
        <p><strong>Overall Progress:</strong><strong style={{ color: 'red' }}> {course.is_completed ? "✅ 100% Completed" : `${overallProgress}%`}</strong></p>
        <h4>📺 Videos</h4>
        {course.videos && course.videos.length > 0 ? (
          <div className="course-grid">
            {course.videos.map((video, idx) => (
              <div key={idx} className="course-card">
                <h4>{idx + 1}. {video.title}</h4>
                <p>{video.description}</p>
                {renderVideo(video, course.id, isTracking)}
              </div>
            ))}
          </div>
        ) : (
          <p>No videos found in this course</p>
        )}

      </div>
    );
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setViewCourse(null);
    if (tab === 'my') fetchMyCourses();
  };


  return (
    <div className="dashboard">
      <div className="bg_nav" >
      <img src="/clogo-removebg-preview.png" alt="Logo" style={{height:'80px'}}/>
      <h1 style={{padding:'10px'}}>CIMAGE.AI</h1>
      </div>
      <h2>🎓 Student Dashboard</h2>

      <div className="sidebar-layout">
        <aside className="sidebar">
          <div className="profile-icon"><FaUserCircle /></div>
          <div className="user_email">
            <p>Logged in as:</p>
            <hr />
            <strong>{user.username}</strong><br />
            <small>{user.email}</small>
          </div>
          <button onClick={() => handleTabChange('all')} className={activeTab === 'all' ? 'active-tab' : ''}>All Courses</button>
          <button onClick={() => handleTabChange('my')} className={activeTab === 'my' ? 'active-tab' : ''}>My Courses</button>
        </aside>

        <main className="dashboard-content">
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}

          {activeTab === 'all' && !viewCourse && (
            <section>
              <h3>🌐 All Available Courses</h3>
              <div className="course-grid">
                {availableCourses.map(course => (
                  <div className="course-card" key={course.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{course.title}</strong>
                      <button onClick={() => setViewCourse(course)}>View</button>
                    </div><hr />
                    <p>{course.description}</p>
                    <small>Instructor: {course.instructor}</small><br />
                    <em>Uploaded: {course.created_at}</em><br />
                    <strong>Enrollments: {course.enrollments}</strong><br />
                    {course.youtube_link
                      ? renderFirstYouTubeEmbed(course.youtube_link)
                      : course.video_url
                        ? <video width="100%" height="200" controls>
                          <source src={course.video_url} type="video/mp4" />
                        </video>
                        : <p>No video available</p>}
                    <button style={{ marginTop: '0.5rem' }} onClick={() => handleEnroll(course.id)}>Enroll</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'all' && viewCourse && renderAllCourseDetails(viewCourse)}

          {activeTab === 'my' && !viewCourse && (
            <section>
              <h3>📘 My Enrolled Courses</h3>
              <div className="course-grid">
                {myCourses.map(course => (
                  <div className="course-card" key={course.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{course.title}</strong>
                      <button onClick={() => setViewCourse(course)}>View</button>
                    </div><hr />
                    <p>{course.description}</p>
                    <small>Instructor: {course.created_by}</small><br />
                    <em>Uploaded: {course.created_at}</em><br />

                    {course.youtube_link
                      ? renderFirstYouTubeEmbed(course.youtube_link)
                      : course.video_url
                        ? <video width="100%" height="200" controls>
                          <source src={course.video_url} type="video/mp4" />
                        </video>
                        : <p>No video available</p>}
                    <p><strong>Overall Progress:</strong><strong style={{ color: 'red' }}> {course.is_completed ? "✅ 100% Completed" : `${calculateCourseProgress(course.videos)}%`}</strong></p>

                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'my' && viewCourse && renderCourseDetails(viewCourse, true)}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
