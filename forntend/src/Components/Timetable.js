import React, { useState } from "react";
import SubjectMapper from "./SubjectMapper";
import "./Timetable.css";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function Timetable({ onSaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const [abbreviations, setAbbreviations] = useState([]);
  const [showMapper, setShowMapper] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusType, setStatusType] = useState("success");

  function onFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      setPreview("");
      return;
    }
    setFile(selected);
    setStatus("");
    setPreview(URL.createObjectURL(selected));
  }

  function onSubmit(e) {
    e.preventDefault();

    if (!file) {
      setStatus("Please upload a timetable image.");
      setStatusType("error");
      return;
    }

    // User uploaded image — use AI detection
    sendImageToBackend(file);
  }

  async function sendImageToBackend(imageFile) {
    // Show loading state
    setIsLoading(true);
    setStatus("Analyzing timetable image... Please wait.");
    setStatusType("success");

    // FormData is how we send files to a server
    const formData = new FormData();
    formData.append("image", imageFile); // ⚠️ must be 'image' not 'file'

    try {
      const response = await fetch(`${BACKEND_URL}/api/timetable/extract`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // Check if something went wrong
      if (!response.ok || !data.success) {
        setStatus(`Error: ${data.error || "Something went wrong."}`);
        setStatusType("error");
        return;
      }

      // Check if AI found subjects
      if (data.data?.abbreviations?.length > 0) {
        setAbbreviations(data.data.abbreviations);
        setShowMapper(true);
        setStatus("");
      } else {
        setStatus(
          "No subjects detected. Please enter them manually or try a clearer image.",
        );
        setStatusType("error");
      }
    } catch (error) {
      // This runs if backend is not running
      setStatus(`Could not reach server: ${error.message}`);
      setStatusType("error");
    } finally {
      setIsLoading(false); // always stop loading whether success or error
    }
  }

  async function saveSubjectsToDB(subjects) {
    setIsLoading(true);
    setStatus("Saving subjects to database...");
    setStatusType("success");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/timetable/save-subjects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: 1, // 🔴 replace with actual logged-in user's ID later
            subjects: subjects,
            // subjects looks like: [{ full: "Java Programming", type: ["Theory"] }]
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus(`Error saving: ${data.error || "Something went wrong."}`);
        setStatusType("error");
        return;
      }

      // Success — reset the form
      setStatus(`✅ ${data.message}`);
      setStatusType("success");
      setFile(null);
      setPreview("");
      setAbbreviations([]);

      if (typeof onSaved === "function") {
        onSaved(subjects);
      }
    } catch (error) {
      setStatus(`Could not reach server: ${error.message}`);
      setStatusType("error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMapperConfirm(confirmedMapping) {
    setShowMapper(false); // hide the mapper
    await saveSubjectsToDB(confirmedMapping); // save to database
  }

  return (
    <div className="tt-wrapper">
      <div className="tt-card">
        <header className="tt-header">
          <div>
            <p className="tt-eyebrow">Step 2 · Timetable setup</p>
            <h2 className="tt-title">Upload your yearly timetable</h2>
            <p className="tt-subtitle">
              Add a clear photo or screenshot of your official timetable. AI
              will detect subjects and you can confirm or correct the names.
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
                <span className="tt-drop-main">
                  Drop image here or click to upload
                </span>
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

          <button type="submit" className="tt-primary" disabled={isLoading}>
            {isLoading ? "Processing..." : "Save timetable details"}
          </button>

          {status && (
            <p
              className="tt-status"
              style={{
                color: statusType === "error" ? "#ef4444" : "#22c55e",
              }}
            >
              {status}
            </p>
          )}
        </form>

        {showMapper && (
          <SubjectMapper
            abbreviations={abbreviations}
            onConfirm={handleMapperConfirm}
            onCancel={() => {
              setShowMapper(false);
              setAbbreviations([]);
              setStatus("");
            }}
          />
        )}
      </div>
    </div>
  );
}

export default Timetable;