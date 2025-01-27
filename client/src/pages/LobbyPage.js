import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';  // import the shared socket instance

function LobbyPage() {
  const { lobbyId } = useParams();
  const location = useLocation();
  const [lobbyData, setLobbyData] = useState({ players: [] });
  const playerName = location.state?.playerName || localStorage.getItem('playerName') || '';
  const navigate = useNavigate();

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

  // "IsHost" is recalculated every render:
  const isHost = lobbyData.hostSocketId === socket.id;
  
  const lobbyTitle = isHost ? 'Your Lobby' : `${lobbyData.host}'s Lobby`;

  const handleStartGame = () => {
    socket.emit('startGame', lobbyId);
  };

  const handleLeaveLobby = () => {
    socket.emit('leaveLobby', { playerName, lobbyId }); // Notify server
    navigate('/'); // Redirect to Landing Page
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>{lobbyTitle}</h1>
      <h2>Players in this lobby:</h2>
      <ul>
        {lobbyData.players.map((player) => (
          player.name === playerName ? (
            <li key={player.id}>{player.name} (You)</li>
           ) : (
            <li key={player.id}>{player.name}</li>
           )
        ))}
      </ul>

      {/* Only show "Start Game" if this client is the host */}
      {isHost && (
        <button onClick={handleStartGame}>Start Game</button>
      )}

      <button onClick={handleLeaveLobby} style={{ marginTop: '10px' }}>
        Leave Lobby
      </button>
    </div>
  );
}

export default LobbyPage;
