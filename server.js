'use strict';

import { DudoGame } from './DudoGameS.js';
import { DudoBid } from './DudoBidS.js';

import { CONNECTION_UNUSED, CONNECTION_PLAYER_IN, CONNECTION_PLAYER_OUT, CONNECTION_OBSERVER } from './DudoGameS.js';

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
      players: [{ id: 'socketID', name: 'PlayerName' }, ...],
      game: {
        bRoundInProgress: false,
        whosTurn: 0, 
        // other game-specific fields...
      }
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
    const lobbyId = uuidv4();
    const newGame = new DudoGame();
    lobbies[lobbyId] = {
      id: lobbyId,
      host: hostName,
      hostSocketId: socket.id,
      players: [{ id: socket.id, name: hostName }],
      game: newGame,
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

  //************************************************************
  // socket.on
  // JOIN LOBBY
  //************************************************************
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
    if (!lobby) return;

    // Only the host can start the game
    if (lobby.hostSocketId === socket.id) {

      console.log(`Game started in lobby: ${lobbyId}`);

      const ggs = lobby.game;
      ggs.bRoundInProgress = true;
      ggs.whosTurn = 0;

      // init connnection stuff from java - &&& fix up later
      ggs.maxConnections = 10;  // &&&for now
      for (let i=0; i<lobby.game.maxConnections; i++) {
        ggs.allConnectionStatus[i] = CONNECTION_UNUSED;
      }

      // load player names from lobby
      ggs.numPlayers = lobby.players.length;
      for (let i=0; i<lobby.players.length; i++) {
        ggs.allParticipantNames[i] = lobby.players[i].name;
        // deal with connection status later (player vs. observer)
        ggs.allConnectionStatus[i] = CONNECTION_PLAYER_IN;
        ggs.allConnectionID[i] = lobby.players[i].id;
      }

      StartGame(ggs);

      // Emit to all players in the lobby
      //&&& do we need this?
      io.to(lobbyId).emit('gameStarted', {
        lobbyId,
        gameState: ggs,
      });
      console.log("server.js: emitting 'gameStarted'");
    }
  });

  //************************************************************
  // socket.on
  // LEAVE LOBBY
  //************************************************************
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

    io.emit('lobbiesList', getLobbiesList());
  });

  //************************************************************
  // socket.on
  // REJOIN LOBBY (after re-connect)
  //************************************************************
  socket.on('rejoinLobby', ({ lobbyId, playerName }) => {

    const lobby = lobbies[lobbyId];
    if (!lobby) return;                 // stale tab or wrong id

    // replace or add this player entry
    const idx = lobby.players.findIndex(p => p.name === playerName);
    if (idx !== -1) {
      lobby.players[idx].id = socket.id;  // swap old id → new id
      console.log("server.js: 'rejoinLobby' swapping old id -> new id for index " + idx);
    } else {
      lobby.players.push({ id: socket.id, name: playerName });
      console.log("server.js: 'rejoinLobby' adding a player " + playerName);
    }

    socket.join(lobbyId);               // (re)enter the room
    io.to(lobbyId).emit('lobbyData', lobby); // let everyone refresh

    io.emit('lobbiesList', getLobbiesList());    
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
      ggs.getDoubtResult();

      PostRound(ggs);

      //StartRound(ggs);  chatgpt

    } else {
      // Move to the next turn
      lobby.game.whosTurnPrev = lobby.game.whosTurn;
      lobby.game.whosTurn = lobby.game.getWhosTurnNext();
      //lobby.game.whosTurn = (lobby.game.whosTurn + 1) % lobby.players.length;
    }

    // Broadcast new game state
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    console.log("server.js: socket.on('bid'): emitting 'gameStateUpdate'");
  });

  //************************************************************
  // socket.on
  // hear back from client: 'nextRound'
  //************************************************************
  socket.on('nextRound', ({ lobbyId, index }) => {
    const lobby = lobbies[lobbyId];

    hearbackNextRound[index] = true;
    let okToGo = true;
    for (let i=0; i<hearbackNextRound.length; i++) {
      if (hearbackNextRound[i] == false) {
        okToGo = false;
        break;
      }
    }
    if (okToGo) {
      StartRound(lobby.game);   // => resets bWinnerRound = false
      io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    }
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
//****************************************************************
//****************************************************************
//
// Routines ported from java
//
//****************************************************************
//****************************************************************
//****************************************************************


//****************************************************************
// Start the game 
//****************************************************************
function StartGame (ggs) {

  ggs.firstRound = true;
  ggs.bPaloFijoRound = false;

  //------------------------------------------------------------
  // give everybody no sticks
  //------------------------------------------------------------
  for (let i = 0; i < ggs.numPlayers; i++) {
      ggs.allSticks[i] = 0;
  }

  //------------------------------------------------------------
  // put all players in
  // (must do after 1st game of session)
  //------------------------------------------------------------
  ggs.numPlayers = 0;
  for (let cc = 0; cc < ggs.maxConnections; cc++) {
      if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
          ggs.allConnectionStatus[cc] = CONNECTION_PLAYER_IN;
          ggs.numPlayers++;
      }
  }

  // &&& set direction for now
  ggs.whichDirection = 0;

  /*
  //------------------------------------------------------------
  // tell everybody new statueses
  // (must do after 1st game of session)
  //------------------------------------------------------------
  for (int cc = 0; cc < maxConnections; cc++) {
      if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
          playerConnection[cc].sendAllConnectionStatus();
      }
  }
  //------------------------------------------------------------
  // tell everybody that game is starting
  //------------------------------------------------------------
  for (int cc = 0; cc < maxConnections; cc++) {
      if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
          playerConnection[cc].sendStartGame();
      }
  }
*/
  StartRound(ggs);

}

//****************************************************************
// Start a round 
//****************************************************************
function StartRound (ggs) {

//    Random randomGenerator = new Random();
/*
    //------------------------------------------------------------
    // tell all players we're starting
    //------------------------------------------------------------
    for (int cc = 0; cc < ggs.maxPlayers; cc++) {
        if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
            playerConnection[cc].sendStartRound();
        }
    }        
*/
    ggs.bWinnerRound = false; 
    ggs.result.init();
    //    ggs.bWinnerRound = false;
    ggs.bRoundInProgress = true;

    hearbackNextRound = Array(ggs.numPlayers).fill(false);

    //------------------------------------------------------------
    // first round, randomly choose who goes first
    // (otherwise determined in PostRound())
    //------------------------------------------------------------
    if (ggs.firstRound) {
        //let rr = randomGenerator.nextInt(ggs.GetNumberPlayersStillIn());
        const random = Math.floor(Math.random() * ggs.GetNumberPlayersStillIn());
        let temp = 0;
        for (let cc = 0; cc < ggs.maxConnections; cc++) {
            if (ggs.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
                if (random == temp) {
                    ggs.whosTurn = cc;
                    console.log ('server.js: StartRound: randomly picked whosTurn = ' + cc);
                    break;
                }
                temp++;
            }
        }
    }
/*
    //------------------------------------------------------------
    // tell all players who goes first
    //------------------------------------------------------------
    for (int cc = 0; cc < ggs.maxPlayers; cc++) {
        if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
            playerConnection[cc].sendGoesFirst(ggs.whosTurn);
        }
    }      
*/    
    //------------------------------------------------------------
    // roll the dice for all players
    //------------------------------------------------------------
    for (let cc = 0; cc < ggs.maxConnections; cc++) {
        if (ggs.allConnectionStatus[cc] == CONNECTION_PLAYER_IN) {
            for (let j = 0; j < 5; j++) {
                const random = Math.floor(Math.random() * 6) + 1;
                //int r = randomGenerator.nextInt(6) + 1;
                ggs.dice[cc][j] = random;
                ggs.bDiceHidden[cc][j] = true;
            }
        }
    }
/*    
    //------------------------------------------------------------
    // send dice to all players
    //------------------------------------------------------------
    for (int cc = 0; cc < ggs.maxPlayers; cc++) {
        if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
            playerConnection[cc].sendAllDice();
        }
    }
    
    //------------------------------------------------------------
    // send sticks to everybody
    //------------------------------------------------------------
    for (int cc = 0; cc < ggs.maxConnections; cc++) {
        if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
            playerConnection[cc].sendAllSticks();
        }
    }      

    //if (ggs.firstRound && (ggs.GetNumberPlayersStillIn() > 2)) {
    if (ggs.GetNumberPlayersStillIn() > 2) {
        //------------------------------------------------------------
        // tell player who goes first to get direction
        // (we'll send start bidding message when we receive direction)
        //------------------------------------------------------------
        if (ggs.GetNumberPlayersStillIn() > 2) {
            playerConnection[ggs.whosTurn].sendGetDirection();
        }
    } else {
        //------------------------------------------------------------
        // don't need to get direction
        // send start bidding message to all players
        //------------------------------------------------------------
        for (int cc = 0; cc < ggs.maxPlayers; cc++) {
            if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
                playerConnection[cc].sendStartBidding();
            }
        }        
    }
*/

    //------------------------------------------------------------
    // initialize bidding, and send it to everybody
    //------------------------------------------------------------
    ggs.numBids = 0;
    for (let i = 0; i < ggs.maxBids; i++) {
        ggs.allBids[i].InitDudoBid();
    }

    for (let i = 0; i < ggs.maxPlayers; i++) {
        ggs.allPasoUsed[i] = false;
    }
//    for (let cc = 0; cc < ggs.maxPlayers; cc++) {
//        if (ggs.allConnectionStatus[cc] == CONNECTION_UNUSED) {
//            continue;
//        }
//        playerConnection[cc].sendBid(cc);
//    }

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

    ggs.allSticks[ggs.result.doubtLoser]++;
    
    if (ggs.allSticks[ggs.result.doubtLoser] == ggs.maxSticks) {
        // out! winner of doubt inherits first bid
        ggs.allConnectionStatus[ggs.result.doubtLoser] = CONNECTION_PLAYER_OUT;
        ggs.numPlayers--;
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

    //------------------------------------------------------------
    // was there a winner?
    //------------------------------------------------------------
    if (ggs.numPlayers == 1) {
      ggs.bWinnerGame = true;
      ggs.whoWonGame = ggs.result.doubtWinner;
    
//      const msg = ggs.allParticipantNames[ggs.doubtWinner] + ' WINS !!';
//      io.to(lobbyId).emit('gameWinnergameStateUpdate', lobby.game);
//      io.met('updateGameState', msg);
//      io.to(lobbyId).emit('gameStateUpdate', lobby.game);
//      console.log("server.js: socket.on('bid'): emitting 'gameStateUpdate'");
  
        // yes
        //for (int cc = 0; cc < ggs.maxConnections; cc++) {
        //    if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
        //        playerConnection[cc].sendShowCongratsWinnerDlg(cc);
        //    }
        //}
    } else {
        // no, send connectionStatus (with names)
        //for (int cc = 0; cc < maxConnections; cc++) {
        //    if (ggs.allConnectionStatus[cc] != CONNECTION_UNUSED) {
        //        playerConnection[cc].sendAllConnectionStatus();
        //    }
        //}
    }
}
