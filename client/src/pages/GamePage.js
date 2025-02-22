import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import socket from '../socket';

function GamePage() {
  const { lobbyId } = useParams();
  const location = useLocation();

  // Optionally, we can get an initial gameState from location.state if we want
  const initialGameState = location.state?.gameState || {};

  const [gameState, setGameState] = useState(initialGameState);

  // We'll also want the players list. You can fetch that once the game starts,
  // or pass it from the lobby as well.
  // For simplicity, let's assume we have it:
  const [lobbyPlayers, setLobbyPlayers] = useState([]);

  // We need the local user’s socket ID to determine if it’s our turn
  const [mySocketId, setMySocketId] = useState(socket.id);

  useEffect(() => {
    // 1. Request current game state from server if needed
    socket.emit('getLobbyData', lobbyId, (lobby) => {
      // We'll rely on `lobby.game` for the game state
      setGameState(lobby.game);
      setLobbyPlayers(lobby.players);
    });

    // 2. Listen for real-time game updates
    const handleGameStateUpdate = (updatedGame) => {
      setGameState(updatedGame);
    };
    socket.on('gameStateUpdate', handleGameStateUpdate);

    // 3. Handle gameOver
    const handleGameOver = (data) => {
      alert(data.message); 
      // Possibly navigate to a results page or show final summary
    };
    socket.on('gameOver', handleGameOver);

    return () => {
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('gameOver', handleGameOver);
    };
  }, [lobbyId]);

  // Helper: figure out who’s turn it is
  const currentTurnIndex = gameState?.currentTurnIndex || 0;
  const currentPlayer = lobbyPlayers[currentTurnIndex] || {};
  const isMyTurn = currentPlayer.id === mySocketId;

  // The next players in line (the "queue") after currentTurnIndex
  let turnQueue = [];
  if (lobbyPlayers.length > 0) {
    for (let i = 1; i < lobbyPlayers.length; i++) {
      // This calculates a "rotated" queue from currentTurnIndex
      const nextPlayerIndex = (currentTurnIndex + i) % lobbyPlayers.length;
      turnQueue.push(lobbyPlayers[nextPlayerIndex]);
    }
  }

  // Bidding
  const handleBid = () => {
    socket.emit('bid', { lobbyId });
  };

  // Doubting
  const handleDoubt = () => {
    socket.emit('doubt', { lobbyId });
  };

  return (
    <div style={{ padding: 20 }}>
      {gameState?.isStarted ? (
        <>
          <h2>Current player’s turn: {currentPlayer.name}</h2>

          {isMyTurn ? (
            <div>
              <p>It’s your turn!</p>
              <button onClick={handleBid}>Bid</button>
              <button onClick={handleDoubt}>Doubt</button>
            </div>
          ) : (
            <div>
              <p>Waiting for {currentPlayer.name}...</p>
              <p>Next in turn queue: {turnQueue.map((p) =>
                p.id === mySocketId
                ? "You"
                : p.name).join(', ')}</p>
            </div>
          )}
        </>
      ) : (
        <div>
          <h2>Game not active or just ended.</h2>
        </div>
      )}
    </div>
  );
}

export default GamePage;
