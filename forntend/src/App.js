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
  const [isDemoMode, setIsDemoMode] = useState(false);

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
    setIsDemoMode(false);
    setCurrentUser(session.user || { name: session.name || "Student" });
    setPage("dashboard");
  }

  function handleRegistered(session) {
    if (!session?.token) {
      setPage("auth");
      return;
    }
    setAuthToken(session.token);
    setIsDemoMode(false);
    setCurrentUser(session.user || { name: session.name || "Student" });
    setCanReturnToDashboardFromTimetable(false);
    setPage("timetable");
  }

  function handleLogout() {
    clearAuthToken();
    setCurrentUser(null);
    setCanReturnToDashboardFromTimetable(false);
    setPage("auth");
    setIsDemoMode(false);
  }

  function handleDemo() {
    clearAuthToken();
    setCurrentUser({ name: "Demo Student", email: "demo@example.com" });
    setIsDemoMode(true);
    setPage("dashboard");
  }

  return (
    <div className="App">
      {page === "auth" && (
        <First
          onLogin={handleLogin}
          onRegistered={handleRegistered}
          onDemo={handleDemo}
        />
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
          demoMode={isDemoMode}
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
