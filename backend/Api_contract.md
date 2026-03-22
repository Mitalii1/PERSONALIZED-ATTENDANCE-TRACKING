# API Contract — Timetable Subject Detection
### Project: Personalized Attendance Tracking
### Backend: Flask (port 5000) | Frontend: React (port 3000)
 
---
 
## Before You Start
 
Both servers must be running at the same time:
- Backend person runs: `python app.py` → starts on port 5000
- You run: `npm start` → starts on port 3000
 
To check if backend is running, open your browser and go to:
```
http://localhost:5000/api/subjects/1
```
If you see a JSON response = backend is running ✅
If you see "could not connect" = ask backend person to start it ❌
 
---
 
## Setup — Add this to your `.env` file
 
The `.env` file is in the root of the React project (same folder as `package.json`).
If it does not exist, create it. Add this one line:
 
```
REACT_APP_BACKEND_URL=http://localhost:5000
```
 
Then use it in your code like this (add this line at the top of `Timetable.js`, before the function):
 
```js
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
```
 
---
 
## Files You Will Work In
 
```
src/
└── Components/
    ├── Timetable.js      ← edit this file
    ├── SubjectMapper.js  ← create this new file
    └── Timetable.css     ← already done, do not touch
```
 
---
 
## Your Task List
 
### Task 1 — Add import and constant to `Timetable.js`
```js
// Add this with the other imports at the top
import SubjectMapper from './SubjectMapper';
 
// Add this line right before the function Timetable() starts
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
```
 
---
 
### Task 2 — Add these state variables inside the `Timetable` function
Make sure all of these exist inside your `Timetable` function alongside the ones already there:
 
```js
const [abbreviations, setAbbreviations] = useState([]);       // subjects detected by AI
const [showMapper, setShowMapper]       = useState(false);    // show/hide SubjectMapper
const [isLoading, setIsLoading]         = useState(false);    // true while waiting for server
const [statusType, setStatusType]       = useState('success');// controls message color
```
 
---
 
### Task 3 — Add these 4 functions inside the `Timetable` function
 
#### Function 1 — Send image to backend (API Call 1)
```js
async function sendImageToBackend(imageFile) {
 
  // Show loading state
  setIsLoading(true);
  setStatus('Analyzing timetable image... Please wait.');
  setStatusType('success');
 
  // FormData is how we send files to a server
  const formData = new FormData();
  formData.append('image', imageFile); // ⚠️ must be 'image' not 'file'
 
  try {
    const response = await fetch(`${BACKEND_URL}/api/timetable/extract`, {
      method: 'POST',
      body: formData,
    });
 
    const data = await response.json();
 
    // Check if something went wrong
    if (!response.ok || !data.success) {
      setStatus(`Error: ${data.error || 'Something went wrong.'}`);
      setStatusType('error');
      return;
    }
 
    // Check if AI found subjects
    if (data.data?.abbreviations?.length > 0) {
      setAbbreviations(data.data.abbreviations);
      setShowMapper(true);  // show the SubjectMapper
      setStatus('');
 
    } else {
      setStatus('No subjects detected. Please enter them manually or try a clearer image.');
      setStatusType('error');
    }
 
  } catch (error) {
    // This runs if backend is not running
    setStatus(`Could not reach server: ${error.message}`);
    setStatusType('error');
 
  } finally {
    setIsLoading(false); // always stop loading whether success or error
  }
}
```
 
#### Function 2 — Save subjects to database (API Call 2)
```js
async function saveSubjectsToDB(subjects) {
 
  setIsLoading(true);
  setStatus('Saving subjects to database...');
  setStatusType('success');
 
  try {
    const response = await fetch(`${BACKEND_URL}/api/timetable/save-subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: 1,       // 🔴 replace with actual logged-in user's ID later
        subjects: subjects
        // subjects looks like: [{ full: "Java Programming", type: ["Theory"] }]
      }),
    });
 
    const data = await response.json();
 
    if (!response.ok || !data.success) {
      setStatus(`Error saving: ${data.error || 'Something went wrong.'}`);
      setStatusType('error');
      return;
    }
 
    // Success — reset the form
    setStatus(`✅ ${data.message}`);
    setStatusType('success');
    setFile(null);
    setPreview('');
    setSubjectsText('');
    setAbbreviations([]);
 
    if (typeof onSaved === 'function') {
      onSaved(subjects);
    }
 
  } catch (error) {
    setStatus(`Could not reach server: ${error.message}`);
    setStatusType('error');
 
  } finally {
    setIsLoading(false);
  }
}
```
 
#### Function 3 — Handle confirm from SubjectMapper
```js
async function handleMapperConfirm(confirmedMapping) {
  setShowMapper(false);                    // hide the mapper
  await saveSubjectsToDB(confirmedMapping); // save to database
}
```
 
#### Function 4 — Replace your existing `onSubmit` with this
```js
function onSubmit(e) {
  e.preventDefault(); // stops page from refreshing
 
  const manualSubjects = subjectsText.trim()
    ? subjectsText.trim().split('\n').map(s => s.trim()).filter(Boolean)
    : [];
 
  if (!file && manualSubjects.length === 0) {
    setStatus('Please upload a timetable image or enter subjects manually.');
    setStatusType('error');
    return;
  }
 
  // User typed subjects manually — skip AI, save directly
  if (manualSubjects.length > 0) {
    const formatted = manualSubjects.map(name => ({
      full: name,
      type: ['Theory'] // default type for manually entered subjects
    }));
    saveSubjectsToDB(formatted);
    return;
  }
 
  // User uploaded image — use AI detection
  if (file) {
    sendImageToBackend(file);
  }
}
```
 
---
 
### Task 4 — Update the button and status message in JSX
 
Find your submit button in the `return` section and update it:
 
```jsx
<button type="submit" className="tt-primary" disabled={isLoading}>
  {isLoading ? 'Processing...' : 'Save timetable details'}
</button>
 
{status && (
  <p className="tt-status" style={{
    color: statusType === 'error' ? '#ef4444' : '#22c55e'
  }}>
    {status}
  </p>
)}
```
 
---
 
### Task 5 — Add SubjectMapper to the JSX
 
Add this at the bottom of your `return`, just before the last closing `</div>`:
 
```jsx
{showMapper && (
  <SubjectMapper
    abbreviations={abbreviations}
    onConfirm={handleMapperConfirm}
    onCancel={() => {
      setShowMapper(false);
      setAbbreviations([]);
      setStatus('');
    }}
  />
)}
```
 
---
 
### Task 6 — Create `SubjectMapper.js`
 
Create a new file at `src/Components/SubjectMapper.js` and paste this entire code:
 
```jsx
import React, { useState } from 'react';
 
export default function SubjectMapper({ abbreviations, onConfirm, onCancel }) {
 
  const [mapping, setMapping] = useState(
    abbreviations.map(a => ({
      short: a.short,
      full:  a.full  || '',
      type:  a.type === 'Practical' ? ['Practical'] : ['Theory']
    }))
  );
 
  function updateFullName(index, value) {
    const updated = [...mapping];
    updated[index].full = value;
    setMapping(updated);
  }
 
  function toggleType(index, typeValue) {
    const updated = [...mapping];
    const current = updated[index].type;
 
    if (current.includes(typeValue)) {
      if (current.length === 1) return; // must keep at least one selected
      updated[index].type = current.filter(t => t !== typeValue);
    } else {
      updated[index].type = [...current, typeValue];
    }
    setMapping(updated);
  }
 
  function handleConfirm() {
    const confirmed = mapping.filter(m => m.full.trim().length > 0);
    if (confirmed.length === 0) {
      alert('Please fill in at least one subject name.');
      return;
    }
    onConfirm(confirmed);
  }
 
  const incomplete = mapping.filter(m => !m.full.trim()).length;
 
  return (
    <div className="mapper-section">
      <h3 className="mapper-heading">✏️ Confirm Subject Names</h3>
      <p className="mapper-subheading">
        Fill in missing names and select Theory, Practical, or both.
        {incomplete > 0 && (
          <span className="mapper-incomplete-warning">
            {' '}({incomplete} still need a name)
          </span>
        )}
      </p>
 
      <div className="mapper-header-row">
        <span className="mapper-header-code">Code</span>
        <span className="mapper-arrow" style={{ visibility: 'hidden' }}>→</span>
        <span className="mapper-header-name">Full Subject Name</span>
        <span className="mapper-header-type">Type (select one or both)</span>
        <span style={{ width: 16 }} />
      </div>
 
      <div className="mapper-grid">
        {mapping.map((item, index) => (
          <div key={index} className="mapper-row">
 
            <span className="mapper-short">{item.short}</span>
            <span className="mapper-arrow">→</span>
 
            <input
              className={`mapper-input ${!item.full.trim() ? 'mapper-input-empty' : ''}`}
              type="text"
              placeholder="Enter full subject name..."
              value={item.full}
              onChange={(e) => updateFullName(index, e.target.value)}
            />
 
            <div className="mapper-type-toggle">
              <button
                type="button"
                className={`type-btn ${item.type.includes('Theory') ? 'type-btn-active-theory' : ''}`}
                onClick={() => toggleType(index, 'Theory')}
              >
                {item.type.includes('Theory') ? '✓ ' : ''}Theory
              </button>
              <button
                type="button"
                className={`type-btn ${item.type.includes('Practical') ? 'type-btn-active-practical' : ''}`}
                onClick={() => toggleType(index, 'Practical')}
              >
                {item.type.includes('Practical') ? '✓ ' : ''}Practical
              </button>
            </div>
 
            <span className="mapper-check">
              {item.full.trim()
                ? item.type.includes('Theory') && item.type.includes('Practical')
                  ? <span className="mapper-both-badge">Both</span>
                  : '✓'
                : ''}
            </span>
 
          </div>
        ))}
      </div>
 
      <div className="tt-action-buttons" style={{ marginTop: 24 }}>
        <button className="tt-confirm-btn" onClick={handleConfirm}>
          Confirm & Save
        </button>
        <button className="tt-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
```
 
---
 
## API Reference
 
### API 1 — Detect subjects from image
 
```
URL:    POST http://localhost:5000/api/timetable/extract
Type:   multipart/form-data
Field:  image   ⚠️ must be exactly "image" not "file"
```
 
**Success response:**
```json
{
  "success": true,
  "data": {
    "abbreviations": [
      { "short": "ADASL", "full": "Advanced Data Structures", "type": "Theory" },
      { "short": "PROGG", "full": "Programming in Java",      "type": "Theory" },
      { "short": "PDL",   "full": "",                         "type": "Practical" }
    ]
  }
}
```
 
**Error response:**
```json
{ "success": false, "error": "No image file provided" }
```
 
---
 
### API 2 — Save subjects to database
 
```
URL:    POST http://localhost:5000/api/timetable/save-subjects
Type:   application/json
```
 
**Request body:**
```json
{
  "user_id": 1,
  "subjects": [
    { "full": "Advanced Data Structures", "type": ["Theory"] },
    { "full": "Java Programming",         "type": ["Theory", "Practical"] },
    { "full": "Computer Networks Lab",    "type": ["Practical"] }
  ]
}
```
 
**Success response:**
```json
{ "success": true, "message": "3 subjects saved successfully" }
```
 
**Error response:**
```json
{ "success": false, "error": "user_id is required" }
```
 
---
 
### API 3 — Get saved subjects for a user
 
```
URL:    GET http://localhost:5000/api/subjects/1
        replace 1 with the actual user_id
```
 
**Success response:**
```json
{
  "success": true,
  "subjects": [
    { "id": 1, "subject_name": "Advanced Data Structures", "type": "Theory",    "total_classes": 0, "attended_classes": 0 },
    { "id": 2, "subject_name": "Java Programming",         "type": "Both",      "total_classes": 0, "attended_classes": 0 },
    { "id": 3, "subject_name": "Computer Networks Lab",    "type": "Practical", "total_classes": 0, "attended_classes": 0 }
  ]
}
```
 
---
 
## How to Test Your Work
 
```
1. Make sure backend is running (ask backend person to run python app.py)
2. Run React: npm start
3. Go to timetable page
4. Upload a timetable image
5. Click Save timetable details
6. SubjectMapper should appear with detected subjects
7. Fill in any empty subject names (they will be highlighted yellow)
8. Click Theory or Practical buttons to set the type for each subject
9. Click Confirm & Save
10. Green success message should appear
11. To verify data was saved, tell backend person to check MySQL
```
 
---
 
## Common Mistakes and Fixes
 
| Mistake | What happens | Fix |
|---|---|---|
| `formData.append('file', ...)` | Gets 400 error | Change to `'image'` |
| Reading `data.subjects` | Undefined error | Must be `data.data.abbreviations` |
| Sending `type: "Theory"` as string | Save fails | Must be array `["Theory"]` |
| Backend not running | Network error | Ask backend person to run `python app.py` |
| SubjectMapper not found | Compile error | Check file is at `src/Components/SubjectMapper.js` |
| CORS error in console | Backend config | Tell backend person to check `CORS(app)` in `app.py` |
 
---
 
## If Something Doesn't Work
 
```
1. Press F12 in the browser
2. Go to the Console tab — red text shows errors
3. Go to the Network tab — click the failed request to see the full error
4. Copy the error message and share it with the backend person
```
 
---
 
## Type Field Explanation
 
```
In SubjectMapper, type is stored as an array:
  ["Theory"]               → Theory only
  ["Practical"]            → Practical only
  ["Theory", "Practical"]  → Both theory and practical
 
The backend converts this to a string before saving:
  ["Theory"]               → saves as "Theory"
  ["Practical"]            → saves as "Practical"
  ["Theory", "Practical"]  → saves as "Both"
```