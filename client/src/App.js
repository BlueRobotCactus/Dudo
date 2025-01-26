// client/src/App.js

import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lobby/:lobbyId" element={<LobbyPage />} />
      </Routes>
    </Router>
  );
}

export default App;
