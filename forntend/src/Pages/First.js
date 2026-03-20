import '../App.css';
import Getstarted from '../Components/Getstarted';
import React from 'react';

function First({ onLogin, onRegistered }) {
  return (
    <>
      <div className="first">
        <Getstarted onLogin={onLogin} onRegistered={onRegistered} />
      </div>
    </>
  );
}

export default First;