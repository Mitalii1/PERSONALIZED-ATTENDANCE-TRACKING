import React, { useState } from 'react';
import './Timetable.css';

function Timetable() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [year, setYear] = useState('');
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
    if (!file || !year) {
      setStatus('Please choose a year and upload a timetable photo first.');
      return;
    }
    // Placeholder for AI processing hook
    setStatus(
      'Your timetable image has been received. An AI service can now detect subjects and periods from this photo.'
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
              <label className="tt-label" htmlFor="tt-year">
                Academic year
              </label>
              <select
                id="tt-year"
                className="tt-select"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">Select year</option>
                <option value="1">First Year</option>
                <option value="2">Second Year</option>
                <option value="3">Third Year</option>
                <option value="4">Fourth Year</option>
              </select>
            </div>

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
            subjects, time slots, and days from your timetable image.
          </p>

          <button type="submit" className="tt-primary">
            Save timetable for this year
          </button>

          {status && <p className="tt-status">{status}</p>}
        </form>
      </div>
    </div>
  );
}

export default Timetable;

