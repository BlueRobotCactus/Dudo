'use strict';

import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import './App.css';

import { ImageRefsProvider } from './ImageRefsContext';

import LandingPage from './pages/LandingPage.js';
import GamePage from './pages/GamePage.js';
import HowToPlayPage from './pages/HowToPlayPage.js';
import AboutPage from './pages/AboutPage.js';

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
    <ImageRefsProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={<LandingPage playerName={playerName} setPlayerName={setPlayerName} />}
          />
          <Route path="/game/:lobbyId" element={<GamePage />} />
          <Route path="/how-to-play" element={<HowToPlayPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Router>
    </ImageRefsProvider>
  );
}

export default App;
