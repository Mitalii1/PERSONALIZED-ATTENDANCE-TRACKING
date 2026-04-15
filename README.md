# 🎓 Personalized Attendance Tracking System

**AI-assisted attendance tracking with timetable extraction, live dashboards, and actionable analytics for students.**

[![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Flask-Web-black?logo=flask)](https://flask.palletsprojects.com/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-blue?logo=mysql)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-ISC-green)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [What's New](#whats-new)
- [Dashboard Sections](#dashboard-sections)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [API Documentation](#api-documentation)
- [User Flow](#user-flow)
- [License](#license)

---

## 📖 Overview

A full-stack student attendance management platform combining AI-powered timetable extraction, interactive dashboards, and real-time analytics. Track subjects, mark attendance, view trends, and get actionable recommendations on which classes to prioritize.

---

## ✨ What's New

### Recent Additions

- **Database-backed authentication** with hashed passwords (Werkzeug)
- **Persistent user sessions** stored in frontend localStorage
- **Authenticated API calls** using real user IDs
- **New Analytics section** with:
  - Attendance trend forecast chart
  - Subject-level risk forecasts
  - Actionable "what to attend next" suggestions
- **Timetable slot editing** with auto-save
- **User personalization** (logged-in user display, tailored data)
- **Premium dashboard UI** with glassmorphism effects and smooth transitions

---

## 🏪 Dashboard Sections

The app uses a sidebar navigation with the following sections:

### 1. **Dashboard**

- Attendance ring chart (overall percentage)
- Target progress toward 75% attendance
- Subject search and filtering
- Goal tracker (classes needed/safe bunks)
- Today's plan and upcoming classes
- Risk monitor (subjects below 75%)
- Weekly load heatmap

### 2. **Attendance**

- Current day attendance marking via checkboxes
- Per-slot subject display
- Friday-specific practical slot handling
- Save attendance to backend
- Live refresh of attendance summary

### 3. **Timetable**

- Editable slots (dropdown subject selection)
- Auto-save on slot change
- Weekly schedule from database
- Compact/comfort view toggle
- Subject count display

### 4. **Analytics** (NEW)

- **Trend Forecast Chart**: Visualizes two scenarios (attend next vs. miss next) with 75% target reference
- **Subject Risk Forecasts**: Table showing current %, forecast if you attend/miss next, classes needed, and risk level
- **What to Attend Next**: Prioritized recommendation cards based on urgency score and today's schedule

### 5. **AI Upload**

- Timetable image upload (PNG/JPG/JPEG/WEBP)
- Batch selection (S1, S2, S3)
- Subject confirmation interface
- Integration with Groq Vision API for extraction

### 6. **Settings**

- Display mode (compact/comfort tables)
- Attendance target info
- Quick access to timetable upload

---

## ✨ Features

### Authentication & Session Management

- ✅ Signup with name, email, password, year
- ✅ Login with email and password
- ✅ Password hashing via Werkzeug
- ✅ Session persistence (restored on refresh)
- ✅ Logout clears user session

### Timetable Management

- ✅ AI-powered image extraction (Groq Vision)
- ✅ Subject name confirmation interface
- ✅ Batch-aware schedule extraction (S1, S2, S3)
- ✅ Editable timetable slots
- ✅ Auto-save on slot updates
- ✅ Friday-specific practical handling

### Attendance Tracking

- ✅ Daily attendance marking per slot
- ✅ Persistent attendance records in MySQL
- ✅ Per-subject attendance summary
- ✅ Real-time statistics refresh
- ✅ Attendance target calculations

### Analytics (NEW)

- ✅ Attendance trend forecasting
- ✅ Subject risk analysis with if-then scenarios
- ✅ Priority recommendations
- ✅ Visual trend chart with multiple trajectories
- ✅ Subject-specific risk scoring

### UI/UX

- ✅ Premium glassmorphism design
- ✅ Dark theme with cyan/teal accents
- ✅ Responsive grid layouts
- ✅ Smooth transitions and hover effects
- ✅ Live clock and greeting
- ✅ Notification badges
- ✅ User avatar display

---

## 🏗️ Tech Stack

### Frontend

| Technology        | Purpose                        |
| ----------------- | ------------------------------ |
| React 19          | UI framework with Hooks        |
| CSS3              | Custom styling (no frameworks) |
| JavaScript (ES6+) | Client-side logic              |

### Backend

| Technology    | Purpose               |
| ------------- | --------------------- |
| Python 3      | Server-side language  |
| Flask         | REST API framework    |
| PyMySQL       | MySQL connection      |
| Werkzeug      | Password hashing      |
| python-dotenv | Environment variables |

### Database

| Technology               | Purpose                            |
| ------------------------ | ---------------------------------- |
| MySQL                    | User data, schedules, attendance   |
| users table              | Account info with hashed passwords |
| subjects table           | Subject list per user              |
| timetable_schedule table | Day/slot to subject mapping        |
| attendance table         | Attendance records per slot        |

### AI/Vision

| Service  | Purpose                            |
| -------- | ---------------------------------- |
| Groq API | Image OCR and timetable extraction |

---

## 📁 Project Structure

```text
PERSONALIZED-ATTENDANCE-TRACKING/
├── 📄 README.md                      # This file
├── 📄 Frontend.md                    # Frontend setup guide
├── 📄 LICENSE                        # ISC License
├── 📄 package.json                   # Root metadata
│
├── 📁 backend/
│   ├── 📄 app.py                     # Flask API server & routes
│   ├── 📄 db.py                      # Database connection
│   ├── 📄 attendance.py              # Attendance logic
│   ├── 📄 timetable_ai.py            # Groq extraktion
│   └── 📄 attendance_db.sql          # Database schema
│
└── 📁 forntend/
    ├── 📄 package.json               # React dependencies
    ├── 📄 README.md                  # Frontend guide
    ├── 📁 public/
    │   ├── 📄 index.html
    │   ├── 📄 manifest.json
    │   └── 📄 robots.txt
    │
    └── 📁 src/
        ├── 📄 App.js                 # Main app (routing logic)
        ├── 📄 App.css                # Global styles
        ├── 📄 index.js               # Entry point
        │
        ├── 📁 Components/
        │   ├── 📄 Dashboard.js       # Main dashboard & sections
        │   ├── 📄 Dashboard.css      # Dashboard styling
        │   ├── 📄 Getstarted.js      # Auth form
        │   ├── 📄 Timetable.js       # Timetable upload
        │   ├── 📄 SubjectMapper.js   # Subject confirmation
        │   └── *.css files
        │
        └── 📁 Pages/
            ├── 📄 First.js           # Auth page
            └── 📄 Second.js          # Timetable page
```

---

## 🚀 Setup & Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- MySQL 8.0+
- Groq API key

### Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install flask flask-cors python-dotenv pymysql groq werkzeug
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=attendance_db
```

Start backend:

```bash
python app.py
```

Server runs at `http://127.0.0.1:5000`

### Frontend Setup

```bash
cd forntend
npm install
npm start
```

App runs at `http://localhost:3000`

Optional `forntend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

---

## 📡 API Documentation

### Authentication Endpoints

- `POST /signup`
  - Body: `{ name, email, password, year }`
  - Returns: `{ success, message, user }`

- `POST /login`
  - Body: `{ email, password }`
  - Returns: `{ success, message, user }`

### Timetable Endpoints

- `POST /api/timetable/extract`
  - File form-data: `image`, `batch`
  - Returns: `{ success, data: { abbreviations, schedule, raw_text } }`

- `POST /api/timetable/save-subjects`
  - Body: `{ user_id, subjects, schedule }`
  - Returns: `{ success, message }`

- `GET /api/subjects/<user_id>`
  - Returns: `{ success, subjects }`

- `GET /api/timetable/week/<user_id>`
  - Returns: `{ success, week }`

- `GET /api/timetable/week-details/<user_id>`
  - Returns: `{ success, week (with subject_id, type, etc.) }`

- `PUT /api/timetable/update-slot`
  - Body: `{ user_id, day, slot_key, subject_id }`
  - Returns: `{ success, message }`

### Attendance Endpoints

- `GET /api/attendance/today/<user_id>`
  - Returns: `{ success, data }`

- `POST /api/attendance/mark`
  - Body: `{ user_id, records }`
  - Returns: `{ success, message }`

- `GET /api/attendance/summary/<user_id>`
  - Returns: `{ success, summary (per subject) }`

---

## 👥 User Flow

### First-Time User

1. **Land on Auth Page**
   - User signs up with name, email, password, year
   - Backend creates user record in MySQL with hashed password

2. **Upload Timetable**
   - User is redirected to Timetable page
   - Uploads timetable image, selects batch (S1/S2/S3)
   - AI extracts subjects and schedule
   - User confirms/edits subject names
   - Subjects and schedule saved to database

3. **Access Dashboard**
   - Navigates to Dashboard (all sections now visible)
   - Can mark attendance, edit timetable, view analytics

### Returning User

1. **Login**
   - User logs in with email and password
   - Session restored in app state
   - Dashboard shows immediately

2. **Dashboard**
   - All timetable, attendance, and analytics data loads from backend
   - Analytics calculated from real attendance + timetable data

---

## 🔑 Key Features Explained

### Session Persistence

- User object stored in `localStorage` as `pat-current-user`
- On app load, session is restored if valid
- User can refresh browser without losing login
- Logout clears stored user

### Analytics Calculations

- **Trend**: Projects attendance % if user attends/misses next 6 classes
- **Risk Forecast**: Shows per-subject impact of next attendance decision
- **Recommendations**: Prioritizes subjects by urgency (classes needed + deficit + today's schedule)

### Friday Special Handling

- Friday s1 slot is always "Practical" (8:15-10:15)
- Friday s2 combines with s3 as one practical slot (10:30-12:30)
- Backend stores as two entries; frontend renders merged cells

---

## 📝 Notes

- Frontend folder name is intentionally `forntend`.
- All user-specific data uses authenticated `user_id` (no hardcoded IDs).
- Analytics sections are fully functional with real backend data.
- If MySQL is down, API calls fail gracefully with error messages shown in UI.

---

## 📄 License

ISC
