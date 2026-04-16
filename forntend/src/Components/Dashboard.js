import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./Dashboard.css";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const COMPACT_TABLES_STORAGE_KEY = "pat-compact-tables";

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

const SLOT_START_MINUTES = {
  s1: 8 * 60 + 15,
  s2: 10 * 60 + 30,
  s3: 11 * 60 + 30,
  a1: 13 * 60 + 15,
  a2: 14 * 60 + 15,
};

const SIMULATED_DETECTED_SUBJECTS = [
  "Advanced Data Structures and Algorithms",
  "Programming in Java",
  "Data Communication and Computer Network",
  "Applied Mathematics and Computational Statistics",
  "Computer Networks Lab",
  "PDL Practical",
];

function Dashboard({ currentUser, onGoToTimetable, onLogout }) {
  const userId = currentUser?.id;
  const userName = currentUser?.name || "Student";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "S";
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [compactTables, setCompactTables] = useState(() => {
    try {
      return localStorage.getItem(COMPACT_TABLES_STORAGE_KEY) === "true";
    } catch (_err) {
      return false;
    }
  });
  const [liveClock, setLiveClock] = useState(new Date());
  const [notificationCount] = useState(3);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [detectedSubjects, setDetectedSubjects] = useState([]);

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
    normalized = normalized.replace(/[-/]/g, " ").trim();
    normalized = normalized.replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    return normalized;
  };

  const [timetableWeek, setTimetableWeek] = useState([]);
  const [timetableDetailed, setTimetableDetailed] = useState([]);

  useEffect(() => {
    try {
      localStorage.setItem(
        COMPACT_TABLES_STORAGE_KEY,
        compactTables ? "true" : "false",
      );
    } catch (_err) {
      // Ignore storage errors (private mode or restricted storage).
    }
  }, [compactTables]);

  useEffect(() => {
    if (!userId) {
      setIsLoadingTimetable(false);
      return;
    }
    setIsLoadingTimetable(true);
    fetch(`${BACKEND_URL}/api/timetable/week-details/${userId}`)
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
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetch(`${BACKEND_URL}/api/subjects/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSubjectsList(data.subjects);
      })
      .catch((err) => console.error("Could not load subjects:", err));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetch(`${BACKEND_URL}/api/attendance/summary/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAttendanceSummary(data.summary);
      })
      .catch((err) => console.error("Could not load summary:", err));
  }, [attendanceSaved, userId]);

  const updateSlot = useCallback(
    async (day, slotKey, subjectId) => {
      const indicatorKey = `${day}_${slotKey}`;
      if (!userId) {
        setSlotSaveState((prev) => ({ ...prev, [indicatorKey]: "error" }));
        return;
      }
      setSlotSaveState((prev) => ({ ...prev, [indicatorKey]: "saving" }));
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/timetable/update-slot`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
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
    [subjectsList, userId],
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

  const filteredSubjects = useMemo(() => {
    const query = subjectSearch.trim().toLowerCase();
    if (!query) return subjects;
    return subjects.filter((subject) => subject.toLowerCase().includes(query));
  }, [subjects, subjectSearch]);

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

  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const dayLabel = liveClock.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const dateLabel = liveClock.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = liveClock.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
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

  const targetProgressPercent = useMemo(() => {
    if (totalLectures === 0) return 0;
    return Math.min(
      100,
      Math.round((attendedPercent / ATTENDANCE_TARGET) * 100),
    );
  }, [totalLectures, attendedPercent]);

  const greetingText = useMemo(() => {
    const hour = liveClock.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [liveClock]);

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

  const nowMinutes = liveClock.getHours() * 60 + liveClock.getMinutes();

  const nextClassToday = useMemo(() => {
    if (!todayRow) return null;
    for (const slot of ["s1", "s2", "s3", "a1", "a2"]) {
      const subject = todayRow[slot];
      if (!subject) continue;
      if (SLOT_START_MINUTES[slot] >= nowMinutes) {
        return { slot, subject, time: ATTENDANCE_SLOT_TIMES[slot] };
      }
    }
    return null;
  }, [todayRow, nowMinutes]);

  const weeklyHeatmap = useMemo(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    return days.map((day) => {
      const row = timetableWeek.find((item) => item.day === day);
      const total = row
        ? ["s1", "s2", "s3", "a1", "a2"].filter((slot) => !!row[slot]).length
        : 0;
      return {
        day,
        total,
        intensity: Math.min(1, total / 5),
      };
    });
  }, [timetableWeek]);

  useEffect(() => {
    if (!selectedHeatmapDay) {
      setSelectedHeatmapDay(dayLabel);
    }
  }, [selectedHeatmapDay, dayLabel]);

  const selectedHeatmapData = useMemo(
    () => weeklyHeatmap.find((item) => item.day === selectedHeatmapDay) || null,
    [weeklyHeatmap, selectedHeatmapDay],
  );

  const busiestHeatmapDay = useMemo(() => {
    if (weeklyHeatmap.length === 0) return null;
    return [...weeklyHeatmap].sort((a, b) => b.total - a.total)[0];
  }, [weeklyHeatmap]);

  const analyticsTrend = useMemo(() => {
    const horizon = 6;
    const a = overallAttended || 0;
    const t = overallTotal || 0;
    const rows = [];
    for (let step = 0; step <= horizon; step += 1) {
      const totalAtStep = t + step;
      const attendPct =
        totalAtStep === 0
          ? 0
          : Number((((a + step) / totalAtStep) * 100).toFixed(1));
      const missPct =
        totalAtStep === 0 ? 0 : Number(((a / totalAtStep) * 100).toFixed(1));
      rows.push({
        label: step === 0 ? "Now" : `+${step}`,
        attendPct,
        missPct,
      });
    }
    return rows;
  }, [overallAttended, overallTotal]);

  const subjectRiskForecasts = useMemo(() => {
    const upcomingToday = new Set(
      todaySlots
        .map((item) => normalizeSubject(item.subject))
        .filter((item) => !!item),
    );

    return subjects
      .map((sub) => {
        const stats = weeklySubjectData[sub] || {};
        const total = stats.totalLectures || 0;
        const attended = stats.attendedLectures || 0;
        if (total <= 0) return null;

        const percent =
          total === 0 ? 0 : Number(((attended / total) * 100).toFixed(1));
        const needed = Math.max(0, 3 * total - 4 * attended);
        const attendNext = Number(
          (((attended + 1) / (total + 1)) * 100).toFixed(1),
        );
        const missNext = Number(((attended / (total + 1)) * 100).toFixed(1));
        const deficit = Math.max(0, ATTENDANCE_TARGET - percent);
        const urgencyScore =
          needed * 9 + deficit * 2 + (upcomingToday.has(sub) ? 10 : 0);

        let riskLevel = "Low";
        if (percent < 60) riskLevel = "High";
        else if (percent < ATTENDANCE_TARGET) riskLevel = "Medium";

        return {
          subject: sub,
          total,
          attended,
          percent,
          needed,
          attendNext,
          missNext,
          riskLevel,
          urgencyScore,
          isTodayUpcoming: upcomingToday.has(sub),
        };
      })
      .filter((item) => !!item)
      .sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [subjects, weeklySubjectData, todaySlots]);

  const analyticsSuggestions = useMemo(() => {
    const shortlist = subjectRiskForecasts
      .filter((item) => item.needed > 0 || item.riskLevel !== "Low")
      .slice(0, 4);

    if (shortlist.length === 0) {
      return [
        {
          subject: "Overall",
          message:
            "You are currently on track. Prioritize consistency across all classes.",
          level: "Low",
          needed: 0,
          tag: "Stable",
        },
      ];
    }

    return shortlist.map((item) => {
      const attendHint =
        item.needed > 0
          ? `Attend next ${item.needed} classes to recover toward ${ATTENDANCE_TARGET}%.`
          : "Maintain attendance streak to stay above target.";
      const timingHint = item.isTodayUpcoming
        ? "This subject appears in today's schedule."
        : "Pick this subject in the next available slot.";

      return {
        subject: item.subject,
        message: `${attendHint} ${timingHint}`,
        level: item.riskLevel,
        needed: item.needed,
        tag: item.isTodayUpcoming ? "Today" : "Upcoming",
      };
    });
  }, [subjectRiskForecasts]);

  const analyticsChartModel = useMemo(() => {
    if (analyticsTrend.length === 0) {
      return {
        attendPoints: "",
        missPoints: "",
        labels: [],
        minY: 0,
        maxY: 100,
      };
    }

    const allValues = analyticsTrend.flatMap((p) => [p.attendPct, p.missPct]);
    const rawMin = Math.max(0, Math.floor(Math.min(...allValues) - 3));
    const rawMax = Math.min(100, Math.ceil(Math.max(...allValues) + 3));
    const minY = rawMin;
    const maxY = rawMax <= rawMin ? rawMin + 1 : rawMax;
    const width = 720;
    const height = 260;
    const padX = 36;
    const padY = 22;

    const toPointString = (key) => {
      return analyticsTrend
        .map((point, idx) => {
          const x =
            padX +
            ((width - padX * 2) * idx) / Math.max(1, analyticsTrend.length - 1);
          const ratio = (point[key] - minY) / (maxY - minY);
          const y = height - padY - ratio * (height - padY * 2);
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ");
    };

    return {
      attendPoints: toPointString("attendPct"),
      missPoints: toPointString("missPct"),
      labels: analyticsTrend,
      minY,
      maxY,
    };
  }, [analyticsTrend]);

  const toggleSlotAttendance = (day, field) => {
    if (day !== dayLabel) return;
    const key = `${day}_${field}`;
    setSlotAttendanceChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navigateToSection = (section) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  const handleSubjectSelect = (subject) => setSelectedSubject(subject);

  const runSimulatedUpload = useCallback(() => {
    setIsUploadLoading(true);
    setDetectedSubjects([]);
    setTimeout(() => {
      setDetectedSubjects(SIMULATED_DETECTED_SUBJECTS);
      setIsUploadLoading(false);
    }, 1700);
  }, []);

  async function saveAttendanceToDatabase() {
    setSaveStatus("");
    if (!userId) {
      setSaveStatus("Your session is missing. Please login again.");
      setSaveStatusType("error");
      return;
    }
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
        body: JSON.stringify({ user_id: userId, records }),
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
              onClick={() => navigateToSection("dashboard")}
              aria-label="Open dashboard section"
              aria-current={activeSection === "dashboard" ? "page" : undefined}
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
              onClick={() => navigateToSection("attendance")}
              aria-label="Open attendance section"
              aria-current={activeSection === "attendance" ? "page" : undefined}
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
              onClick={() => navigateToSection("timetable")}
              aria-label="Open timetable section"
              aria-current={activeSection === "timetable" ? "page" : undefined}
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
            <button
              type="button"
              className={`menu-item ${activeSection === "analytics" ? "active" : ""}`}
              onClick={() => navigateToSection("analytics")}
              aria-label="Open analytics section"
              aria-current={activeSection === "analytics" ? "page" : undefined}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 18.5h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6 16l3.3-3.7 3.1 2.2 5.6-6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="6" cy="16" r="1" fill="currentColor" />
                  <circle cx="9.3" cy="12.3" r="1" fill="currentColor" />
                  <circle cx="12.4" cy="14.5" r="1" fill="currentColor" />
                  <circle cx="18" cy="8" r="1" fill="currentColor" />
                </svg>
              </span>
              <span className="menu-item-label">Analytics</span>
            </button>
            <button
              type="button"
              className={`menu-item ${activeSection === "ai-upload" ? "active" : ""}`}
              onClick={() => {
                if (onGoToTimetable) {
                  onGoToTimetable();
                } else {
                  setActiveSection("ai-upload");
                }
              }}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M12 3l2 3 3 .5-2 2.4.5 3.1-3-1.4-3 1.4.5-3.1-2-2.4 3-.5z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 16.5a2.5 2.5 0 0 1 2.5-2.5H9m10 2.5A2.5 2.5 0 0 0 16.5 14H15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="menu-item-label">AI Upload</span>
            </button>
            <button
              type="button"
              className={`menu-item ${activeSection === "settings" ? "active" : ""}`}
              onClick={() => navigateToSection("settings")}
              aria-label="Open settings section"
              aria-current={activeSection === "settings" ? "page" : undefined}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 1 0 12 8.5z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M19 12a7.1 7.1 0 0 0-.08-1l2.02-1.57-2-3.46-2.46.7a7.4 7.4 0 0 0-1.72-1l-.38-2.52h-4l-.38 2.52a7.4 7.4 0 0 0-1.72 1l-2.46-.7-2 3.46L5.08 11A7.1 7.1 0 0 0 5 12c0 .34.03.67.08 1l-2.02 1.57 2 3.46 2.46-.7c.53.41 1.11.75 1.72 1l.38 2.52h4l.38-2.52c.61-.25 1.19-.59 1.72-1l2.46.7 2-3.46L18.92 13c.05-.33.08-.66.08-1z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="menu-item-label">Settings</span>
            </button>
          </div>
        </aside>

        <div className="dash-content">
          <header className="dash-topbar">
            <div>
              <p className="dash-topbar-label">Premium Workspace</p>
              <h2 className="dash-topbar-title">
                Personalized Attendance Tracker
              </h2>
            </div>
            <div className="dash-topbar-right">
              <div className="dash-topbar-date">
                <span>{dayLabel}</span>
                <span>{dateLabel}</span>
              </div>
              <button
                type="button"
                className="dash-notify-btn"
                aria-label="Notifications"
              >
                <span>🔔</span>
                {notificationCount > 0 && (
                  <span className="dash-notify-badge">{notificationCount}</span>
                )}
              </button>
              <div className="dash-user-pill">
                <span className="dash-user-avatar">{userInitial}</span>
                <span className="dash-user-name">{userName}</span>
              </div>
              <button
                type="button"
                className="dash-logout-btn"
                onClick={() => {
                  if (onLogout) onLogout();
                }}
              >
                Logout
              </button>
            </div>
          </header>

          {/* ── DASHBOARD SECTION ── */}
          {activeSection === "dashboard" && (
            <section className="dash-main-screen">
              <section className="dash-hero-card">
                <div>
                  <p className="dash-greeting">{greetingText}</p>
                  <h1 className="dash-title">Dashboard</h1>
                  <p className="dash-date">
                    {dayLabel}, {dateLabel}
                  </p>
                  <p className="dash-live-time">Local time: {timeLabel}</p>
                  <p className="dash-focus-chip">
                    Focus: {selectedSubject || "Overall attendance"}
                  </p>
                </div>
                <div className="dash-hero-actions">
                  <button
                    type="button"
                    className="dash-chip-btn"
                    onClick={() => navigateToSection("attendance")}
                  >
                    Mark Today
                  </button>
                  <button
                    type="button"
                    className="dash-chip-btn"
                    onClick={() => navigateToSection("timetable")}
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
                  <button
                    type="button"
                    className={`dash-chip-btn ${compactTables ? "dash-chip-btn--active" : ""}`}
                    onClick={() => setCompactTables((prev) => !prev)}
                  >
                    {compactTables ? "Comfort View" : "Compact View"}
                  </button>
                </div>
              </section>

              <section
                className="dash-box-grid"
                aria-label="Student attendance summary"
              >
                <div className="dash-box-btn subject-list-card">
                  <div className="dash-box-title">Subjects</div>
                  <div className="subject-search-wrap">
                    <input
                      className="subject-search-input"
                      type="text"
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      placeholder="Search subjects"
                    />
                  </div>
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
                    ) : filteredSubjects.length === 0 ? (
                      <p
                        style={{
                          color: "#9ca3af",
                          fontSize: "13px",
                          padding: "8px",
                        }}
                      >
                        No subjects match your search.
                      </p>
                    ) : (
                      filteredSubjects.map((subject) => {
                        const isActive = selectedSubject === subject;
                        return (
                          <button
                            key={subject}
                            type="button"
                            className={`subject-list-item ${isActive ? "active" : ""}`}
                            onClick={() => handleSubjectSelect(subject)}
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
                <button
                  type="button"
                  className="dash-box-btn dash-box-btn--stat"
                >
                  <div className="dash-box-title">Attendance</div>
                  <div className="dash-box-content">{attendedPercent}%</div>
                  <p className="dash-card-subline">
                    {attendedLectures}/{totalLectures} lectures attended
                  </p>
                </button>
                <button
                  type="button"
                  className="dash-box-btn dash-box-btn--stat"
                >
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
                <div className="dash-target-progress">
                  <div className="dash-target-progress-head">
                    <span>Target Progress (75%)</span>
                    <span>{targetProgressPercent}%</span>
                  </div>
                  <div className="dash-target-progress-track">
                    <span
                      className="dash-target-progress-fill"
                      style={{ width: `${targetProgressPercent}%` }}
                    />
                  </div>
                </div>
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
                          <span className="dash-plan-subject">
                            {item.subject}
                          </span>
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
                          <span className="dash-risk-badge">
                            {item.percent}%
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </article>
              </section>

              <section className="dash-heatmap-card">
                <div className="dash-heatmap-head">
                  <h3 className="dash-insight-title">Weekly Load Heatmap</h3>
                  <span className="dash-heatmap-note">Frontend preview</span>
                </div>

                <div className="dash-heatmap-grid" role="list">
                  {weeklyHeatmap.map((item) => (
                    <button
                      key={item.day}
                      type="button"
                      role="listitem"
                      className={`dash-heatmap-cell ${
                        selectedHeatmapDay === item.day
                          ? "dash-heatmap-cell--active"
                          : ""
                      }`}
                      style={{
                        background: `linear-gradient(145deg, rgba(30, 41, 59, 0.75), rgba(34, 211, 238, ${0.12 + item.intensity * 0.45}))`,
                      }}
                      onClick={() => setSelectedHeatmapDay(item.day)}
                    >
                      <span className="dash-heatmap-day">
                        {item.day.slice(0, 3)}
                      </span>
                      <span className="dash-heatmap-value">{item.total}</span>
                    </button>
                  ))}
                </div>

                <div className="dash-heatmap-meta">
                  <p>
                    Selected: {selectedHeatmapData?.day || "-"} (
                    {selectedHeatmapData?.total || 0} classes)
                  </p>
                  <p>
                    Peak day: {busiestHeatmapDay?.day || "-"} (
                    {busiestHeatmapDay?.total || 0} classes)
                  </p>
                </div>
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
                  <div className="attendance-header-metrics">
                    <span className="attendance-header-pill">
                      Today Slots: {todaySlots.length}
                    </span>
                    <span className="attendance-header-pill">
                      Overall: {attendedPercent}%
                    </span>
                  </div>
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
                  <div
                    className={`timetable-table-wrap attendance-table-wrap ${
                      compactTables ? "table-wrap-compact" : ""
                    }`}
                  >
                    <table
                      className={`timetable-table attendance-table ${
                        compactTables ? "timetable-table-compact" : ""
                      }`}
                    >
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
                                <td
                                  colSpan={2}
                                  className="friday-practical-cell"
                                >
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
                  <div className="attendance-actions">
                    <button
                      type="button"
                      className="tt-primary attendance-save-btn"
                      onClick={saveAttendanceToDatabase}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save Today's Attendance"}
                    </button>
                    {saveStatus && (
                      <p
                        className={`attendance-save-status ${
                          saveStatusType === "error"
                            ? "attendance-save-status--error"
                            : "attendance-save-status--success"
                        }`}
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
              <div className="timetable-header">
                <div>
                  <h2 className="dash-section-title">Timetable</h2>
                  <p className="dash-section-subtitle">
                    Select subjects from the dropdown for each slot. Changes
                    save automatically.
                  </p>
                </div>
                <div className="timetable-header-pills">
                  <span className="timetable-header-pill">
                    Subjects: {subjectsList.length}
                  </span>
                  <span className="timetable-header-pill">Auto-save ON</span>
                  <button
                    type="button"
                    className="timetable-header-pill timetable-pill-btn"
                    onClick={() => setCompactTables((prev) => !prev)}
                  >
                    {compactTables ? "Comfort View" : "Compact View"}
                  </button>
                </div>
              </div>

              {isLoadingTimetable ? (
                <p style={{ color: "#9ca3af", padding: "20px" }}>
                  Loading timetable...
                </p>
              ) : subjectsList.length === 0 ? (
                <p style={{ color: "#9ca3af", padding: "20px" }}>
                  No subjects found. Please upload your timetable image first.
                </p>
              ) : (
                <div
                  className={`timetable-table-wrap ${
                    compactTables ? "table-wrap-compact" : ""
                  }`}
                >
                  <table
                    className={`timetable-table ${
                      compactTables ? "timetable-table-compact" : ""
                    }`}
                  >
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
                                <span className="timetable-special-note">
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
                                <span className="timetable-special-note">
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

          {/* ── ANALYTICS SECTION ── */}
          {activeSection === "analytics" && (
            <section className="dash-content-card analytics-view">
              <div className="analytics-head">
                <div>
                  <h2 className="dash-section-title">Analytics</h2>
                  <p className="dash-section-subtitle">
                    Real projections from your live attendance and timetable
                    data.
                  </p>
                </div>
                <div className="analytics-summary-pill">
                  Current Overall:{" "}
                  {overallTotal > 0
                    ? `${Math.round((overallAttended / overallTotal) * 100)}%`
                    : "0%"}
                </div>
              </div>

              <article className="analytics-trend-card">
                <div className="analytics-card-head">
                  <h3>Attendance Trend Forecast</h3>
                  <p>
                    Green path assumes you attend upcoming classes; amber path
                    assumes you miss them.
                  </p>
                </div>
                <div
                  className="analytics-chart-wrap"
                  role="img"
                  aria-label="Attendance trend forecast chart"
                >
                  <svg viewBox="0 0 720 260" className="analytics-trend-svg">
                    <line
                      x1="36"
                      y1="22"
                      x2="36"
                      y2="238"
                      className="analytics-axis"
                    />
                    <line
                      x1="36"
                      y1="238"
                      x2="684"
                      y2="238"
                      className="analytics-axis"
                    />
                    <line
                      x1="36"
                      y1="130"
                      x2="684"
                      y2="130"
                      className="analytics-grid"
                    />
                    <polyline
                      points={analyticsChartModel.attendPoints}
                      className="analytics-line analytics-line--attend"
                    />
                    <polyline
                      points={analyticsChartModel.missPoints}
                      className="analytics-line analytics-line--miss"
                    />
                    <line
                      x1="36"
                      x2="684"
                      y1={
                        238 -
                        ((ATTENDANCE_TARGET - analyticsChartModel.minY) /
                          Math.max(
                            1,
                            analyticsChartModel.maxY - analyticsChartModel.minY,
                          )) *
                          216
                      }
                      y2={
                        238 -
                        ((ATTENDANCE_TARGET - analyticsChartModel.minY) /
                          Math.max(
                            1,
                            analyticsChartModel.maxY - analyticsChartModel.minY,
                          )) *
                          216
                      }
                      className="analytics-target-line"
                    />
                    {analyticsChartModel.labels.map((point, idx) => {
                      const x =
                        36 +
                        (648 * idx) /
                          Math.max(1, analyticsChartModel.labels.length - 1);
                      return (
                        <text
                          key={point.label}
                          x={x}
                          y="254"
                          textAnchor="middle"
                          className="analytics-label"
                        >
                          {point.label}
                        </text>
                      );
                    })}
                  </svg>
                </div>
                <div className="analytics-legend">
                  <span>
                    <i className="analytics-dot analytics-dot--attend" /> Attend
                    Next
                  </span>
                  <span>
                    <i className="analytics-dot analytics-dot--miss" /> Miss
                    Next
                  </span>
                  <span>
                    <i className="analytics-dot analytics-dot--target" /> 75%
                    Target
                  </span>
                </div>
              </article>

              <article className="analytics-risk-card">
                <div className="analytics-card-head">
                  <h3>Subject Risk Forecast</h3>
                  <p>
                    Forecasted impact if you attend or miss the next class in
                    each subject.
                  </p>
                </div>
                <div className="analytics-risk-table-wrap">
                  <table className="analytics-risk-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Current</th>
                        <th>If Attend Next</th>
                        <th>If Miss Next</th>
                        <th>Needed to Reach 75%</th>
                        <th>Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectRiskForecasts.slice(0, 8).map((item) => (
                        <tr key={item.subject}>
                          <td>{item.subject}</td>
                          <td>{item.percent}%</td>
                          <td className="analytics-green">
                            {item.attendNext}%
                          </td>
                          <td className="analytics-amber">{item.missNext}%</td>
                          <td>{item.needed}</td>
                          <td>
                            <span
                              className={`analytics-risk-badge analytics-risk-${item.riskLevel.toLowerCase()}`}
                            >
                              {item.riskLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="analytics-action-card">
                <div className="analytics-card-head">
                  <h3>What To Attend Next</h3>
                  <p>
                    Priority recommendations generated from urgency score and
                    upcoming slots.
                  </p>
                </div>
                <div className="analytics-action-list">
                  {analyticsSuggestions.map((item) => (
                    <button
                      key={`${item.subject}-${item.tag}`}
                      type="button"
                      className="analytics-action-item"
                      onClick={() => {
                        if (item.subject !== "Overall") {
                          setSelectedSubject(item.subject);
                          setActiveSection("dashboard");
                        }
                      }}
                    >
                      <div>
                        <p className="analytics-action-title">{item.subject}</p>
                        <p className="analytics-action-message">
                          {item.message}
                        </p>
                      </div>
                      <div className="analytics-action-tags">
                        <span className="analytics-tag">{item.tag}</span>
                        <span
                          className={`analytics-risk-badge analytics-risk-${String(item.level).toLowerCase()}`}
                        >
                          {item.level}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </article>
            </section>
          )}

          {/* ── AI UPLOAD SECTION ── */}
          {activeSection === "ai-upload" && (
            <section className="dash-content-card ai-upload-view">
              <h2 className="dash-section-title">AI Timetable Upload</h2>
              <p className="dash-section-subtitle">
                Drag and drop your timetable image. This section simulates AI
                extraction in the UI.
              </p>

              <div
                className={`ai-upload-dropzone ${isDragActive ? "ai-upload-dropzone--active" : ""}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragActive(false);
                  runSimulatedUpload();
                }}
              >
                <p className="ai-upload-title">Drop timetable image here</p>
                <p className="ai-upload-sub">
                  PNG, JPG, JPEG supported (UI simulation)
                </p>
                <button
                  type="button"
                  className="tt-primary ai-upload-button"
                  onClick={runSimulatedUpload}
                  disabled={isUploadLoading}
                >
                  {isUploadLoading ? "Analyzing..." : "Upload Timetable"}
                </button>
              </div>

              {isUploadLoading && (
                <div className="ai-upload-loading">
                  <span className="ai-upload-spinner" />
                  <p>Analyzing timetable with AI...</p>
                </div>
              )}

              {!isUploadLoading && detectedSubjects.length > 0 && (
                <div className="ai-upload-result">
                  <p className="ai-upload-result-title">Detected Subjects</p>
                  <ul className="ai-upload-list">
                    {detectedSubjects.map((subject) => (
                      <li key={subject}>{subject}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ── SETTINGS SECTION ── */}
          {activeSection === "settings" && (
            <section className="dash-content-card settings-view">
              <h2 className="dash-section-title">Settings</h2>
              <p className="dash-section-subtitle">
                Visual preferences and dashboard behavior controls.
              </p>

              <div className="settings-grid">
                <article className="settings-card">
                  <h3>Display Mode</h3>
                  <p>
                    Switch table density for Attendance and Timetable views.
                  </p>
                  <button
                    type="button"
                    className="dash-chip-btn settings-chip"
                    onClick={() => setCompactTables((prev) => !prev)}
                  >
                    {compactTables
                      ? "Switch to Comfort View"
                      : "Switch to Compact View"}
                  </button>
                </article>

                <article className="settings-card">
                  <h3>Attendance Target</h3>
                  <p>Current smart target is set to 75%.</p>
                  <span className="settings-badge">Target: 75%</span>
                </article>

                <article className="settings-card">
                  <h3>AI Extraction</h3>
                  <p>
                    Use AI Upload section to simulate timetable extraction flow.
                  </p>
                  <button
                    type="button"
                    className="dash-chip-btn settings-chip"
                    onClick={() => {
                      if (onGoToTimetable) {
                        onGoToTimetable();
                      } else {
                        setActiveSection("ai-upload");
                      }
                    }}
                  >
                    Open Timetable Upload
                  </button>
                </article>
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
      {sidebarOpen && (
        <button
          type="button"
          className="dash-mobile-backdrop"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;
