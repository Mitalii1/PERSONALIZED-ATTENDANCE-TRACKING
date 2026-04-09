# Attendance Tracking System - Integration Guide

## 📊 Complete Workflow

### 1. **Upload Timetable Image** (Timetable.js)
- User uploads timetable image (PNG/JPG)
- Frontend sends to `/api/timetable/extract` endpoint

### 2. **AI Extracts Subjects** (timetable_ai.py)
- Groq AI analyzes image
- Detects subject abbreviations, full names, and types (Theory/Practical)
- Returns JSON with abbreviations and day-wise schedule

### 3. **User Confirms Subjects** (SubjectMapper.js)
- Shows detected subjects in an editable interface
- User can:
  - Fix misspelled names
  - Add missing subjects manually
  - Select Theory/Practical type
  - Delete incorrect entries

### 4. **Save to Database** (app.py → db.py)
- Sends confirmed subjects to `/api/timetable/save-subjects`
- Backend stores:
  - **Subjects table**: subject name, type, total/attended classes
  - **Timetable_schedule table**: which subject on which day/slot

### 5. **Display on Dashboard** (Dashboard.js)
- Loads timetable from `/api/timetable/week/<user_id>`
- Displays full week in table format
- Shows subjects by slot (s1, s2, s3, a1, a2)

### 6. **Mark Attendance** (Dashboard.js + app.py)
- User checks boxes for attended classes (only today)
- Clicks "Save Today's Attendance"
- Sends to `/api/attendance/mark` with attendance records
- Backend updates:
  - **Attendance table**: date, subject, time slot, status
  - **Subjects table**: increments total_classes and attended_classes

### 7. **View Summary** (Dashboard.js)
- Fetches from `/api/attendance/summary/<user_id>`
- Shows percentage per subject
- Displays attended vs missed classes

---

## 🔧 Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/timetable/extract` | POST | Extract subjects from image |
| `/api/timetable/save-subjects` | POST | Save subjects & schedule to DB |
| `/api/timetable/week/<user_id>` | GET | Get full week timetable |
| `/api/attendance/today/<user_id>` | GET | Get today's schedule |
| `/api/attendance/mark` | POST | Save attendance records |
| `/api/attendance/summary/<user_id>` | GET | Get attendance percentage |

---

## 📁 File Responsibilities

### Backend (Python/Flask)
- **app.py** - Flask routes & API endpoints
- **timetable_ai.py** - AI image processing (Groq)
- **attendance.py** - Attendance business logic
- **db.py** - Database connection

### Frontend (React)
- **Timetable.js** - Upload & manage timetable image upload
- **SubjectMapper.js** - Confirm/edit detected subjects
- **Dashboard.js** - Main dashboard with timetable view & attendance marking
- **Getstarted.js** - Login/registration

---

## ⚠️ Important: User ID Integration

Currently, all frontend calls use **hardcoded `user_id: 1`**. You need to:

1. Store the logged-in user's ID in a context or state
2. Replace all occurrences of `1` with the actual user ID:

### Files to Update:
- **Dashboard.js** (lines ~80, ~90, ~210)
- **Timetable.js** (line ~80)

Example:
```js
// Instead of this:
fetch(`/api/timetable/week/1`)

// Do this:
fetch(`/api/timetable/week/${userId}`)
```

---

## 🗄️ Database Schema

### Subjects Table
```sql
- id
- user_id
- subject_name
- type (Theory/Practical/Both)
- total_classes
- attended_classes
```

### Timetable_schedule Table
```sql
- id
- user_id
- subject_id
- day_of_week (Monday, Tuesday, etc.)
- slot_key (s1, s2, s3, a1, a2)
- time_slot (8:15-10:15, etc.)
```

### Attendance Table
```sql
- id
- user_id
- subject_id
- date
- time_slot
- status (Present/Absent)
```

---

## ✅ Data Flow Example

```
User uploads image
        ↓
Backend: AI extracts → "ADASL", "PROGG", "JAVA"
        ↓
Frontend: Shows mapper → User confirms subjects
        ↓
Backend: Saves to DB
        ↓
Frontend: Fetches timetable
        ↓
Display: Monday | ADASL | PROGG | JAVA | ... 
        ↓
User: Checks "ADASL" as attended
        ↓
Click: Save Attendance
        ↓
Backend: Record as Present
        ↓
Frontend: Show 33% attendance (1/3 classes)
```

---

## 🚀 Next Steps

1. ✅ Ensure database is created with proper schema
2. ✅ Test `/api/timetable/extract` with a sample timetable image
3. ✅ Verify subjects are saved to database
4. ✅ Replace hardcoded user IDs with dynamic values
5. ✅ Test full workflow: upload → confirm → display → mark → view summary
