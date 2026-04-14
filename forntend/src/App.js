import "./App.css";
import React, { useEffect, useState } from "react";
import First from "./Pages/First";
import Second from "./Pages/Second";
import Dashboard from "./Components/Dashboard";

const USER_STORAGE_KEY = "pat-current-user";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.id) return null;
    return parsed;
  } catch (_err) {
    return null;
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [page, setPage] = useState(() =>
    readStoredUser() ? "dashboard" : "auth",
  ); // 'auth' | 'timetable' | 'dashboard'
  const [
    canReturnToDashboardFromTimetable,
    setCanReturnToDashboardFromTimetable,
  ] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [currentUser]);

  function handleLogin(user) {
    if (!user || !user.id) {
      setPage("auth");
      return;
    }
    setCurrentUser(user);
    setPage("dashboard");
  }

  function handleRegistered(user) {
    if (!user || !user.id) {
      setPage("auth");
      return;
    }
    setCurrentUser(user);
    setCanReturnToDashboardFromTimetable(false);
    setPage("timetable");
  }

  function handleLogout() {
    setCurrentUser(null);
    setCanReturnToDashboardFromTimetable(false);
    setPage("auth");
  }

  return (
    <div className="App">
      {page === "auth" && (
        <First onLogin={handleLogin} onRegistered={handleRegistered} />
      )}
      {page === "timetable" && (
        <Second
          userId={currentUser?.id}
          onBack={() => setPage("auth")}
          onSaved={() => setPage("dashboard")}
          onGoDashboard={() => setPage("dashboard")}
          showBackToDashboard={canReturnToDashboardFromTimetable}
        />
      )}
      {page === "dashboard" && (
        <Dashboard
          currentUser={currentUser}
          onGoToTimetable={() => {
            setCanReturnToDashboardFromTimetable(true);
            setPage("timetable");
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
