import React from "react";
import Timetable from "../Components/Timetable";

function Second({
  onBack,
  onSaved,
  onGoDashboard,
  showBackToDashboard = false,
}) {
  return (
    <>
      <Timetable onSaved={onSaved} />

      {typeof onBack === "function" && (
        <button
          type="button"
          onClick={onBack}
          style={{
            position: "fixed",
            top: 16,
            left: 16,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(15,23,42,0.9)",
            color: "#e5e7eb",
            fontSize: 12,
            cursor: "pointer",
            zIndex: 40,
          }}
        >
          Back to login
        </button>
      )}

      {showBackToDashboard && typeof onGoDashboard === "function" && (
        <button
          type="button"
          onClick={onGoDashboard}
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(45,212,191,0.6)",
            background: "rgba(13,148,136,0.16)",
            color: "#ccfbf1",
            fontSize: 12,
            cursor: "pointer",
            zIndex: 40,
          }}
        >
          Back to dashboard
        </button>
      )}
    </>
  );
}

export default Second;
