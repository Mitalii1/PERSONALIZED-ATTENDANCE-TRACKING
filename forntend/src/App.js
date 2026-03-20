import './App.css';
import React, { useState } from 'react';
import First from './Pages/First';
import Second from './Pages/Second';
import Dashboard from './Components/Dashboard';

function App() {
  const [page, setPage] = useState('auth'); // 'auth' | 'timetable' | 'dashboard'

  return (
    <div className="App">
      {page === 'auth' && (
        <First
          onLogin={() => setPage('dashboard')}
          onRegistered={() => setPage('timetable')}
        />
      )}
      {page === 'timetable' && (
        <Second
          onBack={() => setPage('auth')}
          onSaved={() => setPage('dashboard')}
        />
      )}
      {page === 'dashboard' && (
        <Dashboard
          onGoToTimetable={() => setPage('timetable')}
          onLogout={() => setPage('auth')}
        />
      )}
    </div>
  );
}

export default App;
