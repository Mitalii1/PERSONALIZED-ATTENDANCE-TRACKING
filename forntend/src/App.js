import "./App.css";
import React, { useEffect, useState } from "react";
import First from "./Pages/First";
import Second from "./Pages/Second";
import Dashboard from "./Components/Dashboard";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "./api";

function readStoredUser() {
  return getAuthToken() ? { name: "Student" } : null;
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [page, setPage] = useState(() =>
    readStoredUser() ? "dashboard" : "auth",
  );
  const [
    canReturnToDashboardFromTimetable,
    setCanReturnToDashboardFromTimetable,
  ] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => handleLogout();
    window.addEventListener("pat-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("pat-unauthorized", handleUnauthorized);
  }, []);

  function handleLogin(session) {
    if (!session?.token) {
      setPage("auth");
      return;
    }
    setAuthToken(session.token);
    setCurrentUser(session.user || { name: session.name || "Student" });
    setPage("dashboard");
  }

  function handleRegistered(session) {
    if (!session?.token) {
      setPage("auth");
      return;
    }
    setAuthToken(session.token);
    setCurrentUser(session.user || { name: session.name || "Student" });
    setCanReturnToDashboardFromTimetable(false);
    setPage("timetable");
  }

  function handleLogout() {
    clearAuthToken();
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
