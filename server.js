const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

// Serve all the static files in the React app's build folder
app.use(express.static(path.join(__dirname, 'client', 'build')));

// In-memory lobbies storage
const lobbies = {
  /*
    [lobbyId]: {
      id: lobbyId,
      host: 'Host Name',
      hostSocketId: 'socketID',
      players: [{ id: 'socketID', name: 'PlayerName' }, ...],
      game: {
        isStarted: false,
        currentTurnIndex: 0, 
        // other game-specific fields...
      }
    }
  */
};

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // ------------------------------
  // CREATE LOBBY
  // ------------------------------
  socket.on('createLobby', (hostName, callback) => {
    const lobbyId = uuidv4();
    lobbies[lobbyId] = {
      id: lobbyId,
      host: hostName,
      hostSocketId: socket.id,
      players: [{ id: socket.id, name: hostName }],
      game: { isStarted: false }, // We'll store game data here
    };

    socket.join(lobbyId);
    console.log(`Lobby created: ${lobbyId} by host: ${hostName}`);

    // Respond back to creator
    if (callback) {
      callback({ lobbyId, hostName });
    }

    // Update the main lobby list for everyone
    io.emit('lobbiesList', getLobbiesList());
  });

  // ------------------------------
  // JOIN LOBBY
  // ------------------------------
  socket.on('joinLobby', (data, callback) => {
    const { lobbyId, playerName } = data;
    const lobby = lobbies[lobbyId];
    if (lobby) {
      // Add new player
      lobby.players.push({ id: socket.id, name: playerName });
      socket.join(lobbyId);

      console.log(`${playerName} joined lobby: ${lobbyId}`);

      // Notify everyone in this lobby
      io.to(lobbyId).emit('lobbyData', lobby);

      // Respond to the new joiner
      if (callback) {
        callback(lobby);
      }

      // Update lobby list for the landing page
      io.emit('lobbiesList', getLobbiesList());
    } else {
      if (callback) {
        callback({ error: 'Lobby not found' });
      }
    }
  });

  // ------------------------------
  // GET LOBBY DATA
  // ------------------------------
  socket.on('getLobbyData', (lobbyId, callback) => {
    const lobby = lobbies[lobbyId];
    if (lobby) {
      callback(lobby);
    } else {
      callback({ error: 'Lobby not found' });
    }
  });

  // ------------------------------
  // START GAME
  // ------------------------------
  socket.on('startGame', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    // Only the host can start
    if (lobby.hostSocketId === socket.id) {
      // Initialize game state (turn index, etc.)
      lobby.game.isStarted = true;
      lobby.game.currentTurnIndex = 0;

      console.log(`Game started in lobby: ${lobbyId}`);

      // Emit to all players in the lobby
      io.to(lobbyId).emit('gameStarted', {
        lobbyId,
        gameState: lobby.game,
      });
    }
  });

  // ------------------------------
  // LEAVE LOBBY
  // ------------------------------
  socket.on('leaveLobby', ({ playerName, lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    // Remove this player from the lobby
    const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) return;

    const [removedPlayer] = lobby.players.splice(playerIndex, 1);

    // If the removed player was the host
    if (removedPlayer.id === lobby.hostSocketId) {
      // Reassign host the earliest joined player if players remain
      if (lobby.players.length > 0) {
        const newHost = lobby.players[0];
        lobby.host = newHost.name;
        lobby.hostSocketId = newHost.id;
        console.log(`Host left. Reassigning host to: ${newHost.name} (Socket: ${newHost.id}) for lobby: ${lobbyId}`);

        // Notify the lobby
        io.to(lobbyId).emit('lobbyData', lobby);
      } else {
        // No players left, remove entire lobby
        console.log(`Host left and no players remain. Removing lobby: ${lobbyId}`);
        delete lobbies[lobbyId];
      }
    } else {
      // Non-host left
      io.to(lobbyId).emit('lobbyData', lobby);
    }

    // Update list
    io.emit('lobbiesList', getLobbiesList());
  });

  // ------------------------------
  // TURN-BASED LOGIC (BID / DOUBT)
  // ------------------------------
  socket.on('bid', ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game || !lobby.game.isStarted) return;

    const currentTurnIndex = lobby.game.currentTurnIndex;
    const currentPlayer = lobby.players[currentTurnIndex];
    if (currentPlayer.id !== socket.id) {
      console.log('Player attempted to bid out of turn.');
      return;
    }

    console.log(`Player ${currentPlayer.name} made a BID in lobby ${lobbyId}`);

    // Move to the next turn
    lobby.game.currentTurnIndex = (currentTurnIndex + 1) % lobby.players.length;

    // Broadcast new game state
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });

  socket.on('doubt', ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game || !lobby.game.isStarted) return;

    const currentTurnIndex = lobby.game.currentTurnIndex;
    const currentPlayer = lobby.players[currentTurnIndex];
    if (currentPlayer.id !== socket.id) {
      console.log('Player attempted to doubt out of turn.');
      return;
    }

    console.log(`Player ${currentPlayer.name} DOUBTED in lobby ${lobbyId}. Game ends.`);

    // End the game
    lobby.game.isStarted = false;
    io.to(lobbyId).emit('gameOver', {
      message: `${currentPlayer.name} ended the game by doubting!`,
      finalGameState: lobby.game,
    });
  });

  // ------------------------------
  // DISCONNECT (unexpected)
  // ------------------------------
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Find any lobby that this player was in
    for (let id in lobbies) {
      const lobby = lobbies[id];
      const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        const [removedPlayer] = lobby.players.splice(playerIndex, 1);

        if (removedPlayer.id === lobby.hostSocketId) {
          // The host disconnected
          if (lobby.players.length > 0) {
            const newHost = lobby.players[0];
            lobby.host = newHost.name;
            lobby.hostSocketId = newHost.id;
            console.log(`Host disconnected. Reassigning host to: ${newHost.name} for lobby: ${id}`);
            io.to(id).emit('lobbyData', lobby);
          } else {
            // No players left
            console.log(`Host disconnected and no players remain. Removing lobby: ${id}`);
            delete lobbies[id];
          }
        } else {
          // A non-host disconnected
          io.to(id).emit('lobbyData', lobby);
        }

        // Always update the main lobby list
        io.emit('lobbiesList', getLobbiesList());
        break; // Stop after removing from one lobby
      }
    }
  });
});

// ------------------------------
// Express Endpoint: Lobbies
// ------------------------------
app.get('/api/lobbies', (req, res) => {
  res.json(getLobbiesList());
});

// Helper: list of available lobbies
function getLobbiesList() {
  return Object.values(lobbies).map((lobby) => ({
    id: lobby.id,
    host: lobby.host,
    playerCount: lobby.players.length,
  }));
}

// Catch-all handler: For any request that doesn't match an API route,
// send back index.html so that client-side routing can handle it.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// Start server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
