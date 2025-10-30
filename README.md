
<body>

  <h1>🎓 CIMAGE.AI — Learning Management System (LMS)</h1>

  <p>
    A complete full-stack LMS platform built with <strong>Django (MongoDB)</strong> in the backend and <strong>React.js</strong> in the frontend.
    This system is built for educational institutions, teachers, and students to manage and participate in online courses.
  </p>

  <div class="section">
    <h2>🚀 Features</h2>
    <ul>
      <li>Teachers can upload courses with multiple videos (YouTube or self-uploaded).</li>
      <li>Students can enroll in courses and track progress.</li>
      <li>Video-wise and course-wise progress tracking using YouTube API.</li>
      <li>Assignment upload and submission system for teachers and students.</li>
      <li>JWT authentication with password and magic-link support.</li>
      <li>Admin dashboard for user and course management.</li>
    </ul>
  </div>

  <div class="section">
    <h2>⚙️ Backend Setup (Django + MongoDB)</h2>

    <h3>📦 Requirements</h3>
    <ul>
      <li>Python 3.8+</li>
      <li>pip</li>
      <li>MongoDB installed and running locally (localhost:27017)</li>
      <li>Virtual Environment (optional but recommended)</li>
    </ul>

    <h3>📁 Step-by-Step Setup</h3>

    <pre><code># Clone the repository
git clone &lt;https://github.com/Khushigupta9480/LMS-Platform-for-College/&gt;
cd backend/

# Create virtual environment
python -m venv env
env\Scripts\activate    # For Windows
# OR
source env/bin/activate # For macOS/Linux

# Install dependencies
pip install -r requirements.txt
    </code></pre>

    <h3>🛢️ MongoDB Connection</h3>
    <p>
      MongoDB must be running locally. Configure it inside <code>settings.py</code>:
    </p>
    <pre><code>connect(db='lms', host='localhost', port=27017)</code></pre>

    <h3>▶️ Run the backend</h3>
    <pre><code>python manage.py runserver</code></pre>
    <p>Backend is now running at <strong>http://localhost:8000/</strong></p>
  </div>

  <div class="section">
    <h2>🌐 Frontend Setup (React)</h2>

    <h3>📁 Navigate to frontend</h3>
    <pre><code>cd frontend/</code></pre>

    <h3>📦 Install dependencies</h3>
    <pre><code>npm install</code></pre>

    <h3>▶️ Start the React App</h3>
    <pre><code>npm start</code></pre>
    <p>Frontend will run at <strong>http://localhost:3000/</strong></p>
  </div>

  <div class="section">
    <h2>🧪 Running the App</h2>
    <ul>
      <li>✅ Start MongoDB:
        <pre><code>mongod</code></pre>
      </li>
      <li>✅ Run Django backend:
        <pre><code>cd backend/
python manage.py runserver</code></pre>
      </li>
      <li>✅ Run React frontend:
        <pre><code>cd frontend/
npm start</code></pre>
      </li>
    </ul>
  </div>

  <div class="section">
    <h2>📁 Folder Structure</h2>
    <pre><code>project-root/
├── backend/
│   ├── core/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
    </code></pre>
  </div>

  <div class="section">
    <h2>📌 Technologies Used</h2>
    <ul>
      <li><strong>Frontend:</strong> React, HTML, CSS, Axios, React Router</li>
      <li><strong>Backend:</strong> Django, MongoEngine, JWT, GridFS</li>
      <li><strong>Database:</strong> MongoDB</li>
      <li><strong>Video Handling:</strong> YouTube IFrame API + GridFS for local uploads</li>
    </ul>
  </div>

  <div class="section">
    <h2>✉️ Contact</h2>
    <p>
      Developed by <strong>Khushi Gupta</strong><br />
      Contact for questions, issues, or contributions.
    </p>
  </div>

  <div class="section">
    <h2>📜 License</h2>
    <p>This project is licensed under the MIT License.</p>
  </div>

</body>
</html>

