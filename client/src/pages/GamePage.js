import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import socket from '../socket';

function GamePage() {
  const { lobbyId } = useParams();
  const location = useLocation();
  const canvasRef = useRef(null);

  const initialGameState = location.state?.gameState || {};
  const [gameState, setGameState] = useState(initialGameState);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [mySocketId, setMySocketId] = useState(socket.id);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // Resize the canvas when the window resizes
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  useEffect(() => {
    socket.emit('getLobbyData', lobbyId, (lobby) => {
      setGameState(lobby.game);
      setLobbyPlayers(lobby.players);
    });

    const handleGameStateUpdate = (updatedGame) => {
      setGameState(updatedGame);
    };
    socket.on('gameStateUpdate', handleGameStateUpdate);

    const handleGameOver = (data) => {
      alert(data.message);
    };
    socket.on('gameOver', handleGameOver);

    return () => {
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('gameOver', handleGameOver);
    };
  }, [lobbyId]);

  const currentTurnIndex = gameState?.currentTurnIndex || 0;
  const currentPlayer = lobbyPlayers[currentTurnIndex] || {};
  const isMyTurn = currentPlayer.id === mySocketId;

  let turnQueue = [];
  if (lobbyPlayers.length > 0) {
    for (let i = 1; i < lobbyPlayers.length; i++) {
      const nextPlayerIndex = (currentTurnIndex + i) % lobbyPlayers.length;
      turnQueue.push(lobbyPlayers[nextPlayerIndex]);
    }
  }

  const handleBid = () => socket.emit('bid', { lobbyId });
  const handleDoubt = () => socket.emit('doubt', { lobbyId });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match screen
    canvas.width = screenSize.width;
    canvas.height = screenSize.height;

    // Clear canvas
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText('Game Lobby: ' + lobbyId, 20, 40);

    if (!gameState?.isStarted) {
      ctx.fillText('Game not active or just ended.', 20, 80);
      return;
    }

    // Display cup up image
    const cupDown = new Image();

    cupDown.src = "/images/CupDown.jpg"

    cupDown.onload = () => {
      ctx.drawImage(cupDown, 200, 200, 100, 140);
    };

    // Display current turn
    ctx.fillText(`Current turn: ${currentPlayer.name}`, 20, 120);
    ctx.fillText(isMyTurn ? "It's YOUR turn to bid!" : `Waiting for ${currentPlayer.name}...`, 20, 160);

    // Display turn queue
    ctx.fillText('Next players:', 20, 200);
    turnQueue.forEach((p, index) => {
      ctx.fillText(`${index + 1}. ${p.id === mySocketId ? 'You' : p.name}`, 40, 230 + index * 30);
    });
  }, [gameState, lobbyPlayers, isMyTurn, screenSize]);

  return (
    <div style={{ textAlign: 'center', padding: '0', margin: '0' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {isMyTurn && (
        <div style={{ position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center' }}>
          <button onClick={handleBid} style={{ marginRight: '10px', padding: '15px', fontSize: '18px' }}>Bid</button>
          <button onClick={handleDoubt} style={{ padding: '15px', fontSize: '18px' }}>Doubt</button>
        </div>
      )}
    </div>
  );
}

export default GamePage;
