import './App.css';
import React, { useState } from 'react';
import First from './Pages/First';
import Second from './Pages/Second';
import Dashboard from './Components/Dashboard';

function App() {
  const [page, setPage] = useState('auth'); // 'auth' | 'timetable' | 'dashboard'
  const [canReturnToDashboardFromTimetable, setCanReturnToDashboardFromTimetable] = useState(false);

  return (
    <div className="App">
      {page === 'auth' && (
        <First
          onLogin={() => setPage('dashboard')}
          onRegistered={() => {
            setCanReturnToDashboardFromTimetable(false);
            setPage('timetable');
          }}
        />
      )}
      {page === 'timetable' && (
        <Second
          onBack={() => setPage('auth')}
          onSaved={() => setPage('dashboard')}
          onGoDashboard={() => setPage('dashboard')}
          showBackToDashboard={canReturnToDashboardFromTimetable}
        />
      )}
      {page === 'dashboard' && (
        <Dashboard
          onGoToTimetable={() => {
            setCanReturnToDashboardFromTimetable(true);
            setPage('timetable');
          }}
          onLogout={() => setPage('auth')}
        />
      )}
    </div>
  );
}

export default App;
