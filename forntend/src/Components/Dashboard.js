import React, { useMemo, useState } from 'react';
import './Dashboard.css';

/** Lecture slot → time label (matches Timetable column headers) */
const ATTENDANCE_SLOT_TIMES = {
  s1: '8:15 – 10:15',
  s2: '10:30 – 11:30',
  s3: '11:30 – 12:30',
  a1: '1:15 – 2:15',
  a2: '2:15 – 3:15',
};

function Dashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  const subjectStats = useMemo(
    () => ({
      Math: { totalLectures: 30, attendedLectures: 25 },
      Java: { totalLectures: 28, attendedLectures: 23 },
      Physics: { totalLectures: 24, attendedLectures: 19 },
      DBMS: { totalLectures: 26, attendedLectures: 22 },
    }),
    []
  );
  const subjects = Object.keys(subjectStats);

  const [timetableWeek, setTimetableWeek] = useState([
    { day: 'Monday', s1: 'Java Practical', s2: 'Math', s3: 'DBMS', a1: 'Physics', a2: 'Seminar' },
    { day: 'Tuesday', s1: 'Physics Lab', s2: 'Java', s3: 'Math', a1: 'DBMS', a2: 'Project' },
    { day: 'Wednesday', s1: 'DBMS Practical', s2: 'Physics', s3: 'Java', a1: 'Math', a2: 'Elective' },
    { day: 'Thursday', s1: 'Math', s2: 'DBMS', s3: 'Physics', a1: 'Java', a2: 'Lab' },
    { day: 'Friday', s1: 'Java', s2: 'Math', s3: 'Physics', a1: 'Seminar', a2: 'Review' },
  ]);

  const [subjectAttendedCounts, setSubjectAttendedCounts] = useState({
    Math: 25,
    Java: 23,
    Physics: 19,
    DBMS: 22,
  });

  const [slotAttendanceChecked, setSlotAttendanceChecked] = useState({});

  const subjectStatsLive = useMemo(() => {
    const out = {};
    subjects.forEach((k) => {
      out[k] = {
        ...subjectStats[k],
        attendedLectures: subjectAttendedCounts[k] ?? subjectStats[k].attendedLectures,
      };
    });
    return out;
  }, [subjectAttendedCounts, subjectStats, subjects]);

  const overallTotal = useMemo(
    () => subjects.reduce((sum, subject) => sum + subjectStats[subject].totalLectures, 0),
    [subjectStats, subjects]
  );
  const overallAttended = useMemo(
    () => subjects.reduce((sum, subject) => sum + subjectStatsLive[subject].attendedLectures, 0),
    [subjectStatsLive, subjects]
  );

  const currentStats = selectedSubject
    ? subjectStatsLive[selectedSubject]
    : { totalLectures: overallTotal, attendedLectures: overallAttended };

  const totalLectures = currentStats.totalLectures;
  const attendedLectures = currentStats.attendedLectures;
  const missedLectures = totalLectures - attendedLectures;
  const attendedPercent = totalLectures === 0 ? 0 : Math.round((attendedLectures / totalLectures) * 100);
  const missedPercent = 100 - attendedPercent;

  const now = new Date();
  const dayLabel = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = now.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const attendanceDateBoxes = useMemo(() => {
    const d = new Date();
    return {
      month: d.toLocaleDateString('en-US', { month: 'long' }),
      day: d.getDate(),
    };
  }, []);

  const matchSubjectFromCell = (cellText) => {
    if (!cellText || !String(cellText).trim()) return null;
    const t = String(cellText).toLowerCase();
    const sorted = [...subjects].sort((a, b) => b.length - a.length);
    for (const k of sorted) {
      if (t.includes(k.toLowerCase())) return k;
    }
    return null;
  };

  const toggleSlotAttendance = (day, field, cellText) => {
    if (day !== dayLabel) return;
    const key = `${day}_${field}`;
    setSlotAttendanceChecked((prev) => {
      const was = !!prev[key];
      const next = !was;
      const subjectKey = matchSubjectFromCell(cellText);
      if (subjectKey) {
        setSubjectAttendedCounts((sc) => ({
          ...sc,
          [subjectKey]: Math.max(0, (sc[subjectKey] ?? 0) + (next ? 1 : -1)),
        }));
      }
      return { ...prev, [key]: next };
    });
  };

  const updateTimetableSlot = (rowIndex, field, value) => {
    setTimetableWeek((prev) =>
      prev.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row))
    );
  };

  const handleSubjectButtonClick = () => {
    if (selectedSubject) {
      setSelectedSubject(null);
      setShowSubjectDropdown(false);
      return;
    }
    setShowSubjectDropdown((prev) => !prev);
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    setShowSubjectDropdown(false);
  };

  return (
    <div className="dash">
      <div className={`dash-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <aside className="dash-sidebar" aria-label="Dashboard sidebar">
          <div className="sidebar-title" aria-label="Sidebar logo">
            <div className="dash-logo sidebar-logo">
              <svg
                className="dash-logo-cat"
                viewBox="0 0 64 64"
                role="img"
                aria-label="Cat face with glasses"
              >
                <path d="M16 24l4-10 8 7M48 24l-4-10-8 7" fill="none" stroke="#063447" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="32" cy="34" r="15" fill="#d8f4ff" />
                <circle cx="25.5" cy="33.5" r="5" fill="none" stroke="#063447" strokeWidth="2.7" />
                <circle cx="38.5" cy="33.5" r="5" fill="none" stroke="#063447" strokeWidth="2.7" />
                <line x1="30.5" y1="33.5" x2="33.5" y2="33.5" stroke="#063447" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="25.5" cy="33.5" r="1.6" fill="#063447" />
                <circle cx="38.5" cy="33.5" r="1.6" fill="#063447" />
                <path d="M32 37.5l-2 2h4z" fill="#063447" />
                <path d="M28.2 42c1.4 1.5 2.5 2.1 3.8 2.1S34.4 43.5 35.8 42" fill="none" stroke="#063447" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="22.5" y1="38.5" x2="17.8" y2="37.2" stroke="#063447" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="22.8" y1="40.8" x2="17.3" y2="41.2" stroke="#063447" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="41.5" y1="38.5" x2="46.2" y2="37.2" stroke="#063447" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="41.2" y1="40.8" x2="46.7" y2="41.2" stroke="#063447" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="sidebar-items">
            <button
              type="button"
              className={`menu-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveSection('dashboard')}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3a9 9 0 1 0 9 9h-9z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 3v9h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="menu-item-label">Dashboard</span>
            </button>
            <button
              type="button"
              className={`menu-item ${activeSection === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveSection('attendance')}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 20v-9.5a1 1 0 0 1 2 0V14m0-5.5a1 1 0 0 1 2 0V14m0-4.5a1 1 0 0 1 2 0V14m0-3a1 1 0 0 1 2 0v6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 14l-1.5-1.2a1 1 0 0 0-1.4.2l-.3.4a1 1 0 0 0 .1 1.3l2.5 2.6A5 5 0 0 0 11 19h3.5a4.5 4.5 0 0 0 4.5-4.5V14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="menu-item-label">Attendance</span>
            </button>
            <button
              type="button"
              className={`menu-item ${activeSection === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveSection('timetable')}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 3.8v2.4M16 3.8v2.4M4 9h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M8 12.5h2.5M13.5 12.5H16M8 16h2.5M13.5 16H16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="menu-item-label">Timetable</span>
            </button>
          </div>
        </aside>

        <div className="dash-content">
          {activeSection === 'dashboard' && (
            <section className="dash-main-screen">
              <h1 className="dash-title">Dashboard</h1>
              <p className="dash-date">
                {dayLabel}, {dateLabel}
              </p>

              <section className="dash-box-grid" aria-label="Student attendance summary">
                <button
                  type="button"
                  className={`dash-box-btn ${selectedSubject ? 'dash-box-btn-active' : ''}`}
                  onClick={handleSubjectButtonClick}
                >
                  <div className="dash-box-title">Subjects</div>
                  <div className="dash-box-content">
                    {selectedSubject ? `Selected: ${selectedSubject}` : 'Choose subject'}
                  </div>
                </button>

                <button type="button" className="dash-box-btn">
                  <div className="dash-box-title">Total Lectures</div>
                  <div className="dash-box-content">{totalLectures}</div>
                </button>

                <button type="button" className="dash-box-btn">
                  <div className="dash-box-title">Attended</div>
                  <div className="dash-box-content">{attendedLectures}</div>
                </button>
              </section>

              {showSubjectDropdown && (
                <div className="subject-dropdown" aria-label="Subject list">
                  {subjects.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      className="subject-option"
                      onClick={() => handleSubjectSelect(subject)}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              )}

              <section className="dash-chart-card" aria-label="Weekly attendance chart">
                <h2 className="dash-chart-title">
                  {selectedSubject ? `${selectedSubject} Attendance` : 'Weekly Attendance'}
                </h2>

                <div className="dash-chart-wrap">
                  <div
                    className="attendance-ring"
                    style={{
                      background: `conic-gradient(#22d3ee ${attendedPercent}%, #1e293b ${attendedPercent}% 100%)`,
                    }}
                    role="img"
                    aria-label={`${selectedSubject || 'Overall'} attendance: ${attendedPercent}% attended and ${missedPercent}% missed`}
                  >
                    <div className="attendance-ring-center">
                      <span>{attendedPercent}%</span>
                    </div>
                  </div>

                  <div className="attendance-legend">
                    <p>
                      <span className="legend-dot legend-attended" />
                      Attended: {attendedLectures} classes ({attendedPercent}%)
                    </p>
                    <p>
                      <span className="legend-dot legend-missed" />
                      Missed: {missedLectures} classes ({missedPercent}%)
                    </p>
                  </div>
                </div>
              </section>
            </section>
          )}

          {activeSection === 'attendance' && (
            <section
              className="dash-content-card attendance-view"
              aria-label="Weekly attendance timetable"
            >
              <div className="attendance-section-header">
                <div>
                  <h2 className="dash-section-title attendance-section-title">Attendance</h2>
                  <p className="dash-section-subtitle attendance-section-subtitle">
                    Day and time slots match Timetable. Only today&apos;s row is active — use
                    checkboxes to mark lectures attended.
                  </p>
                </div>
                <div className="attendance-date-boxes" aria-label="Current date">
                  <div className="attendance-date-box">
                    <span className="attendance-date-box-label">Month</span>
                    <span className="attendance-date-box-value">{attendanceDateBoxes.month}</span>
                  </div>
                  <div className="attendance-date-box">
                    <span className="attendance-date-box-label">Day</span>
                    <span className="attendance-date-box-value">{attendanceDateBoxes.day}</span>
                  </div>
                </div>
              </div>

              <div className="timetable-table-wrap attendance-table-wrap">
                <table className="timetable-table attendance-table">
                  <thead>
                    <tr>
                      <th scope="col" className="timetable-th-day">
                        Day
                      </th>
                      <th scope="col">8:15 – 10:15</th>
                      <th scope="col">10:30 – 11:30</th>
                      <th scope="col">11:30 – 12:30</th>
                      <th scope="col" className="timetable-th-lunch attendance-lunch-col">
                        12:30 – 1:15
                        <span className="timetable-lunch-sub">Lunch break</span>
                      </th>
                      <th scope="col">1:15 – 2:15</th>
                      <th scope="col">2:15 – 3:15</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetableWeek.map((row, index) => {
                      const isCurrentDay = row.day === dayLabel;
                      return (
                        <tr
                          key={row.day}
                          className={
                            isCurrentDay ? 'attendance-tr-active' : 'attendance-tr-inactive'
                          }
                        >
                          <th scope="row" className="timetable-day-cell">
                            {row.day}
                          </th>
                          {['s1', 's2', 's3'].map((field) => {
                            const slotKey = `${row.day}_${field}`;
                            const checked = !!slotAttendanceChecked[slotKey];
                            const text = row[field];
                            const timeLabel = ATTENDANCE_SLOT_TIMES[field];
                            return (
                              <td key={field}>
                                {isCurrentDay ? (
                                  <div className="attendance-slot-inner">
                                    <span className="attendance-slot-time-label">{timeLabel}</span>
                                    <label className="attendance-slot-label">
                                      <input
                                        type="checkbox"
                                        className="attendance-slot-checkbox"
                                        checked={checked}
                                        onChange={() => toggleSlotAttendance(row.day, field, text)}
                                        aria-label={`${timeLabel} — ${text} — attended`}
                                      />
                                      <span className="attendance-slot-text">{text}</span>
                                    </label>
                                  </div>
                                ) : (
                                  <div className="attendance-slot-inner attendance-slot-inner--readonly">
                                    <span className="attendance-slot-time-label attendance-slot-time-label--muted">
                                      {timeLabel}
                                    </span>
                                    <span className="attendance-slot-text attendance-slot-readonly">
                                      {text}
                                    </span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          {index === 0 && (
                            <td rowSpan={5} className="timetable-lunch-cell attendance-lunch-col">
                              <span className="timetable-lunch-inner">
                                Lunch break
                                <span className="timetable-lunch-time">12:30 – 1:15</span>
                              </span>
                            </td>
                          )}
                          {['a1', 'a2'].map((field) => {
                            const slotKey = `${row.day}_${field}`;
                            const checked = !!slotAttendanceChecked[slotKey];
                            const text = row[field];
                            const timeLabel = ATTENDANCE_SLOT_TIMES[field];
                            return (
                              <td key={field}>
                                {isCurrentDay ? (
                                  <div className="attendance-slot-inner">
                                    <span className="attendance-slot-time-label">{timeLabel}</span>
                                    <label className="attendance-slot-label">
                                      <input
                                        type="checkbox"
                                        className="attendance-slot-checkbox"
                                        checked={checked}
                                        onChange={() => toggleSlotAttendance(row.day, field, text)}
                                        aria-label={`${timeLabel} — ${text} — attended`}
                                      />
                                      <span className="attendance-slot-text">{text}</span>
                                    </label>
                                  </div>
                                ) : (
                                  <div className="attendance-slot-inner attendance-slot-inner--readonly">
                                    <span className="attendance-slot-time-label attendance-slot-time-label--muted">
                                      {timeLabel}
                                    </span>
                                    <span className="attendance-slot-text attendance-slot-readonly">
                                      {text}
                                    </span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === 'timetable' && (
            <section className="dash-content-card timetable-view" aria-label="Timetable section">
              <h2 className="dash-section-title">Timetable</h2>
              <p className="dash-section-subtitle">
                View and update your weekly timetable entries.
              </p>

              <div className="timetable-table-wrap">
                <table className="timetable-table">
                  <thead>
                    <tr>
                      <th scope="col" className="timetable-th-day">
                        Day
                      </th>
                      <th scope="col">8:15 – 10:15</th>
                      <th scope="col">10:30 – 11:30</th>
                      <th scope="col">11:30 – 12:30</th>
                      <th scope="col" className="timetable-th-lunch">
                        12:30 – 1:15
                        <span className="timetable-lunch-sub">Lunch break</span>
                      </th>
                      <th scope="col">1:15 – 2:15</th>
                      <th scope="col">2:15 – 3:15</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetableWeek.map((row, index) => (
                      <tr key={row.day}>
                        <th scope="row" className="timetable-day-cell">
                          {row.day}
                        </th>
                        <td>
                          <input
                            type="text"
                            className="timetable-input timetable-input-cell"
                            value={row.s1}
                            onChange={(e) => updateTimetableSlot(index, 's1', e.target.value)}
                            aria-label={`${row.day} 8:15 to 10:15`}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="timetable-input timetable-input-cell"
                            value={row.s2}
                            onChange={(e) => updateTimetableSlot(index, 's2', e.target.value)}
                            aria-label={`${row.day} 10:30 to 11:30`}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="timetable-input timetable-input-cell"
                            value={row.s3}
                            onChange={(e) => updateTimetableSlot(index, 's3', e.target.value)}
                            aria-label={`${row.day} 11:30 to 12:30`}
                          />
                        </td>
                        {index === 0 && (
                          <td rowSpan={5} className="timetable-lunch-cell">
                            <span className="timetable-lunch-inner">
                              Lunch break
                              <span className="timetable-lunch-time">12:30 – 1:15</span>
                            </span>
                          </td>
                        )}
                        <td>
                          <input
                            type="text"
                            className="timetable-input timetable-input-cell"
                            value={row.a1}
                            onChange={(e) => updateTimetableSlot(index, 'a1', e.target.value)}
                            aria-label={`${row.day} 1:15 to 2:15`}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="timetable-input timetable-input-cell"
                            value={row.a2}
                            onChange={(e) => updateTimetableSlot(index, 'a2', e.target.value)}
                            aria-label={`${row.day} 2:15 to 3:15`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      <button
        type="button"
        className="bottom-menu-toggle"
        aria-label="Toggle sidebar"
        onClick={() => setSidebarOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  );
}

export default Dashboard;