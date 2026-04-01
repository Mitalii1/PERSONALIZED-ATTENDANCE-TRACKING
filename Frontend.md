# Frontend Integration Guide — Attendance & Dashboard
### For: Dashboard.js Developer | React Beginner Friendly
 
---
 
## What We Are Building
 
The Dashboard already works with hardcoded dummy data.
Your job is to replace that dummy data with real data from the backend database.
 
```
Currently:                        What we want:
Hardcoded timetable data    →     Real timetable from database
Hardcoded subject list      →     Subjects saved from timetable image
Checkboxes don't save       →     Attendance saved to MySQL database
Stats show dummy numbers    →     Real attendance percentages from database
```
 
---
 
## Before You Start
 
Make sure:
1. Backend person has started Flask: `python app.py`
2. You have started React: `npm start`
3. Test backend is running — open browser and go to:
   ```
   http://localhost:5000/api/timetable/week/1
   ```
   You should see a JSON response. If not, tell backend person to start the server.
 
---
 
## Add This to Your `.env` File
 
The `.env` file is in the root of the React project (same folder as `package.json`).
 
```
REACT_APP_BACKEND_URL=http://localhost:5000
```
 
Then add this line at the top of `Dashboard.js`, before the function:
 
```js
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
```
 
---
 
## Files You Will Work In
 
```
src/
└── Components/
    └── Dashboard.js     ← only this file needs changes
```
 
---
 
## Understanding the Current Code
 
Right now `Dashboard.js` has this hardcoded data:
 
```js
const [timetableWeek, setTimetableWeek] = useState([
  { day: 'Monday', s1: 'Java Practical', s2: 'Math', s3: 'DBMS', a1: 'Physics', a2: 'Seminar' },
  { day: 'Tuesday', ... },
  ...
]);
```
 
We need to replace this with data that comes from the backend API.
 
The slot keys `s1, s2, s3, a1, a2` match these time slots:
```
s1 = 8:15  – 10:15
s2 = 10:30 – 11:30
s3 = 11:30 – 12:30
a1 = 1:15  – 2:15
a2 = 2:15  – 3:15
```
 
---
 
## Step 1 — Add `useEffect` import
 
At the top of `Dashboard.js`, update the React import:
 
```js
// Change this:
import React, { useMemo, useState } from 'react';
 
// To this:
import React, { useMemo, useState, useEffect } from 'react';
```
 
---
 
## Step 2 — Replace hardcoded timetable with empty array
 
Find this code in Dashboard.js:
 
```js
const [timetableWeek, setTimetableWeek] = useState([
  { day: 'Monday', s1: 'Java Practical', s2: 'Math', ... },
  { day: 'Tuesday', ... },
  { day: 'Wednesday', ... },
  { day: 'Thursday', ... },
  { day: 'Friday', ... },
]);
```
 
Replace it with just an empty array:
 
```js
const [timetableWeek, setTimetableWeek] = useState([]);
```
 
---
 
## Step 3 — Add state variables
 
Add these new state variables right after your existing useState lines:
 
```js
const [isLoadingTimetable, setIsLoadingTimetable]   = useState(true);
const [attendanceSummary, setAttendanceSummary]      = useState([]);
const [attendanceSaved, setAttendanceSaved]          = useState(false);
const [saveError, setSaveError]                      = useState('');
```
 
---
 
## Step 4 — Fetch timetable from backend
 
Add this `useEffect` block right after all your `useState` lines and before any `useMemo` lines:
 
```js
// Fetch timetable week from backend when page loads
useEffect(() => {
  setIsLoadingTimetable(true);
 
  fetch(`${BACKEND_URL}/api/timetable/week/1`)  // replace 1 with actual user_id later
    .then(res => res.json())
    .then(data => {
      if (data.success && data.week.length > 0) {
        setTimetableWeek(data.week);
      } else {
        console.log('No timetable found for this user');
      }
    })
    .catch(err => {
      console.error('Could not load timetable:', err);
    })
    .finally(() => {
      setIsLoadingTimetable(false);
    });
}, []); // empty [] means this runs only once when page loads
```
 
---
 
## Step 5 — Fetch attendance summary from backend
 
Add this second `useEffect` right after the first one:
 
```js
// Fetch attendance summary (percentages per subject)
useEffect(() => {
  fetch(`${BACKEND_URL}/api/attendance/summary/1`)  // replace 1 with actual user_id later
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setAttendanceSummary(data.summary);
      }
    })
    .catch(err => {
      console.error('Could not load attendance summary:', err);
    });
}, [attendanceSaved]); 
// attendanceSaved in [] means this re-runs every time attendance is saved
```
 
---
 
## Step 6 — Add the save attendance function
 
Add this function inside the `Dashboard` function, alongside your other functions like `toggleSlotAttendance`:
 
```js
async function saveAttendanceToDatabase() {
  setSaveError('');
 
  // Build list of records from checked checkboxes
  const records = [];
 
  Object.entries(slotAttendanceChecked).forEach(([slotKey, isChecked]) => {
    const [day, field] = slotKey.split('_');
 
    // Only save today's attendance
    if (day !== dayLabel) return;
    
    const row = timetableWeek.find(r => r.day === day);
    if (!row) return;
 
    const subjectName = row[field];
    if (!subjectName) return;
 
    // Find subject_id from attendance summary
    const subjectInfo = attendanceSummary.find(
      s => s.subject_name === subjectName
    );
 
    records.push({
      subject_id: subjectInfo?.id || null,
      subject_name: subjectName,
      slot_key: field,
      time_slot: ATTENDANCE_SLOT_TIMES[field],
      status: isChecked ? 'Present' : 'Absent'
    });
  });
 
  // Also add unchecked slots for today as Absent
  const todayRow = timetableWeek.find(r => r.day === dayLabel);
  if (todayRow) {
    ['s1', 's2', 's3', 'a1', 'a2'].forEach(field => {
      const slotKey = `${dayLabel}_${field}`;
      const subjectName = todayRow[field];
 
      // Skip if already added or empty slot
      if (!subjectName) return;
      const alreadyAdded = records.find(r => r.slot_key === field);
      if (alreadyAdded) return;
 
      const subjectInfo = attendanceSummary.find(
        s => s.subject_name === subjectName
      );
 
      records.push({
        subject_id: subjectInfo?.id || null,
        subject_name: subjectName,
        slot_key: field,
        time_slot: ATTENDANCE_SLOT_TIMES[field],
        status: 'Absent'
      });
    });
  }
 
  if (records.length === 0) {
    setSaveError('No classes to save for today.');
    return;
  }
 
  try {
    const response = await fetch(`${BACKEND_URL}/api/attendance/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 1,  // replace with actual user_id later
        records: records
      })
    });
 
    const data = await response.json();
 
    if (data.success) {
      setAttendanceSaved(prev => !prev); // triggers summary refresh
      alert(`✅ ${data.message}`);
    } else {
      setSaveError(`Error: ${data.error}`);
    }
 
  } catch (err) {
    setSaveError(`Could not reach server: ${err.message}`);
  }
}
```
 
---
 
## Step 7 — Add loading state to timetable display
 
In the `timetable` section of your JSX (inside `activeSection === 'timetable'`),
add a loading message at the very top before the table:
 
```jsx
{activeSection === 'timetable' && (
  <section className="dash-content-card timetable-view">
    <h2 className="dash-section-title">Timetable</h2>
    <p className="dash-section-subtitle">
      View and update your weekly timetable entries.
    </p>
 
    {/* ADD THIS loading check */}
    {isLoadingTimetable ? (
      <p style={{ color: '#9ca3af', padding: '20px' }}>Loading timetable...</p>
    ) : timetableWeek.length === 0 ? (
      <p style={{ color: '#9ca3af', padding: '20px' }}>
        No timetable found. Please upload your timetable image first.
      </p>
    ) : (
      // your existing table code stays here unchanged
      <div className="timetable-table-wrap">
        ...existing table...
      </div>
    )}
  </section>
)}
```
 
---
 
## Step 8 — Add Save Attendance button
 
In the `attendance` section of your JSX (inside `activeSection === 'attendance'`),
add a Save button after the table closing tag `</div>`:
 
```jsx
{/* Add this after the timetable-table-wrap closing div */}
<div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
  <button
    type="button"
    className="tt-primary"
    onClick={saveAttendanceToDatabase}
    style={{ width: 'auto', padding: '10px 24px' }}
  >
    Save Today's Attendance
  </button>
 
  {saveError && (
    <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>
      {saveError}
    </p>
  )}
</div>
```
 
---
 
## Step 9 — Use real data in Dashboard stats
 
The dashboard currently shows `totalLectures` and `attendedLectures` from the
hardcoded timetable. Update the stats to use real data from `attendanceSummary`.
 
Find the `overallTotal` and `overallAttended` useMemo blocks and update them:
 
```js
// Replace existing overallTotal
const overallTotal = useMemo(() => {
  if (attendanceSummary.length > 0) {
    return attendanceSummary.reduce((sum, s) => sum + (s.total_classes || 0), 0);
  }
  // fallback to timetable count if no summary yet
  return subjects.reduce((sum, subject) => sum + (weeklySubjectData[subject]?.totalLectures || 0), 0);
}, [attendanceSummary, subjects, weeklySubjectData]);
 
// Replace existing overallAttended
const overallAttended = useMemo(() => {
  if (attendanceSummary.length > 0) {
    return attendanceSummary.reduce((sum, s) => sum + (s.attended_classes || 0), 0);
  }
  return subjects.reduce((sum, subject) => sum + (weeklySubjectData[subject]?.attendedLectures || 0), 0);
}, [attendanceSummary, subjects, weeklySubjectData]);
```
 
---
 
## How to Test Your Work
 
```
1. Make sure backend is running (ask backend person: python app.py)
2. Run React: npm start
3. Go to the Dashboard page
 
TEST 1 — Timetable loads from database:
- Click Timetable in sidebar
- Should show real subjects from the uploaded timetable image
- Should NOT show dummy data (Java Practical, Math, DBMS etc.)
 
TEST 2 — Mark attendance:
- Click Attendance in sidebar
- Today's row should be active with checkboxes
- Check some subjects as attended
- Click Save Today's Attendance button
- Should see success alert
 
TEST 3 — Stats update:
- Click Dashboard in sidebar
- Total Lectures and Attended numbers should update
- The ring chart percentage should reflect real attendance
 
TEST 4 — Verify in database (tell backend person to run):
  SELECT * FROM attendance;
  SELECT subject_name, total_classes, attended_classes FROM subjects WHERE user_id = 1;
```
 
---
 
## API Endpoints Reference
 
### Get full week timetable
```
GET http://localhost:5000/api/timetable/week/1
 
Response:
{
  "success": true,
  "week": [
    { "day": "Monday",    "s1": "Java", "s2": "Math", "s3": "DBMS", "a1": "Physics", "a2": "Seminar" },
    { "day": "Tuesday",   "s1": "...",  ... },
    { "day": "Wednesday", ... },
    { "day": "Thursday",  ... },
    { "day": "Friday",    ... }
  ]
}
```
 
### Mark attendance
```
POST http://localhost:5000/api/attendance/mark
Content-Type: application/json
 
Body:
{
  "user_id": 1,
  "records": [
    { "subject_id": 1, "slot_key": "s1", "time_slot": "8:15-10:15",  "status": "Present" },
    { "subject_id": 2, "slot_key": "s2", "time_slot": "10:30-11:30", "status": "Absent"  }
  ]
}
 
Response:
{ "success": true, "message": "Attendance marked for 2 classes" }
```
 
### Get attendance summary
```
GET http://localhost:5000/api/attendance/summary/1
 
Response:
{
  "success": true,
  "summary": [
    { "id": 1, "subject_name": "Java", "type": "Theory", "total_classes": 5, "attended_classes": 4, "percentage": 80.0 },
    { "id": 2, "subject_name": "Math", "type": "Theory", "total_classes": 5, "attended_classes": 3, "percentage": 60.0 }
  ]
}
```
 
---
 
## Common Mistakes and Fixes
 
| Mistake | What happens | Fix |
|---|---|---|
| Forgot `useEffect` in import | Compile error | Add `useEffect` to React import at top |
| Backend not running | Timetable stays empty | Ask backend person to run `python app.py` |
| user_id hardcoded as 1 but no data | Empty timetable | Make sure timetable was uploaded and saved first |
| Save button not showing | Nothing happens on click | Check button is inside `activeSection === 'attendance'` block |
| Summary not updating after save | Stats stay same | Check `attendanceSaved` is in the dependency array of summary useEffect |
 
---
 
## If Something Doesn't Work
 
```
1. Press F12 in browser
2. Go to Console tab — red text = error
3. Go to Network tab — click the failed request to see full error
4. Share the error with backend person
```
 
---
 
## Important Note on user_id
 
Right now all API calls use `user_id: 1` as a placeholder.
Once login/authentication is set up, replace `1` with the actual
logged-in user's ID from your auth system.
 
Search for this in Dashboard.js to find all places to update:
```
// replace 1 with actual user_id later
```