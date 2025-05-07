'use strict';

import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import './App.css';

import EnterNamePage from './pages/EnterNamePage';
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
          element={
            playerName
              ? <LandingPage playerName={playerName} />
              : <Navigate to="/enter-name" />
          }
        />
        <Route
          path="/enter-name"
          element={<EnterNamePage onNameSubmitted={savePlayerName} />}
        />
        <Route path="/game/:lobbyId" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App;
