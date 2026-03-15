import React from 'react';
import Timetable from '../Components/Timetable';

function Second({ onBack }) {
  return (
    <>
      <Timetable />
      {typeof onBack === 'function' && (
        <button
          type="button"
          onClick={onBack}
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.6)',
            background: 'rgba(15,23,42,0.9)',
            color: '#e5e7eb',
            fontSize: 12,
            cursor: 'pointer',
            zIndex: 40,
          }}
        >
          ← Back to login
        </button>
      )}
    </>
  );
}

export default Second;

