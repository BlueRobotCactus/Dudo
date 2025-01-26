import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import socket from '../socket';  // import the shared socket instance

function LobbyPage() {
  const { lobbyId } = useParams();
  const location = useLocation();

  // We passed these via React Router location.state from the landing page
  const { isHost, hostName } = location.state || {};

  const [lobbyData, setLobbyData] = useState({ players: [] });

  useEffect(() => {
    // Ask the server for the most up-to-date lobby info
    socket.emit('getLobbyData', lobbyId, (data) => {
      if (data && !data.error) {
        setLobbyData(data);
      }
    });

    // Listen for real-time "lobbyData" events from the server
    const handleLobbyData = (updatedLobby) => {
      if (updatedLobby.id === lobbyId) {
        setLobbyData(updatedLobby);
      }
    };

    socket.on('lobbyData', handleLobbyData);

    // Cleanup to avoid duplicate listeners if we unmount
    return () => {
      socket.off('lobbyData', handleLobbyData);
    };
  }, [lobbyId]);

  const handleStartGame = () => {
    socket.emit('startGame', lobbyId);
  };

  // Host sees "Your Lobby", everyone else sees "HostName's Lobby"
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

      {/* Only show "Start Game" if this client is the host */}
      {isHost && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
    </div>
  );
}

export default LobbyPage;
