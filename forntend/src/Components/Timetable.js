import React, { useState } from 'react';
import './Timetable.css';

function Timetable() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [status, setStatus] = useState('');
  const [detectedSubjects, setDetectedSubjects] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  function onFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      setPreview('');
      return;
    }
    setFile(selected);
    setStatus('');

    const url = URL.createObjectURL(selected);
    setPreview(url);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!file && !subjectsText.trim()) {
      setStatus('Please either upload a timetable image or enter your subjects manually.');
      return;
    }

    // If file is uploaded, send to backend for OCR processing
    if (file) {
      sendImageToBackend(file);
    } else if (subjectsText.trim()) {
      // If only subjects text is provided, use that
      const subjects = subjectsText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      setDetectedSubjects(subjects);
      setShowConfirmation(true);
    }
  }

  async function sendImageToBackend(imageFile) {
    try {
      setStatus('Processing image... Please wait.');
      
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch('http://localhost:5000/detect-subjects', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(`Error: ${data.message}`);
        return;
      }

      if (data.subjects && data.subjects.length > 0) {
        setDetectedSubjects(data.subjects);
        setShowConfirmation(true);
        setStatus('');
      } else {
        setStatus('No subjects could be detected from the image. Please enter subjects manually or try a clearer image.');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error('Error sending image to backend:', error);
    }
  }

  function addNewSubject() {
    if (newSubject.trim()) {
      setDetectedSubjects([...detectedSubjects, newSubject.trim()]);
      setNewSubject('');
    }
  }

  function removeSubject(index) {
    setDetectedSubjects(detectedSubjects.filter((_, i) => i !== index));
  }

  function confirmAndSave() {
    if (detectedSubjects.length === 0) {
      setStatus('Please add at least one subject.');
      return;
    }
    setStatus('Your timetable and subjects have been saved successfully!');
    setShowConfirmation(false);
    setDetectedSubjects([]);
  }

  function cancelConfirmation() {
    setShowConfirmation(false);
    setDetectedSubjects([]);
  }

  return (
    <div className="tt-wrapper">
      <div className="tt-card">
        <header className="tt-header">
          <div>
            <p className="tt-eyebrow">Step 2 · Timetable setup</p>
            <h2 className="tt-title">Upload your yearly timetable</h2>
            <p className="tt-subtitle">
              Add a clear photo or screenshot of your official timetable. Later, an AI service can
              read subjects and periods to auto-create an attendance grid.
            </p>
          </div>
        </header>

        <form className="tt-form" onSubmit={onSubmit}>
          <div className="tt-field-group">
            <div className="tt-field">
              <label className="tt-label" htmlFor="tt-file">
                Timetable image
              </label>
              <label className="tt-dropzone" htmlFor="tt-file">
                <span className="tt-drop-main">Drop image here or click to upload</span>
                <span className="tt-drop-hint">PNG, JPG up to 10MB</span>
              </label>
              <input
                id="tt-file"
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="tt-file-input"
              />
            </div>

            <div className="tt-field">
              <label className="tt-label" htmlFor="tt-subjects">
                Or type your subjects
              </label>
              <textarea
                id="tt-subjects"
                className="tt-textarea"
                placeholder="Example:&#10;Maths&#10;Physics&#10;Chemistry&#10;Computer Science"
                value={subjectsText}
                onChange={(e) => setSubjectsText(e.target.value)}
                rows={5}
              />
              <p className="tt-help">
                You can list each subject on a new line. If you prefer, just upload a photo of your
                timetable instead.
              </p>
            </div>
          </div>

          {preview && (
            <div className="tt-preview">
              <p className="tt-preview-label">Preview</p>
              <div className="tt-preview-frame">
                <img src={preview} alt="Timetable preview" />
              </div>
            </div>
          )}

          <button type="submit" className="tt-primary">
            Save timetable details
          </button>

          {showConfirmation && detectedSubjects.length > 0 && (
            <div className="tt-detection-section">
              <h3 className="tt-detection-title">Detected Subjects</h3>
              <p className="tt-detection-subtitle">Please confirm the detected subjects or add any missing ones.</p>
              
              <div className="tt-subjects-list">
                {detectedSubjects.map((subject, index) => (
                  <div key={index} className="tt-subject-item">
                    <span className="tt-subject-name">{subject}</span>
                    <button
                      type="button"
                      className="tt-remove-btn"
                      onClick={() => removeSubject(index)}
                      title="Remove subject"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="tt-add-subject">
                <input
                  type="text"
                  className="tt-add-input"
                  placeholder="Add another subject..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewSubject()}
                />
                <button
                  type="button"
                  className="tt-add-btn"
                  onClick={addNewSubject}
                >
                  Add
                </button>
              </div>

              <div className="tt-action-buttons">
                <button
                  type="button"
                  className="tt-confirm-btn"
                  onClick={confirmAndSave}
                >
                  Confirm & Save
                </button>
                <button
                  type="button"
                  className="tt-cancel-btn"
                  onClick={cancelConfirmation}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {status && <p className="tt-status">{status}</p>}
        </form>
      </div>
    </div>
  );
}

export default Timetable;

