import React, { useState } from "react";

export default function SubjectMapper({ abbreviations, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(
    abbreviations.map((a) => ({
      short: a.short,
      full: a.full || "",
      type: a.type === "Practical" ? ["Practical"] : ["Theory"],
      isNew: false,
    })),
  );
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");

  function updateFullName(index, value) {
    const updated = [...mapping];
    updated[index].full = value;
    setMapping(updated);
  }

  function updateShortName(index, value) {
    const updated = [...mapping];
    updated[index].short = value;
    setMapping(updated);
  }

  function toggleType(index, typeValue) {
    const updated = [...mapping];
    const current = updated[index].type;

    if (current.includes(typeValue)) {
      if (current.length === 1) return; // must keep at least one selected
      updated[index].type = current.filter((t) => t !== typeValue);
    } else {
      updated[index].type = [...current, typeValue];
    }
    setMapping(updated);
  }

  function handleAddSubject() {
    if (!newSubjectCode.trim() || !newSubjectName.trim()) {
      alert("Please enter both a code and a subject name.");
      return;
    }
    const newEntry = {
      short: newSubjectCode.trim(),
      full: newSubjectName.trim(),
      type: ["Theory"],
      isNew: true,
    };
    setMapping([...mapping, newEntry]);
    setNewSubjectCode("");
    setNewSubjectName("");
    setIsAddingSubject(false);
  }

  function handleDeleteSubject(index) {
    const updated = mapping.filter((_, i) => i !== index);
    setMapping(updated);
  }

  function handleConfirm() {
    const confirmed = mapping.filter((m) => m.full.trim().length > 0);
    if (confirmed.length === 0) {
      alert("Please fill in at least one subject name.");
      return;
    }
    onConfirm(confirmed);
  }

  const incomplete = mapping.filter((m) => !m.full.trim()).length;

  return (
    <div className="mapper-section">
      <h3 className="mapper-heading">✏️ Confirm Subject Names</h3>
      <p className="mapper-subheading">
        Fill in missing names and select Theory, Practical, or both.
        {incomplete > 0 && (
          <span className="mapper-incomplete-warning">
            {" "}
            ({incomplete} still need a name)
          </span>
        )}
      </p>

      <div className="mapper-header-row">
        <span className="mapper-header-code">Code</span>
        <span className="mapper-arrow" style={{ visibility: "hidden" }}>
          →
        </span>
        <span className="mapper-header-name">Full Subject Name</span>
        <span className="mapper-header-type">Type (select one or both)</span>
        <span style={{ width: 16 }} />
      </div>

      <div className="mapper-grid">
        {mapping.map((item, index) => (
          <div key={index} className="mapper-row">
            {item.isNew ? (
              <input
                className="mapper-short-editable"
                type="text"
                placeholder="Code"
                value={item.short}
                onChange={(e) => updateShortName(index, e.target.value)}
              />
            ) : (
              <span className="mapper-short">{item.short}</span>
            )}
            <span className="mapper-arrow">→</span>

            <input
              className={`mapper-input ${!item.full.trim() ? "mapper-input-empty" : ""}`}
              type="text"
              placeholder="Enter full subject name..."
              value={item.full}
              onChange={(e) => updateFullName(index, e.target.value)}
            />

            <div className="mapper-type-toggle">
              <button
                type="button"
                className={`type-btn ${item.type.includes("Theory") ? "type-btn-active-theory" : ""}`}
                onClick={() => toggleType(index, "Theory")}
              >
                {item.type.includes("Theory") ? "✓ " : ""}Theory
              </button>
              <button
                type="button"
                className={`type-btn ${item.type.includes("Practical") ? "type-btn-active-practical" : ""}`}
                onClick={() => toggleType(index, "Practical")}
              >
                {item.type.includes("Practical") ? "✓ " : ""}Practical
              </button>
            </div>

            <span className="mapper-check">
              {item.isNew ? (
                <button
                  type="button"
                  className="mapper-delete-btn"
                  onClick={() => handleDeleteSubject(index)}
                  title="Delete this subject"
                >
                  ✕
                </button>
              ) : item.full.trim() ? (
                item.type.includes("Theory") &&
                item.type.includes("Practical") ? (
                  <span className="mapper-both-badge">Both</span>
                ) : (
                  "✓"
                )
              ) : (
                ""
              )}
            </span>
          </div>
        ))}
      </div>

      {!isAddingSubject && (
        <button
          type="button"
          className="mapper-add-subject-btn"
          onClick={() => setIsAddingSubject(true)}
        >
          + Add More Subjects
        </button>
      )}

      {isAddingSubject && (
        <div className="mapper-add-subject-form">
          <h4>Add a Subject</h4>
          <div className="mapper-add-inputs">
            <input
              type="text"
              placeholder="Subject Code (e.g., CS101)"
              value={newSubjectCode}
              onChange={(e) => setNewSubjectCode(e.target.value)}
              className="mapper-add-code-input"
            />
            <input
              type="text"
              placeholder="Full Subject Name"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="mapper-add-name-input"
            />
          </div>
          <div className="mapper-add-actions">
            <button
              type="button"
              className="mapper-add-confirm-btn"
              onClick={handleAddSubject}
            >
              Add
            </button>
            <button
              type="button"
              className="mapper-add-cancel-btn"
              onClick={() => {
                setIsAddingSubject(false);
                setNewSubjectCode("");
                setNewSubjectName("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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