import '../App.css';
import Getstarted from '../Components/Getstarted';
import React from 'react';

function First({ onRegistered }) {
  return (
    <>
      <div className="first">
        <Getstarted onRegistered={onRegistered} />
      </div>
    </>
  );
}

export default First;