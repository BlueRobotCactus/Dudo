// client/src/pages/LobbyPage.js

import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useLocation, useParams } from 'react-router-dom';

const socket = io('http://localhost:5000');

function LobbyPage() {
  const { lobbyId } = useParams();
  const location = useLocation();
  
  // isHost and hostName passed in from LandingPage via state
  const { isHost, hostName } = location.state || {};

  const [lobbyData, setLobbyData] = useState({ players: [] });

  useEffect(() => {
    // Listen for new data about our lobby
    socket.on('lobbyData', (data) => {
      if (data.id === lobbyId) {
        setLobbyData(data);
      }
    });

    // Optionally, request the latest lobby data upon mount
    // The server is already pushing updates, so you might not need this
    // But if needed, you could create a 'getLobbyData' event or a REST endpoint.

    return () => {
      socket.off('lobbyData');
    };
  }, [lobbyId]);

  const handleStartGame = () => {
    socket.emit('startGame', lobbyId);
  };

  const title = isHost ? 'Your Lobby' : `${hostName}'s Lobby`;

  return (
    <div style={{ padding: '20px' }}>
      <h1>{title}</h1>

      <h2>Players in this lobby:</h2>
      <ul>
        {lobbyData.players.map((player) => (
          <li key={player.id}>{player.name}</li>
        ))}
      </ul>

      {isHost && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
    </div>
  );
}

export default LobbyPage;
