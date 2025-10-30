import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import AllCourses from '../components/AllCourses';
import './Dashboard.css';
import YouTube from 'react-youtube';
import { FaUserCircle } from 'react-icons/fa';

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [allCourses, setAllCourses] = useState([]);
  const [uploadedCourses, setUploadedCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [message, setMessage] = useState('');
  const [edit_delete_message, setedit_delete_message] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState({ username: '', email: '' });
  const [video, setVideo] = useState(null);
  const [youtubeLink, setYoutubeLink] = useState('');
  const fileInputRef = useRef();
  const [editingCourse, setEditingCourse] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editYoutubeLink, setEditYoutubeLink] = useState('');

  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    youtubeLink: '',
    videoFile: null
  });

  const [addVideoModalCourseId, setAddVideoModalCourseId] = useState(null);

  const [viewCourse, setViewCourse] = useState(null); // to hold selected course

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setViewCourse(null);
  };


  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ username: payload.username, email: payload.email });
      } catch (err) {
        console.error('Error decoding token:', err);
      }
    }
    fetchDashboard();
  }, [token]);

  const formatYouTubeLink = (url) => {
    if (!url) return '';

    try {
      const parsedUrl = new URL(url);

      // Playlist support
      if (parsedUrl.pathname.includes('/playlist')) {
        const listId = parsedUrl.searchParams.get('list');
        if (listId) {
          return `https://www.youtube.com/embed?listType=playlist&list=${listId}&enablejsapi=1`;
        }
      }

      // Normal YouTube video ID extraction
      const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1` : url;
    } catch (e) {
      return url; // return original if malformed
    }
  };


  const fetchDashboard = async () => {
    try {
      const res1 = await axios.get('http://localhost:8000/teacher-dashboard/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUploadedCourses(res1.data.uploaded_courses);

      const res2 = await axios.get('http://localhost:8000/courses/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllCourses(res2.data.courses);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('video_title', videoTitle);
    formData.append('video_description', videoDescription);

    const formattedLink = formatYouTubeLink(youtubeLink);

    if (video) {
      formData.append('video', video);
    } else if (formattedLink) {
      formData.append('youtube_link', formattedLink);
    }

    try {
      const res = await axios.post('http://localhost:8000/upload-course/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage(res.data.message);
      setError('');
      setTitle('');
      setDescription('');
      setVideoTitle('');
      setVideoDescription('');
      setVideo(null);
      setYoutubeLink('');
      fileInputRef.current.value = null;
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      setMessage('');
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('video_title', newVideo.title);
    formData.append('video_description', newVideo.description);

    if (newVideo.videoFile) {
      formData.append('video', newVideo.videoFile);
    } else if (newVideo.youtubeLink) {
      formData.append('youtube_link', formatYouTubeLink(newVideo.youtubeLink));
    }

    try {
      await axios.post(`http://localhost:8000/add-video-to-playlist/${addVideoModalCourseId}/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert("✅ New video added to playlist!");
      setNewVideo({ title: '', description: '', youtubeLink: '', videoFile: null });
      fetchDashboard();
    } catch (err) {
      alert("❌ Failed to add video");
      console.error(err);
    }
  };


  const handleDelete = async (courseId) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await axios.delete(`http://localhost:8000/delete-course/${courseId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setedit_delete_message("Course deleted successfully");
        alert("Course deleted successfully");
        fetchDashboard();
      } catch (err) {
        setError("Error deleting course");
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const formattedEditLink = formatYouTubeLink(editYoutubeLink);

    const payload = {
      title: editTitle,
      description: editDescription,
      youtube_link: formattedEditLink
    };

    try {
      await axios.put(`http://localhost:8000/edit-course/${editingCourse}/`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setedit_delete_message("Course updated successfully");
      alert("Course Updated Successfully");
      setEditingCourse(null);
      fetchDashboard();
    } catch (err) {
      setError("Error updating course");
    }
  };

  const renderVideo = (course) => {
    if (course.youtube_link) {
      return (
        <iframe
          width="100%"
          height="200"
          src={course.youtube_link}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
          style={{ marginTop: '1rem' }}
        ></iframe>
      );
    } else if (course.video_url) {
      return (
        <video width="100%" height="200" controls poster="/static/video-placeholder.png">
          <source src={course.video_url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    } else {
      return <p>No video available</p>;
    }
  };

  const renderCourseDetails = (course) => (
  <div>
    <h3>{course.title}</h3>
    <p><strong>Description:</strong> {course.description}</p>
    <p><strong>Instructor:</strong> {course.instructor}</p>
    <p><strong>Enrollments:</strong> {course.enrollments}</p>
    <h3>📺 Course Videos</h3>
    {!course.videos || course.videos.length === 0 ? (
      <p>No videos in this course.</p>
    ) : (
      <div className="course-grid">
        {course.videos.map((video, idx) => (
          <div className="course-card" key={idx}>
            <h4>{idx + 1}. {video.title}</h4>
            <p>{video.description}</p>
            {renderVideo(video)}
          </div>
        ))}
      </div>
    )}
    <button style={{ marginTop: '1rem' }} onClick={() => setViewCourse(null)}>← Back</button>
  </div>
);




  return (
    <div className="dashboard">
      <div className="bg_nav" >
      <img src="/clogo-removebg-preview.png" alt="Logo" style={{height:'80px'}}/>
      <h1 style={{padding:'10px'}}>CIMAGE.AI</h1>
      </div>
      <h2>👩‍🏫 Teacher Dashboard</h2>

      <div className="sidebar-layout">
        <aside className="sidebar">
          <div className="profile-icon">
            <FaUserCircle />
          </div>
          {user.username && (
            <div className="user_email" style={{ fontStyle: 'italic' }}>
              <p>Logged in as:</p>
              <hr />
              <strong>{user.username}</strong><br />
              <strong>{user.email}</strong>
            </div>
          )}
          <button
            onClick={() => handleTabChange('all')}
            className={activeTab === 'all' ? 'active-tab' : ''}
          >
            All Courses
          </button>

          <button
            onClick={() => handleTabChange('uploaded')}
            className={activeTab === 'uploaded' ? 'active-tab' : ''}
          >
            My Courses
          </button>

          <button
            onClick={() => handleTabChange('upload')}
            className={activeTab === 'upload' ? 'active-tab' : ''}
          >
            Upload a Course
          </button>

        </aside>

        <main className="dashboard-content">
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}

          {activeTab === 'all' && !viewCourse && (
            <section>
              <h3>🌐 All Available Courses</h3>
              {allCourses.length === 0 ? (
                <p>No available courses at the moment.</p>
              ) : (
                <div className="course-grid">
                  {allCourses.map(course => (
                    <div className="course-card" key={course.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ alignSelf: 'center', fontSize: '20px' }}>{course.title}</strong><br />
                        <button
                          onClick={() => setViewCourse(course)}

                        >
                          View
                        </button></div><hr />
                      <small>{course.description}</small><br />
                      <em>Instructor: {course.instructor}</em><br />
                      <em>Uploaded: {course.created_at}</em><br />
                      <strong>Total Enrollments: {course.enrollments}</strong><br />
                      <div style={{ marginTop: '1rem' }}>
                        {course.youtube_link
                          ? renderVideo(course, false)
                          : course.video_url
                            ? <video width="100%" height="200" controls><source src={course.video_url} type="video/mp4" /></video>
                            : <p>No video available</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'all' && viewCourse && renderCourseDetails(viewCourse)}


          {activeTab === 'uploaded' && !viewCourse && (
            <section>
              <h3>🎓 My Uploaded Courses</h3>
              {edit_delete_message && <div className="success">{edit_delete_message}</div>}
              {uploadedCourses.length === 0 ? (
                <p>No uploaded courses yet.</p>
              ) : (
                <div className="course-grid">
                  {uploadedCourses.map(course => (
                    <div className="course-card" key={course.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ alignSelf: 'center', fontSize: '20px' }}>{course.title}</strong><br />
                        <button
                          onClick={() => setViewCourse(course)}

                        >
                          View
                        </button></div><hr />
                      <small>{course.description}</small><br />
                      <strong> Uploaded:</strong> <em>{course.created_at}</em><br />
                      <strong>Total Enrollments: {course.enrollments}</strong><br />
                      {renderVideo(course)}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setEditingCourse(course.id);
                            setEditTitle(course.title);
                            setEditDescription(course.description);
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => {

                            setAddVideoModalCourseId(course.id);
                          }}
                          style={{ backgroundColor: '#4caf50', color: 'white' }}
                        >
                          Add New Video
                        </button>

                        <button
                          onClick={() => handleDelete(course.id)}
                          style={{ backgroundColor: 'red', color: 'white' }}
                        >
                          Delete
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {/* EDIT COURSE MODAL */}
              {editingCourse && (
                <div className="modal-overlay">
                  <div className="modal-card">
                    <button className="close-btn" onClick={() => setEditingCourse(null)}>✕</button>
                    <h3>Edit Course</h3>
                    <form onSubmit={handleEditSubmit}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        required
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                        required
                      />
                      <button type="submit" style={{ marginTop: '1rem' }}>Update</button>
                      <button
                        type="button" className="cancel"
                        style={{ marginTop: '1rem', marginLeft: '10px' }}
                        onClick={() => setEditingCourse(null)}
                      >
                        Cancel
                      </button>

                    </form>
                  </div>
                </div>
              )}

              {/* ADD NEW VIDEO MODAL */}
              {addVideoModalCourseId && (
                <div className="modal-overlay">
                  <div className="modal-card">
                    <button className="close-btn" onClick={() => setAddVideoModalCourseId(null)}>✕</button>
                    <h3>➕ Add New Video to Playlist</h3>
                    <form onSubmit={handleAddVideo}>
                      <input
                        type="text"
                        placeholder="Video Title"
                        value={newVideo.title}
                        onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                        required
                      />
                      <textarea
                        placeholder="Video Description"
                        value={newVideo.description}
                        onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                        required
                      />
                      <label>Upload Video:</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setNewVideo({ ...newVideo, videoFile: e.target.files[0], youtubeLink: '' })}
                      />
                      <label>Or paste YouTube Link:</label>
                      <input
                        type="text"
                        placeholder="https://youtu.be/..."
                        value={newVideo.youtubeLink}
                        onChange={(e) => setNewVideo({ ...newVideo, youtubeLink: e.target.value, videoFile: null })}
                      />
                      <button type="submit" style={{ marginTop: '1rem' }}>Add Video</button>
                      <button
                        type="button" className="cancel"
                        style={{ marginTop: '1rem', marginLeft: '10px' }}
                        onClick={() => setAddVideoModalCourseId(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                </div>
              )}


            </section>
          )}

          {activeTab === 'uploaded' && viewCourse && renderCourseDetails(viewCourse)}


          {activeTab === 'upload' && (
            <section className="upload-form-wrapper">
              <h3>📚 Upload Course Playlist</h3>
              <form onSubmit={handleUpload}>
                <input
                  type="text"
                  placeholder="Playlist Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Playlist Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Video Title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Video Description"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                />
                <label>Upload Video:</label>
                <input
                  type="file"
                  accept="video/*"
                  ref={fileInputRef}
                  onChange={(e) => setVideo(e.target.files[0])}
                />
                <label>Or paste YouTube Link:</label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/@cimagepatna/videos"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                />
                <button type="submit">Create Playlist</button>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
