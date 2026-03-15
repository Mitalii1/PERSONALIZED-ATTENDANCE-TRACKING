import './App.css';
import React, { useState } from 'react';
import First from './Pages/First';
import Second from './Pages/Second';

function App() {
  const [page, setPage] = useState('auth'); // 'auth' | 'timetable'

  return (
    <div className="App">
      {page === 'auth' ? (
        <First onRegistered={() => setPage('timetable')} />
      ) : (
        <Second onBack={() => setPage('auth')} />
      )}
    </div>
  );
}

export default App;
