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
  const [schedule, setSchedule] = useState({});
  const [showMapper, setShowMapper] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusType, setStatusType] = useState("success");
  
  // NEW: Batch input state
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [batch, setBatch] = useState("");
  const [allBatches] = useState(["S1", "S2", "S3", "S4", "S5", "S6", "A1", "A2", "B1", "B2"]);

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

    // NEW: Show batch input dialog instead of immediately processing
    setShowBatchInput(true);
  }

  async function sendImageToBackend(imageFile) {
    // Show loading state
    setIsLoading(true);
    setStatus("Analyzing timetable image for your batch... Please wait.");
    setStatusType("success");

    // FormData is how we send files to a server
    const formData = new FormData();
    formData.append("image", imageFile); // ⚠️ must be 'image' not 'file'
    formData.append("batch", batch); // NEW: append batch info

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
        setSchedule(data.data.schedule || {}); // NEW: store the schedule
        setShowMapper(true);
        setStatus("");
      } else {
        setStatus(
          "No subjects detected for batch " + batch + ". Please enter them manually or try a clearer image.",
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
    setStatus("Saving subjects locally...");
    setStatusType("success");

    try {
      // DEACTIVATED: Database saving is disabled
      // Instead, store subjects locally in localStorage
      const localData = {
        subjects: subjects,
        schedule: schedule,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem('pat_subjects', JSON.stringify(localData));
      
      // Success — reset the form
      setStatus(`✅ Subjects saved locally (database disabled)`);
      setStatusType("success");
      setFile(null);
      setPreview("");
      setAbbreviations([]);
      setSchedule({});

      if (typeof onSaved === "function") {
        onSaved(subjects);
      }
    } catch (error) {
      setStatus(`Error saving locally: ${error.message}`);
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

          {/* NEW: Batch Input Dialog */}
          {showBatchInput && (
            <div className="tt-batch-dialog-overlay">
              <div className="tt-batch-dialog">
                <h3 className="tt-batch-title">Select Your Batch</h3>
                <p className="tt-batch-subtitle">
                  Choose your batch to extract the correct timetable and subjects.
                </p>
                <div className="tt-batch-grid">
                  {allBatches.map((batchOption) => (
                    <button
                      key={batchOption}
                      type="button"
                      className={`tt-batch-btn ${batch === batchOption ? 'tt-batch-btn-active' : ''}`}
                      onClick={() => setBatch(batchOption)}
                    >
                      {batchOption}
                    </button>
                  ))}
                </div>
                <div className="tt-batch-actions">
                  <button
                    type="button"
                    className="tt-batch-confirm-btn"
                    onClick={() => {
                      if (batch) {
                        setShowBatchInput(false);
                        sendImageToBackend(file);
                      }
                    }}
                    disabled={!batch}
                  >
                    Confirm & Extract
                  </button>
                  <button
                    type="button"
                    className="tt-batch-cancel-btn"
                    onClick={() => {
                      setShowBatchInput(false);
                      setBatch("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* END Batch Input Dialog */}

          <button type="submit" className="tt-primary" disabled={isLoading || showBatchInput}>
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