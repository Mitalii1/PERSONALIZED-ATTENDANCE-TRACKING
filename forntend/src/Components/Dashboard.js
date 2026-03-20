import React from 'react';
import './Dashboard.css';

function Dashboard({ onGoToTimetable, onLogout }) {
  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-title-wrap">
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">Welcome back! Your attendance tracker is ready.</p>
        </div>

        <div className="dash-actions">
          <button type="button" className="dash-btn" onClick={onGoToTimetable}>
            Timetable setup
          </button>
          <button type="button" className="dash-btn dash-btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="dash-grid" aria-label="Quick stats">
        <div className="dash-card">
          <div className="dash-card-label">Today</div>
          <div className="dash-card-value">—</div>
          <div className="dash-card-muted">Next: check attendance</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-label">This week</div>
          <div className="dash-card-value">—</div>
          <div className="dash-card-muted">Auto calculated</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-label">Classes</div>
          <div className="dash-card-value">—</div>
          <div className="dash-card-muted">Based on your timetable</div>
        </div>
      </section>

      <section className="dash-panel" aria-label="Getting started">
        <h2 className="dash-panel-title">Getting started</h2>
        <p className="dash-panel-text">
          This is a basic dashboard design for now. Once timetable data is saved, the next step will be
          generating an attendance grid and tracking daily marks.
        </p>
      </section>
    </div>
  );
}

export default Dashboard;