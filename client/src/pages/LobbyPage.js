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
    // Request lobby data when the component mounts
    socket.emit('getLobbyData', lobbyId, (data) => {
      if (data) {
        setLobbyData(data);
      }
    });
  
    socket.on('lobbyData', (data) => {
      if (data.id === lobbyId) {
        setLobbyData(data);
      }
    });
  
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
