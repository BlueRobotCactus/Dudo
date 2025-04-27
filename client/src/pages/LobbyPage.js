import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { SocketContext } from '../SocketContext.js';

function LobbyPage() {
  const { lobbyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // get our socket id
  const { socket, socketId, connected } = useContext(SocketContext);

  // The user’s name passed from LandingPage (for display + server logic)
  const playerName = location.state?.playerName || '';

  // We'll store full lobby data here
  const [lobbyData, setLobbyData] = useState({ players: [] });

  useEffect(() => {
    // 0. Make sure socket is ready
    if (!socket || !connected) {
      console.log('LobbyPage: socket not connected yet');
      return;
    }
    console.log("LobbyPage: setting up socket handlers");

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
  }, [socket, connected, lobbyId, navigate]);

  // Determine if you're host by comparing your socket.id to the stored hostSocketId
//&&&  const isHost = lobbyData.hostSocketId === socket.id;
  const isHost = lobbyData.hostSocketId === socketId;

  // Host sees "Your Lobby", others see "HostName's Lobby"
  const lobbyTitle = isHost
    ? 'Your Lobby (v2)'
    : `${lobbyData.host}'s Lobby (v2)`;

  // Click: Host starts game
  const handleStartGame = () => {
    if (connected) socket.emit('startGame', lobbyId);
  };

  // Click: Leave Lobby
  const handleLeaveLobby = () => {
    if (connected) socket.emit('leaveLobby', { playerName, lobbyId });
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
        <button onClick={handleStartGame} disabled={!connected}>
          Start Game
        </button>
      )}

      <button onClick={handleLeaveLobby} style={{ marginTop: '10px' }}>
        Leave Lobby
      </button>
    </div>
  );
}

export default LobbyPage;
