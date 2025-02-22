import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import socket from '../socket'; // Use shared socket instance

function LobbyPage() {
  const { lobbyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // The user’s name passed from LandingPage (for display + server logic)
  const playerName = location.state?.playerName || '';

  // We'll store full lobby data here
  const [lobbyData, setLobbyData] = useState({ players: [] });

  useEffect(() => {
    // 1. Get initial lobby data
    socket.emit('getLobbyData', lobbyId, (data) => {
      if (data && !data.error) {
        setLobbyData(data);
      } else {
        // If there's an error (lobby not found), navigate home or handle error
        navigate('/');
      }
    });

    // 2. Listen for real-time "lobbyData" updates
    const handleLobbyData = (updatedLobby) => {
      if (updatedLobby.id === lobbyId) {
        setLobbyData(updatedLobby);
      }
    };
    socket.on('lobbyData', handleLobbyData);

    // 3. Listen for "gameStarted" event
    const handleGameStarted = ({ lobbyId, gameState }) => {
      // Everyone in the lobby navigates to the game page
      navigate(`/game/${lobbyId}`, {
        state: { gameState }, // optional: pass initial game state
      });
    };
    socket.on('gameStarted', handleGameStarted);

    // Cleanup on unmount
    return () => {
      socket.off('lobbyData', handleLobbyData);
      socket.off('gameStarted', handleGameStarted);
    };
  }, [lobbyId, navigate]);

  // Determine if you're host by comparing your socket.id to the stored hostSocketId
  const isHost = lobbyData.hostSocketId === socket.id;

  // Host sees "Your Lobby", others see "HostName's Lobby"
  const lobbyTitle = isHost
    ? 'Your Lobby'
    : `${lobbyData.host}'s Lobby`;

  // Click: Host starts game
  const handleStartGame = () => {
    socket.emit('startGame', lobbyId);
  };

  // Click: Leave Lobby
  const handleLeaveLobby = () => {
    socket.emit('leaveLobby', { playerName, lobbyId });
    navigate('/');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>{lobbyTitle}</h1>

      <h2>Players in this lobby:</h2>
      <ul>
        {lobbyData.players.map((player) => (
          player.name === playerName
            ? <li key={player.id}>{player.name} (You)</li>
            : <li key={player.id}>{player.name}</li>
        ))}
      </ul>

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
