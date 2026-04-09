import React, { useMemo, useState, useEffect } from 'react';
import './Dashboard.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

/** Lecture slot → time label (matches Timetable column headers) */
const ATTENDANCE_SLOT_TIMES = {
  s1: '8:15 – 10:15',
  s2: '10:30 – 11:30',
  s3: '11:30 – 12:30',
  a1: '1:15 – 2:15',
  a2: '2:15 – 3:15',
};

// Backend uses different format (no spaces around dash)
const ATTENDANCE_SLOT_TIMES_DB = {
  s1: '8:15-10:15',
  s2: '10:30-11:30',
  s3: '11:30-12:30',
  a1: '1:15-2:15',
  a2: '2:15-3:15',
};

function Dashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // ── NEW: backend state ────────────────────────────────────────────────────
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(true);
  const [attendanceSummary, setAttendanceSummary]   = useState([]);
  const [attendanceSaved, setAttendanceSaved]        = useState(false);
  const [saveStatus, setSaveStatus]                  = useState('');
  const [saveStatusType, setSaveStatusType]          = useState('success');
  const [isSaving, setIsSaving]                      = useState(false);
  // ─────────────────────────────────────────────────────────────────────────

  const normalizeSubject = (subjectText) => {
    if (!subjectText || !String(subjectText).trim()) return null;
    const cleanup = String(subjectText).trim();
    const removeTokens = [
      'Practical', 'Lab', 'Seminar', 'Project', 'Elective',
      'Review', 'Workshop', 'Session', 'Tutorial', 'Class', 'Lecture', 'Theory',
    ];
    let normalized = cleanup;
    removeTokens.forEach((token) => {
      normalized = normalized.replace(new RegExp(`\\b${token}\\b`, 'gi'), '');
    });
    normalized = normalized.replace(/[-\/]/g, ' ').trim();
    normalized = normalized.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    return normalized;
  };

  // ── CHANGED: start with empty array, filled from API ─────────────────────
  const [timetableWeek, setTimetableWeek] = useState([]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── NEW: fetch timetable from backend on page load ────────────────────────
  const [timetableDetailed, setTimetableDetailed] = useState([]);
  
  useEffect(() => {
    setIsLoadingTimetable(true);
    
    // DEACTIVATED: Fetch from localStorage instead of database
    try {
      const savedData = localStorage.getItem('pat_subjects');
      if (savedData) {
        const { subjects, schedule } = JSON.parse(savedData);
        
        // Build detailed timetable from local data
        const SLOT_MAP = { 's1': 's1', 's2': 's2', 's3': 's3', 'a1': 'a1', 'a2': 'a2' };
        const SLOT_TIMES = {
          's1': '8:15-10:15', 's2': '10:30-11:30', 's3': '11:30-12:30',
          'a1': '1:15-2:15', 'a2': '2:15-3:15',
        };
        
        // Create subject lookup by name
        const subjectLookup = {};
        subjects.forEach((sub, idx) => {
          subjectLookup[sub.short] = {
            subject_name: sub.full,
            type: Array.isArray(sub.type) ? sub.type.join('/') : sub.type,
            subject_id: idx + 1,
            slot_key: '',
          };
        });
        
        const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const detailedWeek = DAYS.map(day => {
          const dayData = {
            day: day,
            s1: null, s2: null, s3: null, a1: null, a2: null
          };
          
          if (schedule[day]) {
            schedule[day].forEach((shortName, i) => {
              if (i < 5) {
                const slotKey = ['s1', 's2', 's3', 'a1', 'a2'][i];
                if (subjectLookup[shortName]) {
                  dayData[slotKey] = {
                    ...subjectLookup[shortName],
                    time_slot: SLOT_TIMES[slotKey],
                    slot_key: slotKey
                  };
                }
              }
            });
          }
          
          return dayData;
        });
        
        setTimetableDetailed(detailedWeek);
        
        // Build simple version for compatibility
        const simpleWeek = detailedWeek.map(day => ({
          day: day.day,
          s1: day.s1?.subject_name || '',
          s2: day.s2?.subject_name || '',
          s3: day.s3?.subject_name || '',
          a1: day.a1?.subject_name || '',
          a2: day.a2?.subject_name || '',
        }));
        setTimetableWeek(simpleWeek);
      }
    } catch (err) {
      console.error('Error loading timetable from localStorage:', err);
    } finally {
      setIsLoadingTimetable(false);
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // ── NEW: fetch attendance summary — re-runs every time attendance is saved
  useEffect(() => {
    // DEACTIVATED: Attendance summary from database disabled
    // For now, calculate from local state only
    // In future, integrate with localStorage or state management
    setAttendanceSummary([]);
  }, [attendanceSaved]);
  // ─────────────────────────────────────────────────────────────────────────

  const subjects = useMemo(() => {
    const set = new Set();
    timetableWeek.forEach((row) => {
      ['s1', 's2', 's3', 'a1', 'a2'].forEach((field) => {
        const subjectName = normalizeSubject(row[field]);
        if (subjectName) set.add(subjectName);
      });
    });
    return Array.from(set).sort();
  }, [timetableWeek]);

  const [slotAttendanceChecked, setSlotAttendanceChecked] = useState({});

  const timetableSubjectTotals = useMemo(() => {
    const totals = {};
    timetableWeek.forEach((row) => {
      ['s1', 's2', 's3', 'a1', 'a2'].forEach((field) => {
        const normalized = normalizeSubject(row[field]);
        if (!normalized) return;
        totals[normalized] = (totals[normalized] || 0) + 1;
      });
    });
    return totals;
  }, [timetableWeek]);

  const timetableSubjectAttended = useMemo(() => {
    const attended = {};
    Object.entries(slotAttendanceChecked).forEach(([slotKey, isChecked]) => {
      if (!isChecked) return;
      const [day, field] = slotKey.split('_');
      const row = timetableWeek.find((item) => item.day === day);
      if (!row) return;
      const subjectName = normalizeSubject(row[field]);
      if (!subjectName) return;
      attended[subjectName] = (attended[subjectName] || 0) + 1;
    });
    return attended;
  }, [slotAttendanceChecked, timetableWeek]);

  const weeklySubjectData = useMemo(() => {
    const data = {};
    subjects.forEach((sub) => {
      // ── NEW: use real DB data if available, else fall back to local count ─
      const summaryItem = attendanceSummary.find(
        s => s.subject_name === sub || normalizeSubject(s.subject_name) === sub
      );
      if (summaryItem) {
        data[sub] = {
          totalLectures:    summaryItem.total_classes,
          attendedLectures: summaryItem.attended_classes,
          missedLectures:   Math.max(0, summaryItem.total_classes - summaryItem.attended_classes),
          attendedPercent:  summaryItem.percentage,
          subjectId:        summaryItem.id,
        };
      } else {
        const total    = timetableSubjectTotals[sub] || 0;
        const attended = timetableSubjectAttended[sub] || 0;
        data[sub] = {
          totalLectures:    total,
          attendedLectures: attended,
          missedLectures:   Math.max(0, total - attended),
          attendedPercent:  total === 0 ? 0 : Math.round((attended / total) * 100),
          subjectId:        null,
        };
      }
    });
    return data;
  }, [subjects, timetableSubjectTotals, timetableSubjectAttended, attendanceSummary]);

  // ── CHANGED: use real DB totals if available ──────────────────────────────
  const overallTotal = useMemo(() => {
    if (attendanceSummary.length > 0) {
      return attendanceSummary.reduce((sum, s) => sum + (s.total_classes || 0), 0);
    }
    return subjects.reduce((sum, subject) => sum + (weeklySubjectData[subject]?.totalLectures || 0), 0);
  }, [attendanceSummary, subjects, weeklySubjectData]);

  const overallAttended = useMemo(() => {
    if (attendanceSummary.length > 0) {
      return attendanceSummary.reduce((sum, s) => sum + (s.attended_classes || 0), 0);
    }
    return subjects.reduce((sum, subject) => sum + (weeklySubjectData[subject]?.attendedLectures || 0), 0);
  }, [attendanceSummary, subjects, weeklySubjectData]);
  // ─────────────────────────────────────────────────────────────────────────

  const currentStats = selectedSubject
    ? weeklySubjectData[selectedSubject] || { totalLectures: 0, attendedLectures: 0 }
    : { totalLectures: overallTotal, attendedLectures: overallAttended };

  const totalLectures    = currentStats.totalLectures;
  const attendedLectures = currentStats.attendedLectures;
  const missedLectures   = currentStats.totalLectures - currentStats.attendedLectures;
  const attendedPercent  = currentStats.totalLectures === 0 ? 0 : Math.round((currentStats.attendedLectures / currentStats.totalLectures) * 100);
  const missedPercent    = 100 - attendedPercent;

  const now       = new Date();
  const dayLabel  = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const attendanceDateBoxes = useMemo(() => {
    const d = new Date();
    return {
      month: d.toLocaleDateString('en-US', { month: 'long' }),
      day:   d.getDate(),
    };
  }, []);

  const toggleSlotAttendance = (day, field, cellText) => {
    if (day !== dayLabel) return;
    const key = `${day}_${field}`;
    setSlotAttendanceChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateTimetableSlot = (rowIndex, field, value) => {
    setTimetableWeek((prev) =>
      prev.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row))
    );
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
  };

  // ── NEW: save attendance to database ─────────────────────────────────────
  async function saveAttendanceToDatabase() {
    setSaveStatus('');
    setIsSaving(true);

    const todayRow = timetableWeek.find(r => r.day === dayLabel);
    if (!todayRow) {
      setSaveStatus('No classes found for today.');
      setSaveStatusType('error');
      setIsSaving(false);
      return;
    }

    const records = [];
    ['s1', 's2', 's3', 'a1', 'a2'].forEach(field => {
      const subjectName = todayRow[field];
      if (!subjectName) return;

      const slotKey    = `${dayLabel}_${field}`;
      const isChecked  = !!slotAttendanceChecked[slotKey];

      records.push({
        subject_name: subjectName,
        slot_key:     field,
        time_slot:    ATTENDANCE_SLOT_TIMES_DB[field],
        status:       isChecked ? 'Present' : 'Absent',
        date:         new Date().toISOString().split('T')[0],
      });
    });

    if (records.length === 0) {
      setSaveStatus('No classes scheduled for today.');
      setSaveStatusType('error');
      setIsSaving(false);
      return;
    }

    try {
      // DEACTIVATED: Database save disabled
      // Instead, save attendance to localStorage
      const attendanceRecords = JSON.parse(localStorage.getItem('pat_attendance') || '[]');
      
      // Add new records
      attendanceRecords.push(...records);
      
      localStorage.setItem('pat_attendance', JSON.stringify(attendanceRecords));
      
      setSaveStatus(`✅ Attendance saved locally (${records.length} records)`);
      setSaveStatusType('success');
      setAttendanceSaved(prev => !prev); // triggers summary refresh
    } catch (err) {
      setSaveStatus(`Error saving locally: ${err.message}`);
      setSaveStatusType('error');
    } finally {
      setIsSaving(false);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="dash">
      <div className={`dash-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <aside className="dash-sidebar" aria-label="Dashboard sidebar">
          <div className="sidebar-title" aria-label="Sidebar logo">
            <div className="dash-logo sidebar-logo">
              <svg className="dash-logo-cat" viewBox="0 0 64 64" role="img" aria-label="Cat face with glasses">
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
            <button type="button" className={`menu-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3a9 9 0 1 0 9 9h-9z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 3v9h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="menu-item-label">Dashboard</span>
            </button>
            <button type="button" className={`menu-item ${activeSection === 'attendance' ? 'active' : ''}`} onClick={() => setActiveSection('attendance')}>
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 20v-9.5a1 1 0 0 1 2 0V14m0-5.5a1 1 0 0 1 2 0V14m0-4.5a1 1 0 0 1 2 0V14m0-3a1 1 0 0 1 2 0v6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 14l-1.5-1.2a1 1 0 0 0-1.4.2l-.3.4a1 1 0 0 0 .1 1.3l2.5 2.6A5 5 0 0 0 11 19h3.5a4.5 4.5 0 0 0 4.5-4.5V14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="menu-item-label">Attendance</span>
            </button>
            <button type="button" className={`menu-item ${activeSection === 'timetable' ? 'active' : ''}`} onClick={() => setActiveSection('timetable')}>
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

          {/* ── DASHBOARD SECTION ─────────────────────────────────────────── */}
          {activeSection === 'dashboard' && (
            <section className="dash-main-screen">
              <h1 className="dash-title">Dashboard</h1>
              <p className="dash-date">{dayLabel}, {dateLabel}</p>

              <section className="dash-box-grid" aria-label="Student attendance summary">
                <div className="dash-box-btn subject-list-card">
                  <div className="dash-box-title">Subjects</div>
                  <div className="subject-list" role="list" aria-label="Subject selector">
                    {isLoadingTimetable ? (
                      <p style={{ color: '#9ca3af', fontSize: '13px', padding: '8px' }}>
                        Loading subjects...
                      </p>
                    ) : subjects.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '13px', padding: '8px' }}>
                        No subjects found. Upload your timetable first.
                      </p>
                    ) : (
                      subjects.map((subject) => {
                        const isActive = selectedSubject === subject;
                        return (
                          <button
                            key={subject}
                            type="button"
                            className={`subject-list-item ${isActive ? 'active' : ''}`}
                            onClick={() => handleSubjectSelect(subject)}
                            role="listitem"
                            aria-pressed={isActive}
                          >
                            <span>{subject}</span>
                            <span className="subject-list-count">
                              {weeklySubjectData[subject]?.attendedLectures || 0}/{weeklySubjectData[subject]?.totalLectures || 0}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <button type="button" className="dash-box-btn">
                  <div className="dash-box-title">Total Lectures</div>
                  <div className="dash-box-content">{totalLectures}</div>
                </button>

                <button type="button" className="dash-box-btn">
                  <div className="dash-box-title">Attended</div>
                  <div className="dash-box-content">{attendedLectures}</div>
                </button>
              </section>

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
                    aria-label={`${selectedSubject || 'Overall'} attendance: ${attendedPercent}% attended`}
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

          {/* ── ATTENDANCE SECTION ────────────────────────────────────────── */}
          {activeSection === 'attendance' && (
            <section className="dash-content-card attendance-view" aria-label="Weekly attendance timetable">
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

              {isLoadingTimetable ? (
                <p style={{ color: '#9ca3af', padding: '20px' }}>Loading timetable...</p>
              ) : timetableWeek.length === 0 ? (
                <p style={{ color: '#9ca3af', padding: '20px' }}>
                  No timetable found. Please upload your timetable image first.
                </p>
              ) : (
                <>
                  <div className="timetable-table-wrap attendance-table-wrap">
                    <table className="timetable-table attendance-table">
                      <thead>
                        <tr>
                          <th scope="col" className="timetable-th-day">Day</th>
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
                              className={isCurrentDay ? 'attendance-tr-active' : 'attendance-tr-inactive'}
                            >
                              <th scope="row" className="timetable-day-cell">{row.day}</th>
                              {['s1', 's2', 's3'].map((field) => {
                                const slotKey   = `${row.day}_${field}`;
                                const checked   = !!slotAttendanceChecked[slotKey];
                                const text      = row[field];
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
                                        <span className="attendance-slot-time-label attendance-slot-time-label--muted">{timeLabel}</span>
                                        <span className="attendance-slot-text attendance-slot-readonly">{text}</span>
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
                                const slotKey   = `${row.day}_${field}`;
                                const checked   = !!slotAttendanceChecked[slotKey];
                                const text      = row[field];
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
                                        <span className="attendance-slot-time-label attendance-slot-time-label--muted">{timeLabel}</span>
                                        <span className="attendance-slot-text attendance-slot-readonly">{text}</span>
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

                  {/* ── NEW: Save attendance button ───────────────────────── */}
                  <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="tt-primary"
                      onClick={saveAttendanceToDatabase}
                      disabled={isSaving}
                      style={{ width: 'auto', padding: '10px 28px' }}
                    >
                      {isSaving ? 'Saving...' : "Save Today's Attendance"}
                    </button>
                    {saveStatus && (
                      <p style={{ margin: 0, fontSize: '13px', color: saveStatusType === 'error' ? '#ef4444' : '#22c55e' }}>
                        {saveStatus}
                      </p>
                    )}
                  </div>
                  {/* ─────────────────────────────────────────────────────── */}
                </>
              )}
            </section>
          )}

          {/* ── TIMETABLE SECTION ─────────────────────────────────────────── */}
          {activeSection === 'timetable' && (
            <section className="dash-content-card timetable-view" aria-label="Timetable section">
              <h2 className="dash-section-title">Timetable</h2>
              <p className="dash-section-subtitle">
                View your weekly timetable loaded from your uploaded timetable image.
              </p>

              {isLoadingTimetable ? (
                <p style={{ color: '#9ca3af', padding: '20px' }}>Loading timetable...</p>
              ) : timetableWeek.length === 0 ? (
                <p style={{ color: '#9ca3af', padding: '20px' }}>
                  No timetable found. Please upload your timetable image first.
                </p>
              ) : (
                <div className="timetable-table-wrap">
                  <table className="timetable-table">
                    <thead>
                      <tr>
                        <th scope="col" className="timetable-th-day">Day</th>
                        <th scope="col">
                          <span className="timetable-time">8:15 – 10:15</span>
                        </th>
                        <th scope="col">
                          <span className="timetable-time">10:30 – 11:30</span>
                        </th>
                        <th scope="col">
                          <span className="timetable-time">11:30 – 12:30</span>
                        </th>
                        <th scope="col" className="timetable-th-lunch">
                          12:30 – 1:15
                          <span className="timetable-lunch-sub">Lunch break</span>
                        </th>
                        <th scope="col">
                          <span className="timetable-time">1:15 – 2:15</span>
                        </th>
                        <th scope="col">
                          <span className="timetable-time">2:15 – 3:15</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {timetableDetailed.map((row, index) => (
                        <tr key={row.day}>
                          <th scope="row" className="timetable-day-cell">{row.day}</th>
                          {['s1', 's2', 's3'].map((slotKey) => {
                            const slot = row[slotKey];
                            return (
                              <td key={slotKey}>
                                {slot ? (
                                  <div className="timetable-subject-cell">
                                    <div className="timetable-subject-name">{slot.subject_name}</div>
                                    <div className="timetable-subject-type">{slot.type}</div>
                                  </div>
                                ) : (
                                  <div className="timetable-subject-cell timetable-empty-cell">
                                    –
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          {index === 0 && (
                            <td rowSpan={5} className="timetable-lunch-cell">
                              <span className="timetable-lunch-inner">
                                Lunch break
                                <span className="timetable-lunch-time">12:30 – 1:15</span>
                              </span>
                            </td>
                          )}
                          {['a1', 'a2'].map((slotKey) => {
                            const slot = row[slotKey];
                            return (
                              <td key={slotKey}>
                                {slot ? (
                                  <div className="timetable-subject-cell">
                                    <div className="timetable-subject-name">{slot.subject_name}</div>
                                    <div className="timetable-subject-type">{slot.type}</div>
                                  </div>
                                ) : (
                                  <div className="timetable-subject-cell timetable-empty-cell">
                                    –
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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