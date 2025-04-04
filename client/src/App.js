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
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

function App() {
  // Initialize from localStorage, or empty if nothing's there
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('playerName') || ''
  );

  // Helper to keep both localStorage and state in sync
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
            // If no name, go to EnterNamePage
            playerName
              ? <LandingPage playerName={playerName} />
              : <Navigate to="/enter-name" />
          }
        />

        <Route
          path="/enter-name"
          element={<EnterNamePage onNameSubmitted={savePlayerName} />}
        />

        <Route path="/lobby/:lobbyId" element={<LobbyPage />} />
        <Route path="/game/:lobbyId" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App;
