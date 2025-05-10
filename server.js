'use strict';

import { DudoGame } from './DudoGameS.js';
import { DudoBid } from './DudoBidS.js';

import { CONN_UNUSED, CONN_PLAYER_IN, CONN_PLAYER_OUT, CONN_OBSERVER, CONN_PLAYER_LEFT,
  CONN_PLAYER_IN_DISCONN, CONN_PLAYER_OUT_DISCONN, CONN_OBSERVER_DISCONN } from './DudoGameS.js';

import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// Needed to replicate __dirname in ES modules
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up the Express app and Socket.IO server
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
      players: [{ id: 'socketID', name: 'PlayerName' }, ...], // matches with sockets that socket.io has in the room
      game:  DudoGame object
    }
  */
};

// hear back arrays
let hearbackNextRound;


// ******************************
// Socket.IO setup
// ******************************
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.emit("yourSocketId", socket.id);

  //************************************************************
  // socket.on
  // CREATE LOBBY
  //************************************************************
  socket.on('createLobby', (hostName, callback) => {

    const ggs = new DudoGame();

    ggs.maxConnections = 10;  // &&&for now
    for (let i=0; i<ggs.maxConnections; i++) {
      ggs.allConnectionStatus[i] = CONN_UNUSED;
    }

    const lobbyId = uuidv4();
    lobbies[lobbyId] = {
      id: lobbyId,
      host: hostName,
      hostSocketId: socket.id,
      players: [{ id: socket.id, name: hostName }],
      game: ggs,
    };

    // add host to lobby
    ggs.allParticipantNames[0] = hostName;
    ggs.allConnectionID[0] = socket.id;
    ggs.allConnectionStatus[0] = CONN_PLAYER_IN;

    socket.join(lobbyId);
    console.log(`Lobby created: ${lobbyId} by host: ${hostName}`);
    console.log(`${hostName} joined lobby: ${lobbyId}`);

    // Respond back to creator
    if (callback) {
      callback({ lobbyId, hostName });
    }

    // Update the main lobby list for everyone
    io.emit('lobbiesList', getLobbiesList());
  });

  //************************************************************
  // socket.on
  // JOIN LOBBY
  //************************************************************
  socket.on('joinLobby', (data, callback) => {
    const { lobbyId, playerName } = data;
    const lobby = lobbies[lobbyId];
    if (lobby) {

      // reconcile with DudoGame object
      const ggs = lobby.game;
      const index = ggs.allParticipantNames.indexOf(playerName);  // lookup by name
      if (index == -1) {
        // new player (not reconnecting); add him
        lobby.players.push({ id: socket.id, name: playerName });
        socket.join(lobbyId);

        // add him to game (first unused connection)
        let ptr = 0;
        for (let i=0; i<ggs.maxConnections; i++) {
          if (ggs.allConnectionStatus[i] == CONN_UNUSED) {
            ptr = i;
            break;
          }
        }
        ggs.allParticipantNames[ptr] = playerName;
        ggs.allConnectionID[ptr] = socket.id;
        ggs.allConnectionStatus[ptr] = CONN_PLAYER_IN;
      } else {

        console.log ('joinLobby, PLAYER FOUND.THIS SHOULD NEVER HAPPEN, DELETE LATER &&&');

        // player is in lobby, re-connect him
        ggs.allConnectionID[index] = socket.id;

        if (ggs.allConnectionStatus[index] == CONN_PLAYER_IN_DISCONN) {
          ggs.allConnectionStatus[index] = CONN_PLAYER_IN;
        }
        if (ggs.allConnectionStatus[index] == CONN_PLAYER_OUT_DISCONN) {
          ggs.allConnectionStatus[index] = CONN_PLAYER_OUT;
        }
        if (ggs.allConnectionStatus[index] == CONN_OBSERVER_DISCONN) {
          ggs.allConnectionStatus[index] = CONN_OBSERVER;
        }
      }

      console.log(`${playerName} joined lobby: ${lobbyId}`);

      // Notify everyone in this lobby
      io.to(lobbyId).emit('lobbyData', lobby);

      // Respond to the new joiner
      if (callback) {
        callback(lobby);
      }

      // Update lobby list for the landing page
      io.emit('lobbiesList', getLobbiesList());

      // Broadcast new game state
      io.to(lobbyId).emit('gameStateUpdate', lobby.game);
      console.log("server.js: 'joinlobby': emitting 'gameStateUpdate'");
      
    } else {
      if (callback) {
        callback({ error: 'Lobby not found' });
      }
    }
  });

  //************************************************************
  // socket.on
  // GET LOBBY DATA
  //************************************************************
  socket.on('getLobbyData', (lobbyId, callback) => {
    const lobby = lobbies[lobbyId];
    if (lobby) {
      callback(lobby);
    } else {
      callback({ error: 'Lobby not found' });
    }
  });

  //************************************************************
  // socket.on
  // START GAME
  //************************************************************
  socket.on('startGame', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    if (!lobby) return;

    // for debugging:  show what sockets are actually in the room
    //io.in(lobbyId).fetchSockets().then(sockets => console.log(`Lobby ${lobbyId} has ${sockets.length} sockets:`, sockets.map(s => s.id)));

    // hear back to see who's in or out
    //ggs.inOutMustSay = Array(ggs.maxConnections).fill(false); // &&&nuke this???
    for (let cc=0; cc<ggs.maxConnections; cc++) {
      ggs.inOutMustSay[cc] = false;
      ggs.inOutDidSay[cc] = false;
    }
    ggs.getMustSayInOut();
    
    if (lobby.hostSocketId === socket.id) {
      ggs.bAskInOut = true;
      io.to(lobbyId).emit('gameStateUpdate', lobby.game);
      return;
    }

    //&&&

/*
    console.log(`Game started in lobby: ${lobbyId}`);

    ggs.bRoundInProgress = true;
    ggs.whosTurn = 0;

    StartGame(ggs);

    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    console.log("server.js: 'startGame' emiting 'gameStateUpdate'");
    */
  });

  //************************************************************
  // socket.on
  // LEAVE LOBBY
  // (only from LobbyPage, never from GamePage)
  //************************************************************
  socket.on('leaveLobby', ({ playerName, lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    // get index of player who left
    const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) return;

    // Remove this player from the lobby
    socket.leave(lobbyId);
    const [removedPlayer] = lobby.players.splice(playerIndex, 1);

    // If the removed player was the host
    if (removedPlayer.id === lobby.hostSocketId) {
      console.log(`server.js: Host left lobby. Removing lobby: ${lobbyId}`);

      // delete the lobby from the lobbies array
      delete lobbies[lobbyId];

      // tell everybody else to leave
      io.to(lobbyId).emit('lobbyData', lobby);
      io.emit('lobbiesList', getLobbiesList());
      io.to(lobbyId).emit('forceLeaveLobby', lobby);

      return;
    }

    // Remove this player from game
    const ggs = lobby.game;
    for (let cc=playerIndex; cc < ggs.maxConnections - 1; cc++) {
      ggs.allParticipantNames[cc] = ggs.allParticipantNames[cc+1];
      ggs.allConnectionID[cc]     = ggs.allConnectionID[cc+1];
      ggs.allConnectionStatus[cc] = ggs.allConnectionStatus[cc+1];
      ggs.allSticks[cc]           = ggs.allSticks[cc+1];
      ggs.allPasoUsed[cc]         = ggs.allPasoUsed[cc+1];
    }
    ggs.allParticipantNames[ggs.maxConnections - 1] = '';
    ggs.allConnectionID[ggs.maxConnections - 1]     = '';
    ggs.allConnectionStatus[ggs.maxConnections - 1] = CONN_UNUSED;
    ggs.allSticks[ggs.maxConnections - 1]           = 0;
    ggs.allPasoUsed[ggs.maxConnections - 1]         = false;
    
    console.log(`${playerName} left lobby: ${lobbyId}`)
    io.to(lobbyId).emit('lobbyData', lobby);
    io.emit('lobbiesList', getLobbiesList());
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    console.log("server.js: 'leaveLobby': emitting 'gameStateUpdate'");
/*
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
      console.log(`${playerName} left lobby: ${lobbyId}`);
      io.to(lobbyId).emit('lobbyData', lobby);
    }

    io.emit('lobbiesList', getLobbiesList());
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    console.log("server.js: 'leaveLobby': emitting 'gameStateUpdate'");
*/
  });

  //************************************************************
  // socket.on
  // REJOIN LOBBY (after re-connect)
  //************************************************************
  socket.on('rejoinLobby', ({ lobbyId, playerName, id }, callback) => {

    const lobby = lobbies[lobbyId];
    if (!lobby) return;                 // stale tab or wrong id

    // replace or add this player entry
    const idx = lobby.players.findIndex(p => p.name === playerName);
    if (idx !== -1) {
      lobby.players[idx].id = socket.id;  // swap old id → new id
      console.log("server.js: 'rejoinLobby' swapping old id -> new id for index " + idx);
    } else {

      // THIS SHOULD NEVER HAPPEN, REMOVE LATER

      lobby.players.push({ id: socket.id, name: playerName });
      console.log("server.js: 'rejoinLobby' adding a player " + playerName);
    }

    // reconcile with DudoGame object
    const ggs = lobby.game;
    const index = ggs.allParticipantNames.indexOf(playerName);  // lookup by name
    if (index == -1) {

      console.log ('rejoinLobby, PLAYER NOT FOUND. HIS SHOULD NEVER HAPPEN, DELETE LATER&&&');

      // new player (not reconnecting); add him
      lobby.players.push({ id: socket.id, name: playerName });
      socket.join(lobbyId);

      let ptr = 0;
      for (let i=0; i<ggs.maxConnections; i++) {
        if (ggs.allConnectionStatus[i] == CONN_UNUSED) {
          ptr = i;
          break;
        }
      }
      ggs.allParticipantNames[ptr] = playerName;
      ggs.allConnectionID[ptr] = socket.id;
      ggs.allConnectionStatus[ptr] = CONN_PLAYER_IN;
    } else {
      // player is in lobby, re-connect him
      console.log ("server.js: 'rejoinLobby' resetting DudoGame for ", playerName);

      ggs.allConnectionID[index] = id;

      if (ggs.allConnectionStatus[index] == CONN_PLAYER_IN_DISCONN) {
        ggs.allConnectionStatus[index] = CONN_PLAYER_IN;
      }
      if (ggs.allConnectionStatus[index] == CONN_PLAYER_OUT_DISCONN) {
        ggs.allConnectionStatus[index] = CONN_PLAYER_OUT;
      }
      if (ggs.allConnectionStatus[index] == CONN_OBSERVER_DISCONN) {
        ggs.allConnectionStatus[index] = CONN_OBSERVER;
      }

      // for debugging:  show what sockets are actually in the room
      //io.in(lobbyId).fetchSockets().then(sockets => console.log(`Lobby ${lobbyId} has ${sockets.length} sockets:`, sockets.map(s => s.id)));

    }

    socket.join(lobbyId);               // (re)enter the room
    io.to(lobbyId).emit('lobbyData', lobby); // let everyone refresh

    io.emit('lobbiesList', getLobbiesList());    

    // Send back current lobby state via callback
    if (callback) {
      callback({
        players: lobby.players,
        game: lobby.game
      });
    }

  });

  //************************************************************
  // socket.on
  // PROCESS THE BID
  //************************************************************
  socket.on('bid', ({ lobbyId, bidText, bidShakeShow, index, name }) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    //-------------------------------------------------
    // add this bid to the bid array
    //-------------------------------------------------
    let ptr = ggs.numBids;
    ggs.allBids[ptr].text = bidText;
    ggs.allBids[ptr].playerIndex = index;
    ggs.allBids[ptr].playerName = name;
    if ((bidText !=="PASO") && (bidText !=="DOUBT")) {
      ggs.parseBid(bidText);
      ggs.allBids[ptr].howMany = ggs.parsedHowMany;
      ggs.allBids[ptr].ofWhat = ggs.parsedOfWhat;
      ggs.allBids[ptr].bPaso = false;
      ggs.allBids[ptr].bDudo = false;
      ggs.allBids[ptr].bShakeShow = bidShakeShow;
    }
    if (bidText === "PASO") {
      ggs.allBids[ptr].bPaso = true;
      ggs.allBids[ptr].bDudo = false;
      ggs.allBids[ptr].bShakeShow = false;
      ggs.allPasoUsed[index] = true;
    }
    if (bidText === "DOUBT") {
      ggs.allBids[ptr].bPaso = false;
      ggs.allBids[ptr].bDudo = true;
      ggs.allBids[ptr].bShakeShow = false;
    }
    ggs.numBids++;

    //----------------------------------------------------
    // show and shake?
    //----------------------------------------------------
    ptr = ggs.numBids - 1;
    if (ggs.allBids[ptr].bShakeShow) {
        ggs.allBids[ptr].howManyShaken = 0;
        for (let i = 0; i < 5; i++) {
            ggs.allBids[ptr].bWhichShaken[i] = true;
            ggs.allBids[ptr].bDiceHidden[i] = ggs.bDiceHidden[index][i];
            if (ggs.bDiceHidden[index][i]) {
                let die = ggs.dice[index][i];
                if (ggs.bPaloFijoRound) {
                    if (die == ggs.allBids[ptr].ofWhat) {
                        // they just showed this one, don't shake it
                        ggs.allBids[ptr].howManyShaken++;
                        ggs.allBids[ptr].bWhichShaken[i] = false;
                        ggs.allBids[ptr].bDiceHidden[i] = false;
                        ggs.bDiceHidden[index][i] = false;
                    }
                    
                } else {
                    if ((die == ggs.allBids[ptr].ofWhat) || (die == 1)) {
                        // they just showed this one, don't shake it
                        ggs.allBids[ptr].howManyShaken++;
                        ggs.allBids[ptr].bWhichShaken[i] = false;
                        ggs.allBids[ptr].bDiceHidden[i] = false;
                        ggs.bDiceHidden[index][i] = false;
                    }
                }
            } else {
                // die already showing, don't shake it
                ggs.allBids[ptr].bWhichShaken[i] = false;
            }
        }
        // shake
        for (let i = 0; i < 5; i++) {
            if (ggs.allBids[ptr].bWhichShaken[i]) {
                const random = Math.floor(Math.random() * 6) + 1;
                ggs.dice[ggs.allBids[ptr].playerIndex][i] = random;
            }
        }
    }

    //-------------------------------------------------
    // keep going
    //-------------------------------------------------
    if (!lobby || !lobby.game || !lobby.game.bRoundInProgress) return;

    if (bidText === "DOUBT") {
      // process doubt
      lobby.game.bDoubtInProgress = true;

      ggs.getDoubtResult();
      ggs.getMustLiftCupList();
    //&&&PostRound(ggs);

    } else {
      // Move to the next turn
      lobby.game.whosTurnPrev = lobby.game.whosTurn;
      lobby.game.whosTurn = lobby.game.getWhosTurnNext();
    }

    // Broadcast new game state
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    console.log("server.js: socket.on('bid'): emitting 'gameStateUpdate'");
  });

  //************************************************************
  // socket.on
  // hear back from client: 'liftCup'
  //************************************************************
  socket.on('liftCup', ({ lobbyId, index }) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    // mark this player cup lifted
    ggs.result.doubtCupLifted[index] = true;

    // is that everybody we need to hear from?
    let allLifted = true;
    for (let i=0; i<ggs.maxConnections; i++) {
      if (ggs.result.doubtMustLiftCup[i]) {
        if (!ggs.result.doubtCupLifted[i]) {
          allLifted = false;
          break;
        }
      }
    }

    // re-compute showing and lookage
    ggs.result.doubtShowing = ggs.GetHowManyShowing(ggs.result.doubtOfWhat, ggs.bPaloFijoRound);
    ggs.result.doubtLookingFor = ggs.result.doubtHowMany - ggs.result.doubtShowing;
    if (ggs.result.doubtLookingFor < 0) {
      ggs.result.doubtLookingFor = 0;
    }

    if (allLifted) {
      ggs.bDoubtInProgress = false;
      ggs.bShowDoubtResult = true;
    }
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
   
  });
  
  //************************************************************
  // socket.on
  // hear back from client: 'nextRound'
  //************************************************************
  socket.on('nextRound', ({ lobbyId, index }) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    // mark this player heard back
    hearbackNextRound[index] = true;

    // is that everybody we need to hear from?
    let okToGo = true;
    for (let i=0; i<ggs.maxConnections; i++) {
      if (ggs.allConnectionStatus[i] == CONN_PLAYER_IN) {
        if (!hearbackNextRound[i]) {
          okToGo = false;
          break;
        }
      }
    }

    if (okToGo) {
      lobby.game.bDoubtInProgress = false;
      lobby.game.bShowDoubtResult = false;
      PostRound(lobby.game);
      if (ggs.bWinnerGame) {
        //ggs.bGameInProgress = false;
        ggs.PrepareNextGame();
      } else {
        StartRound(lobby.game);
      }

      io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    }
  });
  
  //************************************************************
  // socket.on
  // hear back from client: 'inOrOut'
  //************************************************************
  socket.on('inOrOut', ({ lobbyId, index, status }) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    // mark this player heard back
    ggs.inOutDidSay[index] = true;
    ggs.allConnectionStatus[index] = status;

    // is that everybody we need to hear from?
    let okToGo = true;
    for (let i=0; i<ggs.maxConnections; i++) {
      if (ggs.allConnectionStatus[i] == CONN_PLAYER_IN) {
        if (!ggs.inOutDidSay[i]) {
          okToGo = false;
          break;
        }
      }
    }

    if (okToGo) {
      ggs.bAskInOut = false;
      ggs.bRoundInProgress = true;  //&&& need this?
      ggs.whosTurn = 0; //&&& need this?
      StartGame(ggs);
    }
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });
  
  //************************************************************
  // socket.on
  // DISCONNECT
  //************************************************************
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Find any lobby that this player was in
    for (let id in lobbies) {
      const lobby = lobbies[id];
      const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        const [removedPlayer] = lobby.players.splice(playerIndex, 1);

        // look for player in DuDoGame object, mark disconnected
        const ggs = lobby.game;
        const index = ggs.allParticipantNames.indexOf(removedPlayer.name);
        if (index != -1) {
          if (ggs.allConnectionStatus[index] == CONN_PLAYER_IN) {
            ggs.allConnectionStatus[index] = CONN_PLAYER_IN_DISCONN;
          }
          if (ggs.allConnectionStatus[index] == CONN_PLAYER_OUT) {
            ggs.allConnectionStatus[index] = CONN_PLAYER_OUT_DISCONN;
          }
          if (ggs.allConnectionStatus[index] == CONN_OBSERVER) {
            ggs.allConnectionStatus[index] = CONN_OBSERVER_DISCONN;
          }
        }

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

// ------------------------------
// Helper: list of available lobbies
// ------------------------------
function getLobbiesList() {
  return Object.values(lobbies).map((lobby) => ({
    id: lobby.id,
    host: lobby.host,
    playerCount: lobby.players.length,
  }));
}

// ------------------------------
// Catch-all handler: For any request that doesn't match an API route,
// send back index.html so that client-side routing can handle it.
// ------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// ------------------------------
// Start server
// ------------------------------
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


//****************************************************************
// Start the game 
//****************************************************************
function StartGame (ggs) {

  ggs.firstRound = true;
  ggs.bPaloFijoRound = false;

  //------------------------------------------------------------
  // give everybody no sticks
  //------------------------------------------------------------
  for (let i = 0; i < ggs.maxConnections; i++) {
      ggs.allSticks[i] = 0;
  }

  // &&& set direction for now
  ggs.whichDirection = 0;

  //&&& for debugging
  //ggs.allConnectionStatus[0] = CONN_OBSERVER;

  ggs.bGameInProgress = true;

  StartRound(ggs);
}

//****************************************************************
// Start a round 
//****************************************************************
function StartRound (ggs) {

    ggs.bWinnerRound = false; 
    ggs.result.init();
    ggs.bRoundInProgress = true;
    ggs.bDoubtInProgress = false;
    ggs.bShowDoubtResult = false;

    ggs.result.doubtCupLifted = Array(ggs.maxConnections).fill(false);
    hearbackNextRound = Array(ggs.maxConnections).fill(false);

    //------------------------------------------------------------
    // first round, randomly choose who goes first
    // (otherwise determined in PostRound())
    //------------------------------------------------------------
    if (ggs.firstRound) {
        //let rr = randomGenerator.nextInt(ggs.GetNumberPlayersStillIn());
        const random = Math.floor(Math.random() * ggs.GetNumberPlayersStillIn());
        let temp = 0;
        for (let cc = 0; cc < ggs.maxConnections; cc++) {
            if (ggs.allConnectionStatus[cc] == CONN_PLAYER_IN) {
                if (random == temp) {
                    ggs.whosTurn = cc;
                    console.log ('server.js: StartRound: randomly picked whosTurn = ' + cc);
                    break;
                }
                temp++;
            }
        }
    }

    //------------------------------------------------------------
    // roll the dice for all players
    //------------------------------------------------------------
    for (let cc = 0; cc < ggs.maxConnections; cc++) {
        if (ggs.allConnectionStatus[cc] == CONN_PLAYER_IN) {
            for (let j = 0; j < 5; j++) {
                const random = Math.floor(Math.random() * 6) + 1;
                //int r = randomGenerator.nextInt(6) + 1;
                ggs.dice[cc][j] = random;
                ggs.bDiceHidden[cc][j] = true;
            }
        }
    }

    //------------------------------------------------------------
    // initialize bidding
    //------------------------------------------------------------
    ggs.numBids = 0;
    for (let i = 0; i < ggs.maxBids; i++) {
        ggs.allBids[i].InitDudoBid();
    }

    for (let i = 0; i < ggs.maxConnections; i++) {
        ggs.allPasoUsed[i] = false;
    }

    //------------------------------------------------------------
    // flip bool after first round
    //------------------------------------------------------------
    if (ggs.firstRound) {
        ggs.firstRound = false;
    }
}

//****************************************************************
// End of round processing 
//****************************************************************
function PostRound(ggs) {
    //------------------------------------------------------------
    // player who lost doubt gets a stick, are they out?
    // determine who goes next
    // and if palofijo
    //------------------------------------------------------------
    ggs.bPaloFijoRound = false;

    // loser gets a stick
    ggs.allSticks[ggs.result.doubtLoser]++;
    
    if (ggs.allSticks[ggs.result.doubtLoser] == ggs.maxSticks) {
        // out! winner of doubt inherits first bid
        ggs.allConnectionStatus[ggs.result.doubtLoser] = CONN_PLAYER_OUT;
        ggs.whosTurn = ggs.result.doubtWinner;
        ggs.bPaloFijoRound = false;
    } else {
        // not out, loser of doubt goes first next round
        ggs.whosTurn = ggs.result.doubtLoser;
        // see if palofijo
        if (ggs.bPaloFijoAllowed && ggs.GetNumberPlayersStillIn() > 2) {
            if (ggs.allSticks[ggs.result.doubtLoser] == ggs.maxSticks - 1) {
                ggs.bPaloFijoRound = true;
            }
        }
    }
    
    ggs.bWinnerRound = true;
}
