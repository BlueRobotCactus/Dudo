const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
  },
});

app.use(cors());
app.use(express.json());

// ----------------- In-memory data -----------------
// Lobbies object structure:
// lobbies = {
//   [lobbyId]: {
//     id: lobbyId,
//     host: "Host's Name",
//     hostSocketId: "some-socket-id",
//     players: [{ id: "socket-id", name: "Name" }, ...],
//   },
// };
const lobbies = {};

// ----------------- Socket.IO Setup -----------------
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // PLAYER CREATES LOBBY
  socket.on('createLobby', (hostName, callback) => {
    const lobbyId = uuidv4();
    // Store the host's socket ID so we know who is host
    lobbies[lobbyId] = {
      id: lobbyId,
      host: hostName,
      hostSocketId: socket.id,
      players: [{ id: socket.id, name: hostName }],
    };

    socket.join(lobbyId);
    console.log(`Lobby created: ${lobbyId} by host: ${hostName}`);

    // Respond to the lobby creator
    if (callback) {
      callback({ lobbyId, hostName });
    }

    // Update everyone else’s lobby list
    io.emit('lobbiesList', getLobbiesList());
  });

  // PLAYER JOINS LOBBY
  socket.on('joinLobby', (data, callback) => {
    const { lobbyId, playerName } = data;
    const lobby = lobbies[lobbyId];

    if (lobby) {
      // Add the new player
      lobby.players.push({ id: socket.id, name: playerName });
      socket.join(lobbyId);

      console.log(`${playerName} joined lobby: ${lobbyId}`);

      // Notify everyone in the lobby about the updated data
      io.to(lobbyId).emit('lobbyData', lobby);

      // Respond to the player who joined
      if (callback) {
        callback(lobby);
      }

      // Update the main lobby list
      io.emit('lobbiesList', getLobbiesList());
    } else {
      if (callback) {
        callback({ error: 'Lobby not found' });
      }
    }
  });

  // GET LOBBY DATA (when player lands on a Lobby Page)
  socket.on('getLobbyData', (lobbyId, callback) => {
    const lobby = lobbies[lobbyId];
    if (lobby) {
      callback(lobby);
    } else {
      callback({ error: "Lobby not found" });
    }
  });

  // HOST STARTS GAME
  socket.on('startGame', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    // Only the host can start the game
    if (lobby && lobby.hostSocketId === socket.id) {
      console.log(`Game started in lobby: ${lobbyId}`);
      io.to(lobbyId).emit('gameStarted', { message: 'Game is starting!' });
    }
  });

  // PLAYER LEAVES LOBBY
  socket.on('leaveLobby', ({ playerName, lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
  
    const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) return;
  
    const [removedPlayer] = lobby.players.splice(playerIndex, 1);
  
    // If the removed player was the host...
    if (removedPlayer.id === lobby.hostSocketId) {
      if (lobby.players.length > 0) {
        // Reassign host to the earliest-joined player
        const newHost = lobby.players[0];
        lobby.host = newHost.name;
        lobby.hostSocketId = newHost.id;
        console.log(`Host left. Reassigning host to: ${newHost.name} for lobby: ${lobbyId}`);
        
        // Broadcast the updated lobby
        io.to(lobbyId).emit('lobbyData', lobby);
      } else {
        // No players left, remove the lobby
        console.log(`Host left and no players remain. Removing lobby: ${lobbyId}`);
        delete lobbies[lobbyId];
      }
    } else {
      // If a non-host left, just broadcast the updated lobby
      io.to(lobbyId).emit('lobbyData', lobby);
    }
  
    // Always update the lobby list on the landing page
    io.emit('lobbiesList', getLobbiesList());
  });
  

  // PLAYER DISCONNECTS
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  
    for (let lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
      const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
  
      if (playerIndex !== -1) {
        const [removedPlayer] = lobby.players.splice(playerIndex, 1);
  
        // If the removed player was the host...
        if (removedPlayer.id === lobby.hostSocketId) {
          if (lobby.players.length > 0) {
            // Reassign host to earliest-joined player
            const newHost = lobby.players[0];
            lobby.host = newHost.name;
            lobby.hostSocketId = newHost.id;
            console.log(`Host disconnected. Reassigning host to: ${newHost.name} for lobby: ${lobbyId}`);
  
            // Broadcast updated lobby
            io.to(lobbyId).emit('lobbyData', lobby);
          } else {
            // No players left, remove the lobby
            console.log(`Host disconnected and no players remain. Removing lobby: ${lobbyId}`);
            delete lobbies[lobbyId];
          }
        } else {
          // If a non-host disconnected, just broadcast the updated lobby
          io.to(lobbyId).emit('lobbyData', lobby);
        }
  
        // Update lobby list on landing page
        io.emit('lobbiesList', getLobbiesList());
        return; // Stop checking other lobbies
      }
    }
  });  
});

// ----------------- Express Routes -----------------
app.get('/api/lobbies', (req, res) => {
  res.json(getLobbiesList());
});

// Helper function: Return a simplified array of lobbies for display
function getLobbiesList() {
  return Object.values(lobbies).map((lobby) => ({
    id: lobby.id,
    host: lobby.host,
    playerCount: lobby.players.length,
  }));
}

// ----------------- Start Server -----------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
