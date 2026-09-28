import '../App.css';
import Getstarted from '../Components/Getstarted';
import React from 'react';

function First({ onLogin, onRegistered, onDemo }) {
  return (
    <>
      <div className="first">
        <Getstarted
          onLogin={onLogin}
          onRegistered={onRegistered}
          onDemo={onDemo}
        />
      </div>
    </>
  );
}

export default First;