'use strict';

import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import './App.css';

import LandingPage from './pages/LandingPage';
import GamePage from './pages/GamePage';

function App() {
  // Initialize from localStorage, or empty string if nothing
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('playerName') || ''
  );

  // Helper to update localStorage and state
  const savePlayerName = (name) => {
    localStorage.setItem('playerName', name);
    setPlayerName(name);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<LandingPage playerName={playerName} setPlayerName={setPlayerName} />}
        />
        <Route path="/game/:lobbyId" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App;
