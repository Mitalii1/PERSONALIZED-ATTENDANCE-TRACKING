# PERSONALIZED-ATTENDANCE-TRACKING

AI-Powered Personalized Attendance Tracking and Alert System for Students

## 📋 Overview

A comprehensive web-based attendance tracking system that uses artificial intelligence to extract timetables from images and monitor student attendance with real-time alerts and statistical analysis.

**Key Features:**

- 🎓 AI-powered timetable extraction from college timetable images
- 📱 Batch-aware subject detection (S1-S6, A1-A2, B1-B2)
- 📅 Weekly timetable display with subject types (Theory/Practical)
- ✅ Easy attendance marking with daily updates
- 📊 Real-time attendance statistics per subject
- 💾 Database-backed persistent storage
- 🔧 RESTful API architecture
- 🚀 Responsive React frontend

---

## 🏗️ Tech Stack

### Frontend

- **React 18** with Hooks (useState, useEffect, useMemo)
- **CSS3** with responsive design
- **localStorage** for user preferences (optional)

### Backend

- **Python 3.x** with Flask framework
- **Groq API** with Llama 4-Scout model for AI vision
- **MySQL** database for persistent storage
- **CORS** enabled for frontend integration

### AI & Vision

- **Groq Vision API** (meta-llama/llama-4-scout-17b-16e-instruct)
- Markdown + JSON response parsing
- Batch-specific subject extraction

---

## 📁 Project Structure

```
PERSONALIZED-ATTENDANCE-TRACKING/
├── backend/
│   ├── app.py                 # Flask API server
│   ├── timetable_ai.py        # Groq AI integration for OCR
│   ├── db.py                  # Database connection utilities
│   ├── attendance.py          # Attendance logic
│   ├── attendance_db.sql      # Database schema
│   └── requirements.txt       # Python dependencies
├── forntend/
│   ├── src/
│   │   ├── Components/
│   │   │   ├── Dashboard.js       # Main dashboard & attendance UI
│   │   │   ├── Dashboard.css      # Dashboard styling
│   │   │   ├── Timetable.js       # Timetable upload & batch selection
│   │   │   ├── Timetable.css      # Timetable styling
│   │   │   ├── SubjectMapper.js   # Subject confirmation interface
│   │   │   ├── Getstarted.js      # Onboarding component
│   │   │   └── *.css              # Component-specific styles
│   │   ├── App.js             # Main app component
│   │   ├── index.js           # React entry point
│   │   └── index.css          # Global styles
│   ├── public/                # Static assets
│   └── package.json           # Node dependencies
├── INTEGRATION_GUIDE.md       # Detailed workflow documentation
├── Frontend.md                # Frontend setup instructions
├── README.md                  # This file
└── LICENSE

```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 14+ (for Frontend)
- Python 3.8+ (for Backend)
- MySQL 5.7+ (for Database)
- Groq API Key (for AI features)

### Backend Setup

1. **Navigate to backend folder:**

   ```bash
   cd backend
   ```

2. **Create Python virtual environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**

   ```bash
   pip install flask flask-cors groq python-dotenv mysql-connector-python
   ```

4. **Setup database:**

   ```bash
   mysql -u root -p < attendance_db.sql
   ```

5. **Configure environment variables:**
   Create `.env` file in backend folder:

   ```
   GROQ_API_KEY=your_groq_api_key_here
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DB=attendance_db
   ```

6. **Run Flask server:**
   ```bash
   python app.py
   ```
   Server runs on `http://127.0.0.1:5000`

### Frontend Setup

1. **Navigate to frontend folder:**

   ```bash
   cd forntend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure backend URL** (optional):
   Create `.env` file in forntend folder:

   ```
   REACT_APP_BACKEND_URL=http://localhost:5000
   ```

4. **Start development server:**
   ```bash
   npm start
   ```
   App opens on `http://localhost:3000`

---

## 📊 Complete Workflow

### 1. **Signup & Login**

- User creates account with email and password
- Authentication endpoints: `/signup`, `/login`

### 2. **Upload Timetable Image**

- User navigates to Timetable upload section
- Selects their batch (S1, S2, S3, S4, S5, S6, A1, A2, B1, B2)
- Uploads timetable image (PNG/JPG format)
- Frontend sends to **`/api/timetable/extract`** endpoint

### 3. **AI Extracts Subjects**

- **timetable_ai.py** receives image + batch info
- Groq Vision API analyzes image:
  - Extracts subject abbreviations (ADASL, PROGG, DCCN, etc.)
  - Identifies full subject names
  - Classifies as Theory or Practical
  - Builds 5-day weekly schedule
- Returns JSON with `abbreviations`, `schedule`, and `raw_text`

**AI Response Format:**

```json
{
  "abbreviations": [
    {"short": "ADASL", "full": "Advanced Data Structures", "type": "Theory"},
    {"short": "CNL", "full": "Computer Networks Lab", "type": "Practical"}
  ],
  "schedule": {
    "Monday": ["ADASL", "PROGG", "CNL"],
    "Tuesday": ["ADASL", "DCCN", "PROGG"],
    ...
  },
  "raw_text": "Extracted text from image"
}
```

### 4. **User Confirms/Edits Subjects**

- **SubjectMapper.js** displays extracted subjects
- User can:
  - ✏️ Edit subject names and types
  - ➕ Add missing subjects
  - ❌ Delete incorrect entries
  - 💾 Confirms final list

### 5. **Save to Database**

- SubjectMapper sends confirmed subjects to **`/api/timetable/save-subjects`**
- Backend stores in database:
  - **subjects table**: subject_name, type, total_classes, attended_classes
  - **timetable_schedule table**: subject assignments for each day/slot

### 6. **Display on Dashboard**

- Dashboard.js fetches from **`/api/timetable/week-details/<user_id>`**
- Displays subjects organized by:
  - **Days**: Monday through Friday
  - **Time Slots**: s1 (8:15-10:15), s2 (10:30-11:30), s3 (11:30-12:30), a1 (1:15-2:15), a2 (2:15-3:15)
  - **Subject Info**: Name + Type badge (THEORY/PRACTICAL)

### 7. **Mark Attendance**

- User checks boxes for attended classes (current day only)
- Clicks "Save Today's Attendance"
- Frontend sends to **`/api/attendance/mark`** with:
  - user_id, subject_id, slot_key, status
- Backend updates:
  - **attendance table**: records daily attendance
  - **subjects table**: increments total_classes and attended_classes counters

### 8. **View Attendance Summary**

- Dashboard fetches from **`/api/attendance/summary/<user_id>`**
- Displays per-subject statistics:
  - Total classes
  - Attended classes
  - Attendance percentage
  - Subject type (Theory/Practical)

---

## 🔌 API Endpoints

### Timetable Extraction & Management

| Endpoint                                | Method | Purpose                | Request                           | Response                                                      |
| --------------------------------------- | ------ | ---------------------- | --------------------------------- | ------------------------------------------------------------- |
| `/api/timetable/extract`                | POST   | AI extraction          | FormData: image, batch            | JSON: abbreviations, schedule                                 |
| `/api/timetable/save-subjects`          | POST   | Save to DB             | JSON: user_id, subjects, schedule | success, saved_subjects_count                                 |
| `/api/timetable/week/<user_id>`         | GET    | Get simple timetable   | -                                 | JSON: week array with subject names                           |
| `/api/timetable/week-details/<user_id>` | GET    | Get detailed timetable | -                                 | JSON: week array with subject objects (name, type, time_slot) |

### Attendance Management

| Endpoint                            | Method | Purpose              | Request                  | Response                                          |
| ----------------------------------- | ------ | -------------------- | ------------------------ | ------------------------------------------------- |
| `/api/attendance/mark`              | POST   | Mark attendance      | JSON: user_id, records[] | success, message                                  |
| `/api/attendance/today/<user_id>`   | GET    | Get today's schedule | -                        | JSON: today's subjects                            |
| `/api/attendance/summary/<user_id>` | GET    | Attendance stats     | -                        | JSON: summary array (subject, attended, total, %) |

### Authentication

| Endpoint  | Method | Purpose        | Request               | Response         |
| --------- | ------ | -------------- | --------------------- | ---------------- |
| `/signup` | POST   | Create account | JSON: email, password | message, success |
| `/login`  | POST   | Login user     | JSON: email, password | message, success |

---

## 🤖 AI Features

### Groq Vision Integration

- **Model**: meta-llama/llama-4-scout-17b-16e-instruct
- **Task**: College timetable OCR and subject extraction
- **Input**: Base64-encoded image + batch identifier
- **Output**: Structured JSON with subjects and schedule

### Batch-Aware Extraction

- Filters subjects by selected batch (S1, S2, etc.)
- Parses entries formatted as: `BATCH-SUBJECT-STAFF-ROOM`
- Example: `S1-ADASL-MPN-503` → extracts only S1 subjects

### Response Parsing

- **Primary**: Parses JSON responses
- **Fallback 1**: Strips markdown code blocks and parses JSON
- **Fallback 2**: Extracts JSON object from response body
- **Fallback 3**: Parses markdown format with regex pattern matching

### Subject Type Classification

- **Theory**: Regular classroom subjects (lectures, tutorials)
- **Practical**: Lab subjects, marked with "LAB", "PDL", or "Practical" designation

---

## 💾 Database Schema

### Tables

**users** - User accounts

```
id, email, password, created_at, updated_at
```

**subjects** - Subject list per user

```
id, user_id, subject_name, type (Theory/Practical/Both),
total_classes, attended_classes, created_at, updated_at
```

**timetable_schedule** - Weekly subject schedule

```
id, user_id, subject_id, day (Monday-Friday),
slot_key (s1-s3, a1-a2), time_slot, created_at, updated_at
```

**attendance** - Daily attendance records

```
id, user_id, subject_id, date, time_slot, slot_key,
status (Present/Absent), created_at, updated_at
```

---

## 🎨 Frontend Components

### Dashboard.js

- Main interface displaying timetable and attendance
- Sections: Dashboard, Attendance, Timetable
- Features: Weekly view, daily attendance marking, statistics
- Auto-refreshes attendance summary

### Timetable.js

- Upload timetable image
- **Batch selection dialog** (S1-S6, A1-A2, B1-B2)
- Shows extracted subjects
- Integration with SubjectMapper

### SubjectMapper.js

- Edit/confirm extracted subjects
- Add/remove subjects manually
- Set subject types
- Review before saving

### Dashboard.css & Timetable.css

- Responsive grid layouts
- Modal dialogs for batch selection
- Subject type badges
- Attendance checkboxes styling

---

## 🔧 Configuration

### Environment Variables (.env)

**Backend (.env)**

```
GROQ_API_KEY=sk-...                    # Groq API key (get from groq.com)
MYSQL_HOST=localhost                   # Database host
MYSQL_USER=root                        # Database user
MYSQL_PASSWORD=password                # Database password
MYSQL_DB=attendance_db                 # Database name
FLASK_ENV=development                  # Flask environment
```

**Frontend (.env)**

```
REACT_APP_BACKEND_URL=http://localhost:5000    # Backend API URL
```

---

## 🐛 Troubleshooting

### "No subjects detected" Error

- Ensure timetable image quality is good
- Verify Groq API key is set in `.env`
- Check if batch is selected correctly
- Try uploading a clearer image

### Database Connection Failed

- Verify MySQL is running
- Check database credentials in `.env`
- Run `mysql -u root -p < attendance_db.sql` to setup DB
- Ensure `attendance_db` exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Batch Selection Not Working

- Ensure batch value is sent in FormData
- Check browser console for network errors
- Verify backend receives batch parameter: POST `/api/timetable/extract`

### Timetable Not Displaying

- Check if subjects were saved to database
- Verify user_id is correct (currently hardcoded to 1)
- Check database: `SELECT * FROM subjects WHERE user_id = 1;`

---

## 📝 Usage Example

1. **Start Both Servers:**

   ```bash
   # Terminal 1 - Backend
   cd backend && python app.py

   # Terminal 2 - Frontend
   cd forntend && npm start
   ```

2. **Open Browser:**
   Navigate to `http://localhost:3000`

3. **Upload Timetable:**
   - Click "Timetable Upload"
   - Select batch: S2
   - Upload timetable image
   - Wait for AI extraction (5-10 seconds)
   - Confirm subjects in mapper

4. **Mark Attendance:**
   - Go to Dashboard
   - Check boxes for attended classes
   - Click "Save Today's Attendance"
   - View statistics in Attendance tab

---

## 🚀 Future Enhancements

- [ ] Real user authentication (currently mocked)
- [ ] Multiple user support with actual user IDs
- [ ] Alert system for low attendance
- [ ] Export attendance reports (PDF/CSV)
- [ ] Mobile app version
- [ ] Real-time notifications
- [ ] Attendance analytics dashboard
- [ ] Support for multiple semesters
- [ ] Class notes/materials integration
- [ ] Teacher dashboard

---

## 📄 License

See [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please fork this repository and create a pull request with your improvements.

---

## 📧 Support

For issues or suggestions, please create an issue in this repository.

---

**Last Updated:** April 2026
**Version:** 1.0.0
