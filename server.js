// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For unique IDs (npm install uuid if you want to use this)

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, lock this down to your front-end origin
  },
});

app.use(cors());
app.use(express.json());

// ----------------- In-memory data -----------------
// Structure example: {
//   lobbyId: {
//     id: lobbyId,
//     host: hostName,
//     players: [ { id: socketId, name: 'someName' } ],
//   }
// }
const lobbies = {};

// ----------------- Socket.IO Setup -----------------
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // When a new lobby is created
  socket.on('createLobby', (hostName, callback) => {
    const lobbyId = uuidv4(); // unique ID for the lobby
    lobbies[lobbyId] = {
      id: lobbyId,
      host: hostName,
      players: [{ id: socket.id, name: hostName }],
    };

    socket.join(lobbyId); // The host joins the room associated with that lobby
    console.log(`Lobby created: ${lobbyId} by host: ${hostName}`);
    
    // Return data to the creator
    if (callback) {
      callback({ lobbyId, hostName });
    }

    // Broadcast an updated list of lobbies to everyone
    io.emit('lobbiesList', getLobbiesList());
  });

  // When a user joins an existing lobby
  socket.on('joinLobby', (data, callback) => {
    const { lobbyId, playerName } = data;
    const lobby = lobbies[lobbyId];
    if (lobby) {
      // Add the new player
      lobby.players.push({ id: socket.id, name: playerName });
      socket.join(lobbyId);
      console.log(`${playerName} joined lobby: ${lobbyId}`);

      // Notify the lobby that a new player has joined
      io.to(lobbyId).emit('lobbyData', lobby);

      // Also return updated lobby info to the user that joined
      if (callback) {
        callback(lobby);
      }

      // Broadcast an updated list of lobbies to everyone
      io.emit('lobbiesList', getLobbiesList());
    } else {
      if (callback) {
        callback({ error: 'Lobby not found' });
      }
    }
  });

  socket.on('getLobbyData', (lobbyId, callback) => {
    const lobby = lobbies[lobbyId];
    if (lobby) {
      callback(lobby);
    } else {
      callback({ error: "Lobby not found" });
    }
  });  

  // When a host starts the game (placeholder for future logic)
  socket.on('startGame', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.hostSocketId === socket.id) {
      // Only host can start the game. Add your game start logic here.
      console.log(`Game started in lobby: ${lobbyId}`);
      io.to(lobbyId).emit('gameStarted', { message: 'Game is starting!' });
    }
  });

  // On disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove the disconnecting player from any lobby
    for (let id in lobbies) {
      const lobby = lobbies[id];
      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const [removedPlayer] = lobby.players.splice(playerIndex, 1);

        // If the host left, either remove the lobby or pick a new host
        if (removedPlayer.name === lobby.host) {
          console.log(`Host left. Removing lobby: ${id}`);
          delete lobbies[id];
          io.emit('lobbiesList', getLobbiesList());
          return;
        }

        // Otherwise just update the lobby
        io.to(id).emit('lobbyData', lobby);
        io.emit('lobbiesList', getLobbiesList());
        return;
      }
    }
  });
});

// ----------------- Express Routes (for dev/demo) -----------------
/**
 * Return the list of current lobbies for the landing page
 */
app.get('/api/lobbies', (req, res) => {
  res.json(getLobbiesList());
});

/**
 * In a real app, you'd have more server routes, but in this example we rely
 * heavily on Socket.IO for real-time lobby creation/joining.
 */

// Helper to map in-memory lobbies to a simplified list (for display)
function getLobbiesList() {
  return Object.values(lobbies).map(lobby => ({
    id: lobby.id,
    host: lobby.host,
    playerCount: lobby.players.length,
  }));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
