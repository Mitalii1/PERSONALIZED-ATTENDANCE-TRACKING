import '../App.css';
import Landing from "../Components/Landing";
import React from 'react';

function First({ onDemo }) {
  return (
    <>
      <Landing onDemo={onDemo} />
    </>
  );
}

export default First;