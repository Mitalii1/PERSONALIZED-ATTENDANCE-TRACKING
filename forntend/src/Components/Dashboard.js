import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./Dashboard.css";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const ATTENDANCE_SLOT_TIMES = {
  s1: "8:15 – 10:15",
  s2: "10:30 – 11:30",
  s3: "11:30 – 12:30",
  a1: "1:15 – 2:15",
  a2: "2:15 – 3:15",
};

const ATTENDANCE_SLOT_TIMES_DB = {
  s1: "8:15-10:15",
  s2: "10:30-11:30",
  s3: "11:30-12:30",
  a1: "1:15-2:15",
  a2: "2:15-3:15",
};

function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [isLoadingTimetable, setIsLoadingTimetable] = useState(true);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveStatusType, setSaveStatusType] = useState("success");
  const [isSaving, setIsSaving] = useState(false);

  const [subjectsList, setSubjectsList] = useState([]);
  const [slotSaveState, setSlotSaveState] = useState({});

  const normalizeSubject = (subjectText) => {
    if (!subjectText || !String(subjectText).trim()) return null;
    const cleanup = String(subjectText).trim();
    const removeTokens = [
      "Practical",
      "Lab",
      "Seminar",
      "Project",
      "Elective",
      "Review",
      "Workshop",
      "Session",
      "Tutorial",
      "Class",
      "Lecture",
      "Theory",
    ];
    let normalized = cleanup;
    removeTokens.forEach((token) => {
      normalized = normalized.replace(new RegExp(`\\b${token}\\b`, "gi"), "");
    });
    normalized = normalized.replace(/[-\/]/g, " ").trim();
    normalized = normalized.replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    return normalized;
  };

  const [timetableWeek, setTimetableWeek] = useState([]);
  const [timetableDetailed, setTimetableDetailed] = useState([]);

  useEffect(() => {
    setIsLoadingTimetable(true);
    fetch(`${BACKEND_URL}/api/timetable/week-details/1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.week && data.week.length > 0) {
          setTimetableDetailed(data.week);
          const simpleWeek = data.week.map((row) => ({
            day: row.day,
            s1: row.s1?.subject_name || "",
            s2: row.s2?.subject_name || "",
            s3: row.s3?.subject_name || "",
            a1: row.a1?.subject_name || "",
            a2: row.a2?.subject_name || "",
          }));
          setTimetableWeek(simpleWeek);
        }
      })
      .catch((err) => console.error("Could not load timetable:", err))
      .finally(() => setIsLoadingTimetable(false));
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/subjects/1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSubjectsList(data.subjects);
      })
      .catch((err) => console.error("Could not load subjects:", err));
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/attendance/summary/1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAttendanceSummary(data.summary);
      })
      .catch((err) => console.error("Could not load summary:", err));
  }, [attendanceSaved]);

  const updateSlot = useCallback(
    async (day, slotKey, subjectId) => {
      const indicatorKey = `${day}_${slotKey}`;
      setSlotSaveState((prev) => ({ ...prev, [indicatorKey]: "saving" }));
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/timetable/update-slot`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: 1,
              day,
              slot_key: slotKey,
              subject_id: subjectId,
            }),
          },
        );
        const data = await response.json();
        if (data.success) {
          setSlotSaveState((prev) => ({ ...prev, [indicatorKey]: "saved" }));
          setTimeout(() => {
            setSlotSaveState((prev) => {
              const next = { ...prev };
              delete next[indicatorKey];
              return next;
            });
          }, 2000);
          setTimetableDetailed((prev) =>
            prev.map((row) => {
              if (row.day !== day) return row;
              const updatedSlot =
                subjectId === null
                  ? null
                  : {
                      subject_id: subjectId,
                      subject_name:
                        subjectsList.find((s) => s.id === subjectId)
                          ?.subject_name || "",
                      type:
                        subjectsList.find((s) => s.id === subjectId)?.type ||
                        "Theory",
                      slot_key: slotKey,
                      time_slot: ATTENDANCE_SLOT_TIMES_DB[slotKey],
                    };
              return { ...row, [slotKey]: updatedSlot };
            }),
          );
          setTimetableWeek((prev) =>
            prev.map((row) => {
              if (row.day !== day) return row;
              const subjectName =
                subjectId === null
                  ? ""
                  : subjectsList.find((s) => s.id === subjectId)
                      ?.subject_name || "";
              return { ...row, [slotKey]: subjectName };
            }),
          );
        } else {
          setSlotSaveState((prev) => ({ ...prev, [indicatorKey]: "error" }));
        }
      } catch (err) {
        console.error("Slot update error:", err);
        setSlotSaveState((prev) => ({ ...prev, [indicatorKey]: "error" }));
      }
    },
    [subjectsList],
  );

  const subjects = useMemo(() => {
    const set = new Set();
    timetableWeek.forEach((row) => {
      ["s1", "s2", "s3", "a1", "a2"].forEach((field) => {
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
      ["s1", "s2", "s3", "a1", "a2"].forEach((field) => {
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
      const [day, field] = slotKey.split("_");
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
      const summaryItem = attendanceSummary.find(
        (s) =>
          s.subject_name === sub || normalizeSubject(s.subject_name) === sub,
      );
      if (summaryItem) {
        data[sub] = {
          totalLectures: summaryItem.total_classes,
          attendedLectures: summaryItem.attended_classes,
          missedLectures: Math.max(
            0,
            summaryItem.total_classes - summaryItem.attended_classes,
          ),
          attendedPercent: summaryItem.percentage,
          subjectId: summaryItem.id,
        };
      } else {
        const total = timetableSubjectTotals[sub] || 0;
        const attended = timetableSubjectAttended[sub] || 0;
        data[sub] = {
          totalLectures: total,
          attendedLectures: attended,
          missedLectures: Math.max(0, total - attended),
          attendedPercent:
            total === 0 ? 0 : Math.round((attended / total) * 100),
          subjectId: null,
        };
      }
    });
    return data;
  }, [
    subjects,
    timetableSubjectTotals,
    timetableSubjectAttended,
    attendanceSummary,
  ]);

  const overallTotal = useMemo(() => {
    if (attendanceSummary.length > 0)
      return attendanceSummary.reduce(
        (sum, s) => sum + (s.total_classes || 0),
        0,
      );
    return subjects.reduce(
      (sum, s) => sum + (weeklySubjectData[s]?.totalLectures || 0),
      0,
    );
  }, [attendanceSummary, subjects, weeklySubjectData]);

  const overallAttended = useMemo(() => {
    if (attendanceSummary.length > 0)
      return attendanceSummary.reduce(
        (sum, s) => sum + (s.attended_classes || 0),
        0,
      );
    return subjects.reduce(
      (sum, s) => sum + (weeklySubjectData[s]?.attendedLectures || 0),
      0,
    );
  }, [attendanceSummary, subjects, weeklySubjectData]);

  const currentStats = selectedSubject
    ? weeklySubjectData[selectedSubject] || {
        totalLectures: 0,
        attendedLectures: 0,
      }
    : { totalLectures: overallTotal, attendedLectures: overallAttended };

  const totalLectures = currentStats.totalLectures;
  const attendedLectures = currentStats.attendedLectures;
  const missedLectures =
    currentStats.totalLectures - currentStats.attendedLectures;
  const attendedPercent =
    currentStats.totalLectures === 0
      ? 0
      : Math.round(
          (currentStats.attendedLectures / currentStats.totalLectures) * 100,
        );
  const missedPercent = 100 - attendedPercent;

  const now = new Date();
  const dayLabel = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = now.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const attendanceDateBoxes = useMemo(() => {
    const d = new Date();
    return {
      month: d.toLocaleDateString("en-US", { month: "long" }),
      day: d.getDate(),
    };
  }, []);

  const ATTENDANCE_TARGET = 75;

  const classesNeededForTarget = useMemo(() => {
    if (totalLectures === 0) return 0;
    const needed = 3 * totalLectures - 4 * attendedLectures;
    return needed > 0 ? needed : 0;
  }, [totalLectures, attendedLectures]);

  const safeBunks = useMemo(() => {
    if (totalLectures === 0) return 0;
    const possible = Math.floor(attendedLectures / 0.75 - totalLectures);
    return possible > 0 ? possible : 0;
  }, [totalLectures, attendedLectures]);

  const riskSubjects = useMemo(() => {
    return subjects
      .map((sub) => {
        const stats = weeklySubjectData[sub] || {};
        return {
          name: sub,
          total: stats.totalLectures || 0,
          attended: stats.attendedLectures || 0,
          percent: stats.attendedPercent || 0,
        };
      })
      .filter((sub) => sub.total > 0 && sub.percent < ATTENDANCE_TARGET)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 4);
  }, [subjects, weeklySubjectData]);

  const todayRow = timetableWeek.find((r) => r.day === dayLabel) || null;

  const todaySlots = useMemo(() => {
    if (!todayRow) return [];
    return ["s1", "s2", "s3", "a1", "a2"]
      .map((slot) => ({
        slot,
        time: ATTENDANCE_SLOT_TIMES[slot],
        subject: todayRow[slot],
      }))
      .filter((item) => item.subject);
  }, [todayRow]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const slotStartMinutes = {
    s1: 8 * 60 + 15,
    s2: 10 * 60 + 30,
    s3: 11 * 60 + 30,
    a1: 13 * 60 + 15,
    a2: 14 * 60 + 15,
  };

  const nextClassToday = useMemo(() => {
    if (!todayRow) return null;
    for (const slot of ["s1", "s2", "s3", "a1", "a2"]) {
      const subject = todayRow[slot];
      if (!subject) continue;
      if (slotStartMinutes[slot] >= nowMinutes) {
        return { slot, subject, time: ATTENDANCE_SLOT_TIMES[slot] };
      }
    }
    return null;
  }, [todayRow, nowMinutes]);

  const toggleSlotAttendance = (day, field) => {
    if (day !== dayLabel) return;
    const key = `${day}_${field}`;
    setSlotAttendanceChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubjectSelect = (subject) => setSelectedSubject(subject);

  async function saveAttendanceToDatabase() {
    setSaveStatus("");
    setIsSaving(true);
    const todayRow = timetableWeek.find((r) => r.day === dayLabel);
    if (!todayRow) {
      setSaveStatus("No classes found for today.");
      setSaveStatusType("error");
      setIsSaving(false);
      return;
    }
    const records = [];
    ["s1", "s2", "s3", "a1", "a2"].forEach((field) => {
      const subjectName = todayRow[field];
      if (!subjectName) return;
      const slotKey = `${dayLabel}_${field}`;
      const isChecked = !!slotAttendanceChecked[slotKey];
      const todayDetailed = timetableDetailed.find((r) => r.day === dayLabel);
      const subjectId = todayDetailed?.[field]?.subject_id || null;
      records.push({
        subject_id: subjectId,
        subject_name: subjectName,
        slot_key: field,
        time_slot: ATTENDANCE_SLOT_TIMES_DB[field],
        status: isChecked ? "Present" : "Absent",
      });
    });
    if (records.length === 0) {
      setSaveStatus("No classes scheduled for today.");
      setSaveStatusType("error");
      setIsSaving(false);
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: 1, records }),
      });
      const data = await response.json();
      if (data.success) {
        setSaveStatus(`✅ ${data.message}`);
        setSaveStatusType("success");
        setAttendanceSaved((prev) => !prev);
      } else {
        setSaveStatus(`Error: ${data.error}`);
        setSaveStatusType("error");
      }
    } catch (err) {
      setSaveStatus(`Could not reach server: ${err.message}`);
      setSaveStatusType("error");
    } finally {
      setIsSaving(false);
    }
  }

  const SlotDropdown = ({ day, slotKey, currentSubjectId }) => {
    const indicatorKey = `${day}_${slotKey}`;
    const state = slotSaveState[indicatorKey];
    return (
      <div className="tt-slot-dropdown-wrap">
        <select
          className="tt-slot-select"
          value={currentSubjectId ?? ""}
          onChange={(e) => {
            const val =
              e.target.value === "" ? null : parseInt(e.target.value, 10);
            updateSlot(day, slotKey, val);
          }}
        >
          <option value="">— No class —</option>
          {subjectsList.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.subject_name} ({sub.type})
            </option>
          ))}
        </select>
        {state === "saving" && (
          <span className="tt-slot-indicator tt-slot-saving">saving…</span>
        )}
        {state === "saved" && (
          <span className="tt-slot-indicator tt-slot-saved">✓ saved</span>
        )}
        {state === "error" && (
          <span className="tt-slot-indicator tt-slot-error">✕ error</span>
        )}
      </div>
    );
  };

  // Shared thead for both timetable and attendance tables
  const TableHead = () => (
    <thead>
      <tr>
        <th scope="col" className="timetable-th-day">
          DAY
        </th>
        <th scope="col">
          <span className="timetable-time">8:15 – 10:15</span>
        </th>
        <th scope="col" className="timetable-th-break">
          10:15 – 10:30<span className="timetable-lunch-sub">Break</span>
        </th>
        <th scope="col">
          <span className="timetable-time">10:30 – 11:30</span>
        </th>
        <th scope="col">
          <span className="timetable-time">11:30 – 12:30</span>
        </th>
        <th scope="col" className="timetable-th-lunch">
          12:30 – 1:15<span className="timetable-lunch-sub">Lunch break</span>
        </th>
        <th scope="col">
          <span className="timetable-time">1:15 – 2:15</span>
        </th>
        <th scope="col">
          <span className="timetable-time">2:15 – 3:15</span>
        </th>
      </tr>
    </thead>
  );

  return (
    <div className="dash">
      <div className={`dash-shell ${sidebarOpen ? "sidebar-open" : ""}`}>
        <aside className="dash-sidebar" aria-label="Dashboard sidebar">
          <div className="sidebar-title" aria-label="Sidebar logo">
            <div className="dash-logo sidebar-logo">
              <svg
                className="dash-logo-cat"
                viewBox="0 0 64 64"
                role="img"
                aria-label="Cat face with glasses"
              >
                <path
                  d="M16 24l4-10 8 7M48 24l-4-10-8 7"
                  fill="none"
                  stroke="#063447"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="32" cy="34" r="15" fill="#d8f4ff" />
                <circle
                  cx="25.5"
                  cy="33.5"
                  r="5"
                  fill="none"
                  stroke="#063447"
                  strokeWidth="2.7"
                />
                <circle
                  cx="38.5"
                  cy="33.5"
                  r="5"
                  fill="none"
                  stroke="#063447"
                  strokeWidth="2.7"
                />
                <line
                  x1="30.5"
                  y1="33.5"
                  x2="33.5"
                  y2="33.5"
                  stroke="#063447"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle cx="25.5" cy="33.5" r="1.6" fill="#063447" />
                <circle cx="38.5" cy="33.5" r="1.6" fill="#063447" />
                <path d="M32 37.5l-2 2h4z" fill="#063447" />
                <path
                  d="M28.2 42c1.4 1.5 2.5 2.1 3.8 2.1S34.4 43.5 35.8 42"
                  fill="none"
                  stroke="#063447"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <line
                  x1="22.5"
                  y1="38.5"
                  x2="17.8"
                  y2="37.2"
                  stroke="#063447"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="22.8"
                  y1="40.8"
                  x2="17.3"
                  y2="41.2"
                  stroke="#063447"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="41.5"
                  y1="38.5"
                  x2="46.2"
                  y2="37.2"
                  stroke="#063447"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="41.2"
                  y1="40.8"
                  x2="46.7"
                  y2="41.2"
                  stroke="#063447"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="sidebar-items">
            <button
              type="button"
              className={`menu-item ${activeSection === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveSection("dashboard")}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M12 3a9 9 0 1 0 9 9h-9z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 3v9h9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="menu-item-label">Dashboard</span>
            </button>
            <button
              type="button"
              className={`menu-item ${activeSection === "attendance" ? "active" : ""}`}
              onClick={() => setActiveSection("attendance")}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M8 20v-9.5a1 1 0 0 1 2 0V14m0-5.5a1 1 0 0 1 2 0V14m0-4.5a1 1 0 0 1 2 0V14m0-3a1 1 0 0 1 2 0v6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 14l-1.5-1.2a1 1 0 0 0-1.4.2l-.3.4a1 1 0 0 0 .1 1.3l2.5 2.6A5 5 0 0 0 11 19h3.5a4.5 4.5 0 0 0 4.5-4.5V14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="menu-item-label">Attendance</span>
            </button>
            <button
              type="button"
              className={`menu-item ${activeSection === "timetable" ? "active" : ""}`}
              onClick={() => setActiveSection("timetable")}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect
                    x="4"
                    y="5"
                    width="16"
                    height="15"
                    rx="2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 3.8v2.4M16 3.8v2.4M4 9h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 12.5h2.5M13.5 12.5H16M8 16h2.5M13.5 16H16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="menu-item-label">Timetable</span>
            </button>
          </div>
        </aside>

        <div className="dash-content">
          {/* ── DASHBOARD SECTION ── */}
          {activeSection === "dashboard" && (
            <section className="dash-main-screen">
              <section className="dash-hero-card">
                <div>
                  <h1 className="dash-title">Dashboard</h1>
                  <p className="dash-date">
                    {dayLabel}, {dateLabel}
                  </p>
                  <p className="dash-focus-chip">
                    Focus: {selectedSubject || "Overall attendance"}
                  </p>
                </div>
                <div className="dash-hero-actions">
                  <button
                    type="button"
                    className="dash-chip-btn"
                    onClick={() => setActiveSection("attendance")}
                  >
                    Mark Today
                  </button>
                  <button
                    type="button"
                    className="dash-chip-btn"
                    onClick={() => setActiveSection("timetable")}
                  >
                    Edit Timetable
                  </button>
                  <button
                    type="button"
                    className="dash-chip-btn"
                    onClick={() => setSelectedSubject(null)}
                  >
                    Clear Focus
                  </button>
                </div>
              </section>

              <section
                className="dash-box-grid"
                aria-label="Student attendance summary"
              >
                <div className="dash-box-btn subject-list-card">
                  <div className="dash-box-title">Subjects</div>
                  <div className="subject-list" role="list">
                    {isLoadingTimetable ? (
                      <p
                        style={{
                          color: "#9ca3af",
                          fontSize: "13px",
                          padding: "8px",
                        }}
                      >
                        Loading subjects...
                      </p>
                    ) : subjects.length === 0 ? (
                      <p
                        style={{
                          color: "#9ca3af",
                          fontSize: "13px",
                          padding: "8px",
                        }}
                      >
                        No subjects found. Upload your timetable first.
                      </p>
                    ) : (
                      subjects.map((subject) => {
                        const isActive = selectedSubject === subject;
                        return (
                          <button
                            key={subject}
                            type="button"
                            className={`subject-list-item ${isActive ? "active" : ""}`}
                            onClick={() => handleSubjectSelect(subject)}
                            role="listitem"
                            aria-pressed={isActive}
                          >
                            <span>{subject}</span>
                            <span className="subject-list-count">
                              {weeklySubjectData[subject]?.attendedLectures ||
                                0}
                              /{weeklySubjectData[subject]?.totalLectures || 0}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
                <button type="button" className="dash-box-btn dash-box-btn--stat">
                  <div className="dash-box-title">Attendance</div>
                  <div className="dash-box-content">{attendedPercent}%</div>
                  <p className="dash-card-subline">
                    {attendedLectures}/{totalLectures} lectures attended
                  </p>
                </button>
                <button type="button" className="dash-box-btn dash-box-btn--stat">
                  <div className="dash-box-title">Goal Tracker</div>
                  <div className="dash-box-content">
                    {classesNeededForTarget > 0
                      ? `${classesNeededForTarget}`
                      : `${safeBunks}`}
                  </div>
                  <p className="dash-card-subline">
                    {classesNeededForTarget > 0
                      ? "Classes needed to reach 75%"
                      : "Safe bunk classes while staying at 75%"}
                  </p>
                </button>
              </section>
              <section className="dash-chart-card">
                <h2 className="dash-chart-title">
                  {selectedSubject
                    ? `${selectedSubject} Attendance`
                    : "Weekly Attendance"}
                </h2>
                <div className="dash-chart-wrap">
                  <div
                    className="attendance-ring"
                    style={{
                      background: `conic-gradient(#22d3ee ${attendedPercent}%, #1e293b ${attendedPercent}% 100%)`,
                    }}
                    role="img"
                    aria-label={`${selectedSubject || "Overall"} attendance: ${attendedPercent}%`}
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

              <section className="dash-insights-grid">
                <article className="dash-insight-card">
                  <h3 className="dash-insight-title">Today Plan</h3>
                  <p className="dash-insight-subtitle">
                    {todaySlots.length > 0
                      ? `${todaySlots.length} classes scheduled for ${dayLabel}`
                      : "No classes scheduled today"}
                  </p>
                  <div className="dash-plan-list" role="list">
                    {todaySlots.length === 0 ? (
                      <p className="dash-empty-note">Enjoy your free day.</p>
                    ) : (
                      todaySlots.map((item) => (
                        <button
                          key={item.slot}
                          type="button"
                          className="dash-plan-item"
                          onClick={() => {
                            const normalized = normalizeSubject(item.subject);
                            if (normalized) setSelectedSubject(normalized);
                          }}
                          role="listitem"
                        >
                          <span className="dash-plan-time">{item.time}</span>
                          <span className="dash-plan-subject">{item.subject}</span>
                        </button>
                      ))
                    )}
                  </div>
                  {nextClassToday && (
                    <div className="dash-next-class">
                      Next: {nextClassToday.subject} ({nextClassToday.time})
                    </div>
                  )}
                </article>

                <article className="dash-insight-card">
                  <h3 className="dash-insight-title">Risk Monitor</h3>
                  <p className="dash-insight-subtitle">
                    Subjects below {ATTENDANCE_TARGET}% target
                  </p>
                  <div className="dash-risk-list" role="list">
                    {riskSubjects.length === 0 ? (
                      <p className="dash-empty-note">
                        Great work. No subject is below target.
                      </p>
                    ) : (
                      riskSubjects.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          className="dash-risk-item"
                          onClick={() => setSelectedSubject(item.name)}
                          role="listitem"
                        >
                          <span className="dash-risk-name">{item.name}</span>
                          <span className="dash-risk-badge">{item.percent}%</span>
                        </button>
                      ))
                    )}
                  </div>
                </article>
              </section>
            </section>
          )}

          {/* ── ATTENDANCE SECTION ── */}
          {activeSection === "attendance" && (
            <section className="dash-content-card attendance-view">
              <div className="attendance-section-header">
                <div>
                  <h2 className="dash-section-title attendance-section-title">
                    Attendance
                  </h2>
                  <p className="dash-section-subtitle attendance-section-subtitle">
                    Only today's row is active — use checkboxes to mark lectures
                    attended.
                  </p>
                </div>
                <div className="attendance-date-boxes">
                  <div className="attendance-date-box">
                    <span className="attendance-date-box-label">Month</span>
                    <span className="attendance-date-box-value">
                      {attendanceDateBoxes.month}
                    </span>
                  </div>
                  <div className="attendance-date-box">
                    <span className="attendance-date-box-label">Day</span>
                    <span className="attendance-date-box-value">
                      {attendanceDateBoxes.day}
                    </span>
                  </div>
                </div>
              </div>

              {isLoadingTimetable ? (
                <p style={{ color: "#9ca3af", padding: "20px" }}>
                  Loading timetable...
                </p>
              ) : timetableWeek.length === 0 ? (
                <p style={{ color: "#9ca3af", padding: "20px" }}>
                  No timetable found. Please upload your timetable image first.
                </p>
              ) : (
                <>
                  <div className="timetable-table-wrap attendance-table-wrap">
                    <table className="timetable-table attendance-table">
                      <TableHead />
                      <tbody>
                        {timetableWeek.map((row, index) => {
                          const isCurrentDay = row.day === dayLabel;
                          const isFriday = row.day === "Friday";
                          return (
                            <tr
                              key={row.day}
                              className={
                                isCurrentDay
                                  ? "attendance-tr-active"
                                  : "attendance-tr-inactive"
                              }
                            >
                              <th scope="row" className="timetable-day-cell">
                                {row.day}
                              </th>

                              {/* s1 slot */}
                              {isFriday ? (
                                // Friday: s1 limited to 8:15-10:15 practical only
                                <td
                                  colSpan={1}
                                  className="friday-practical-cell"
                                >
                                  {isCurrentDay ? (
                                    <div className="attendance-slot-inner">
                                      <span className="attendance-slot-time-label">
                                        8:15 – 10:15 (Practical)
                                      </span>
                                      <label className="attendance-slot-label">
                                        <input
                                          type="checkbox"
                                          className="attendance-slot-checkbox"
                                          checked={
                                            !!slotAttendanceChecked[
                                              `${row.day}_s1`
                                            ]
                                          }
                                          onChange={() =>
                                            toggleSlotAttendance(row.day, "s1")
                                          }
                                        />
                                        <span className="attendance-slot-text">
                                          {row.s1 || "—"}
                                        </span>
                                      </label>
                                    </div>
                                  ) : (
                                    <div className="attendance-slot-inner attendance-slot-inner--readonly">
                                      <span className="attendance-slot-time-label attendance-slot-time-label--muted">
                                        8:15 – 10:15 (Practical)
                                      </span>
                                      <span className="attendance-slot-text attendance-slot-readonly">
                                        {row.s1 || "—"}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              ) : (
                                // Normal days: s1, break col, s2, s3
                                <>
                                  <td>
                                    {isCurrentDay ? (
                                      <div className="attendance-slot-inner">
                                        <span className="attendance-slot-time-label">
                                          {ATTENDANCE_SLOT_TIMES.s1}
                                        </span>
                                        <label className="attendance-slot-label">
                                          <input
                                            type="checkbox"
                                            className="attendance-slot-checkbox"
                                            checked={
                                              !!slotAttendanceChecked[
                                                `${row.day}_s1`
                                              ]
                                            }
                                            onChange={() =>
                                              toggleSlotAttendance(
                                                row.day,
                                                "s1",
                                              )
                                            }
                                          />
                                          <span className="attendance-slot-text">
                                            {row.s1 || "—"}
                                          </span>
                                        </label>
                                      </div>
                                    ) : (
                                      <div className="attendance-slot-inner attendance-slot-inner--readonly">
                                        <span className="attendance-slot-time-label attendance-slot-time-label--muted">
                                          {ATTENDANCE_SLOT_TIMES.s1}
                                        </span>
                                        <span className="attendance-slot-text attendance-slot-readonly">
                                          {row.s1 || "—"}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                </>
                              )}

                              {/* Break column — rowspan on first row only */}
                              {index === 0 && (
                                <td
                                  rowSpan={5}
                                  className="timetable-break-cell"
                                >
                                  <span className="timetable-lunch-inner">
                                    Break
                                    <span className="timetable-lunch-time">
                                      10:15 – 10:30
                                    </span>
                                  </span>
                                </td>
                              )}

                              {/* s2, s3 for non-Friday; s2 for Friday */}
                              {isFriday && (
                                <td>
                                  {isCurrentDay ? (
                                    <div className="attendance-slot-inner">
                                      <span className="attendance-slot-time-label">
                                        10:10 – 12:30 (Practical)
                                      </span>
                                      <label className="attendance-slot-label">
                                        <input
                                          type="checkbox"
                                          className="attendance-slot-checkbox"
                                          checked={
                                            !!slotAttendanceChecked[
                                              `${row.day}_s2`
                                            ]
                                          }
                                          onChange={() =>
                                            toggleSlotAttendance(row.day, "s2")
                                          }
                                        />
                                        <span className="attendance-slot-text">
                                          {row.s2 || "—"}
                                        </span>
                                      </label>
                                    </div>
                                  ) : (
                                    <div className="attendance-slot-inner attendance-slot-inner--readonly">
                                      <span className="attendance-slot-time-label attendance-slot-time-label--muted">
                                        10:10 – 12:30 (Practical)
                                      </span>
                                      <span className="attendance-slot-text attendance-slot-readonly">
                                        {row.s2 || "—"}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              )}
                              {!isFriday &&
                                ["s2", "s3"].map((field) => (
                                  <td key={field}>
                                    {isCurrentDay ? (
                                      <div className="attendance-slot-inner">
                                        <span className="attendance-slot-time-label">
                                          {ATTENDANCE_SLOT_TIMES[field]}
                                        </span>
                                        <label className="attendance-slot-label">
                                          <input
                                            type="checkbox"
                                            className="attendance-slot-checkbox"
                                            checked={
                                              !!slotAttendanceChecked[
                                                `${row.day}_${field}`
                                              ]
                                            }
                                            onChange={() =>
                                              toggleSlotAttendance(
                                                row.day,
                                                field,
                                              )
                                            }
                                          />
                                          <span className="attendance-slot-text">
                                            {row[field] || "—"}
                                          </span>
                                        </label>
                                      </div>
                                    ) : (
                                      <div className="attendance-slot-inner attendance-slot-inner--readonly">
                                        <span className="attendance-slot-time-label attendance-slot-time-label--muted">
                                          {ATTENDANCE_SLOT_TIMES[field]}
                                        </span>
                                        <span className="attendance-slot-text attendance-slot-readonly">
                                          {row[field] || "—"}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                ))}

                              {/* Lunch column — rowspan on first row only */}
                              {index === 0 && (
                                <td
                                  rowSpan={5}
                                  className="timetable-lunch-cell attendance-lunch-col"
                                >
                                  <span className="timetable-lunch-inner">
                                    Lunch break
                                    <span className="timetable-lunch-time">
                                      12:30 – 1:15
                                    </span>
                                  </span>
                                </td>
                              )}

                              {/* a1, a2 */}
                              {["a1", "a2"].map((field) => (
                                <td key={field}>
                                  {isCurrentDay ? (
                                    <div className="attendance-slot-inner">
                                      <span className="attendance-slot-time-label">
                                        {ATTENDANCE_SLOT_TIMES[field]}
                                      </span>
                                      <label className="attendance-slot-label">
                                        <input
                                          type="checkbox"
                                          className="attendance-slot-checkbox"
                                          checked={
                                            !!slotAttendanceChecked[
                                              `${row.day}_${field}`
                                            ]
                                          }
                                          onChange={() =>
                                            toggleSlotAttendance(row.day, field)
                                          }
                                        />
                                        <span className="attendance-slot-text">
                                          {row[field] || "—"}
                                        </span>
                                      </label>
                                    </div>
                                  ) : (
                                    <div className="attendance-slot-inner attendance-slot-inner--readonly">
                                      <span className="attendance-slot-time-label attendance-slot-time-label--muted">
                                        {ATTENDANCE_SLOT_TIMES[field]}
                                      </span>
                                      <span className="attendance-slot-text attendance-slot-readonly">
                                        {row[field] || "—"}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div
                    style={{
                      marginTop: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="tt-primary"
                      onClick={saveAttendanceToDatabase}
                      disabled={isSaving}
                      style={{ width: "auto", padding: "10px 28px" }}
                    >
                      {isSaving ? "Saving..." : "Save Today's Attendance"}
                    </button>
                    {saveStatus && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color:
                            saveStatusType === "error" ? "#ef4444" : "#22c55e",
                        }}
                      >
                        {saveStatus}
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ── TIMETABLE SECTION ── */}
          {activeSection === "timetable" && (
            <section className="dash-content-card timetable-view">
              <h2 className="dash-section-title">Timetable</h2>
              <p className="dash-section-subtitle">
                Select subjects from the dropdown for each slot. Changes save
                automatically.
              </p>

              {isLoadingTimetable ? (
                <p style={{ color: "#9ca3af", padding: "20px" }}>
                  Loading timetable...
                </p>
              ) : subjectsList.length === 0 ? (
                <p style={{ color: "#9ca3af", padding: "20px" }}>
                  No subjects found. Please upload your timetable image first.
                </p>
              ) : (
                <div className="timetable-table-wrap">
                  <table className="timetable-table">
                    <TableHead />
                    <tbody>
                      {timetableDetailed.map((row, index) => {
                        const isFriday = row.day === "Friday";
                        return (
                          <tr key={row.day}>
                            <th scope="row" className="timetable-day-cell">
                              {row.day}
                            </th>

                            {/* s1 */}
                            <td
                              className={
                                isFriday ? "friday-practical-cell" : ""
                              }
                            >
                              <SlotDropdown
                                day={row.day}
                                slotKey="s1"
                                currentSubjectId={row["s1"]?.subject_id ?? null}
                              />
                              {isFriday && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--text-muted)",
                                    display: "block",
                                    marginTop: "4px",
                                  }}
                                >
                                  8:15 - 10:15 (Practical)
                                </span>
                              )}
                            </td>

                            {/* Break — rowspan on first row only */}
                            {index === 0 && (
                              <td rowSpan={5} className="timetable-break-cell">
                                <span className="timetable-lunch-inner">
                                  Break
                                  <span className="timetable-lunch-time">
                                    10:15 – 10:30
                                  </span>
                                </span>
                              </td>
                            )}

                            {/* s2, s3 */}
                            {isFriday ? (
                              <td colSpan={2} className="friday-practical-cell">
                                <SlotDropdown
                                  day={row.day}
                                  slotKey="s2"
                                  currentSubjectId={
                                    row["s2"]?.subject_id ?? null
                                  }
                                />
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--text-muted)",
                                    display: "block",
                                    marginTop: "4px",
                                  }}
                                >
                                  10:30 - 12:30 (Practical)
                                </span>
                              </td>
                            ) : (
                              ["s2", "s3"].map((slotKey) => (
                                <td key={slotKey}>
                                  <SlotDropdown
                                    day={row.day}
                                    slotKey={slotKey}
                                    currentSubjectId={
                                      row[slotKey]?.subject_id ?? null
                                    }
                                  />
                                </td>
                              ))
                            )}

                            {/* Lunch — rowspan on first row only */}
                            {index === 0 && (
                              <td rowSpan={5} className="timetable-lunch-cell">
                                <span className="timetable-lunch-inner">
                                  Lunch break
                                  <span className="timetable-lunch-time">
                                    12:30 – 1:15
                                  </span>
                                </span>
                              </td>
                            )}

                            {/* a1, a2 */}
                            {["a1", "a2"].map((slotKey) => (
                              <td key={slotKey}>
                                <SlotDropdown
                                  day={row.day}
                                  slotKey={slotKey}
                                  currentSubjectId={
                                    row[slotKey]?.subject_id ?? null
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
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
