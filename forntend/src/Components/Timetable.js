import React, { useState } from 'react';
import './Timetable.css';

function Timetable() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [status, setStatus] = useState('');

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

    // Placeholder for AI / backend hook
    setStatus(
      'Your timetable details have been saved. An AI service can read your image and/or subjects to build an attendance tracker.'
    );
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

          <p className="tt-ai-note">
            <strong>AI note:</strong> This project can connect to an OCR/AI API (for example,
            Google Vision, Azure Cognitive Services, or a custom model) to automatically detect
            subjects, time slots, and days from your timetable image, or combine your typed
            subject list with detected periods.
          </p>

          <button type="submit" className="tt-primary">
            Save timetable details
          </button>

          {status && <p className="tt-status">{status}</p>}
        </form>
      </div>
    </div>
  );
}

export default Timetable;

