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

var theGame;

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

//var theGame = new DudoGame();

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
    lobbies[lobbyId] = {
      id: lobbyId,
      host: hostName,
      hostSocketId: socket.id,
      players: [{ id: socket.id, name: hostName }],
      game: { bRoundInProgress: false }, // We'll store game data here
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

      // **********************************
      // Glenn ported this from java code
      // **********************************

      theGame = new DudoGame();
      lobby.game = theGame;
      lobby.game.bRoundInProgress = true;
      lobby.game.whosTurn = 0;

      // init connnection stuff from java - &&& fix up later
      lobby.game.maxConnections = 10;  // &&&for now
      for (let i=0; i<lobby.game.maxConnections; i++) {
        lobby.game.allConnectionStatus[i] = CONNECTION_UNUSED;
      }

      // load player names from lobby
      lobby.game.numPlayers = lobby.players.length;
      for (let i=0; i<lobby.players.length; i++) {
        lobby.game.allParticipantNames[i] = lobby.players[i].name;
        // deal with connection status later (player vs. observer)
        lobby.game.allConnectionStatus[i] = CONNECTION_PLAYER_IN;
        lobby.game.allConnectionID[i] = lobby.players[i].id;
      }

      StartGame(lobby.game);

      // END GLENN STUFF **********************************

      // Emit to all players in the lobby

      const myJSON = JSON.stringify(lobby.game);


      io.to(lobbyId).emit('gameStarted', {
        lobbyId,
        gameState: lobby.game,
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

    // Update list
    io.emit('lobbiesList', getLobbiesList());
  });

  //************************************************************
  // socket.on
  // PROCESS THE BID
  //************************************************************
  socket.on('bid', ({ lobbyId, bidText, index, name }) => {

    //-------------------------------------------------
    // add this bid to the bid array
    //-------------------------------------------------
    const ggs = theGame;
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
      //ggs.allBids[ptr].shakeShow = myShowShake;   //&&& take care of this
    }
    if (bidText === "PASO") {
      ggs.allBids[ptr].bPaso = true;
      ggs.allBids[ptr].bDudo = false;
      ggs.allBids[ptr].shakeShow = false;
    }
    if (bidText === "DOUBT") {
      ggs.allBids[ptr].bPaso = false;
      ggs.allBids[ptr].bDudo = true;
      ggs.allBids[ptr].shakeShow = false;
    }
    ggs.numBids++;

    //-------------------------------------------------
    // keep going
    //-------------------------------------------------
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game || !lobby.game.bRoundInProgress) return;

    const whosTurn = lobby.game.whosTurn;
    const currentPlayer = lobby.players[whosTurn];
    //if (currentPlayer.id !== socket.id) {
    if (currentPlayer.id.toString() !== socket.id.toString()) {
        console.log('Player attempted to bid out of turn.');
      return;
    }

    if (bidText === "DOUBT") {
      ggs.getDoubtResult();
      PostRound(ggs);
    }


    console.log(`Player ${currentPlayer.name} BID ${bidText} in lobby ${lobbyId}`);

    // Move to the next turn
    lobby.game.whosTurn = (whosTurn + 1) % lobby.players.length;

    // Broadcast new game state

    //&&&
    const myJSON = JSON.stringify(lobby.game);


    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    console.log("server.js: socket.on('bid'): emitting 'gameStateUpdate'");

  });

  //************************************************************
  // socket.on
  // PROCESS THE DOUBT
  //&&& do we need this?
  //************************************************************
  socket.on('doubt', ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.game || !lobby.game.bRoundInProgress) return;

    const whosTurn = lobby.game.whosTurn;
    const currentPlayer = lobby.players[whosTurn];
    if (currentPlayer.id !== socket.id) {
      console.log('Player attempted to doubt out of turn.');
      return;
    }

    console.log(`Player ${currentPlayer.name} DOUBTED in lobby ${lobbyId}. Game ends.`);

    // End the game
    lobby.game.bRoundInProgress = false;
    io.to(lobbyId).emit('gameOver', {
      message: `${currentPlayer.name} ended the game by doubting!`,
      finalGameState: lobby.game,
    });
    console.log("server.js: emitting 'gameOver'");

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
    ggs.result.init();
    ggs.bRoundInProgress = true;

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
                ggs.bDiceHidden[cc][j] = false;
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
        if (ggs.bPaloFijoAllowed) {
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
        StartRound();
    }
}
