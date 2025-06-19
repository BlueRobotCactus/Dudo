import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

//************************************************************
// HowToPlayPage function
//************************************************************
export default function HowToPlayPage() {

const location = useLocation();
const navigate = useNavigate();

const lobbyId = location.state?.lobbyId;

const handleClose = () => {
  if (lobbyId) {
    navigate(`/game/${lobbyId}`);
  } else {
    navigate('/');
  }
};

  return (
    <div style={{ position: 'relative', padding: '20px' }}>
      {/* X button in top-right */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
        aria-label="Close"
      >
        ×
      </button>

      <h1>How to Play</h1>
      <p>Instructions go here...</p>
    </div>
  );
}
