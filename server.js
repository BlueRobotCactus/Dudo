'use strict';

import { DudoSession, DudoGame, DudoRound, DudoBid } from './DudoGameS.js';

import { MAX_CONNECTIONS, CONN_UNUSED, CONN_PLAYER_IN, CONN_PLAYER_OUT, CONN_OBSERVER, CONN_PLAYER_LEFT,
  CONN_PLAYER_IN_DISCONN, CONN_PLAYER_OUT_DISCONN, CONN_OBSERVER_DISCONN } from './DudoGameS.js';

import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

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

let session;

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

// ******************************
// Socket.IO setup
// ******************************
io.on('connection', (socket) => {
  console.log('server.js: New client connected:', socket.id);

  socket.emit("yourSocketId", socket.id);

  //************************************************************
  // socket.on
  // CREATE LOBBY
  //************************************************************
  socket.on('createLobby', (hostName, callback) => {

    session = new DudoSession (hostName);

    const ggs = new DudoGame();

    for (let i=0; i<MAX_CONNECTIONS; i++) {
      ggs.allConnectionStatus[i] = CONN_UNUSED;
    }

    const lobbyId = uuidv4();
    lobbies[lobbyId] = {
      id: lobbyId,
      host: hostName,
      hostSocketId: socket.id,
      players: [{ id: socket.id, name: hostName }],
      game: ggs,
      session: session,
    };

    console.log("JUST CREATED LOBBY OBJECT");

    // log the start date/time
    const now = new Date();
    lobbies[lobbyId].session.startDate = GetDate(now);
    lobbies[lobbyId].session.startTime = GetTime(now);

    // add host to lobby
    ggs.allParticipantNames[0] = hostName;
    ggs.allConnectionID[0] = socket.id;
    ggs.allConnectionStatus[0] = CONN_PLAYER_IN;

    socket.join(lobbyId);
    console.log(`server.js: Lobby created: ${lobbyId} by host: ${hostName}`);
    console.log(`server.js: ${hostName} joined lobby: ${lobbyId}`);

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
        for (let i=0; i<MAX_CONNECTIONS; i++) {
          if (ggs.allConnectionStatus[i] == CONN_UNUSED) {
            ptr = i;
            break;
          }
        }
        ggs.allParticipantNames[ptr] = playerName;
        ggs.allConnectionID[ptr] = socket.id;
        if (ggs.bGameInProgress) {
          ggs.allConnectionStatus[ptr] = CONN_OBSERVER;
        } else {
          ggs.allConnectionStatus[ptr] = CONN_PLAYER_IN;
        }
      } else {

        console.log ('server.js: joinLobby, PLAYER FOUND.THIS SHOULD NEVER HAPPEN, DELETE LATER &&&');

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

      console.log(`server.js: ${playerName} joined lobby: ${lobbyId}`);

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
  // CHECK IF NAME EXISTS IN ANY LOBBY, CALLBACK THE RESULT
  //************************************************************
  socket.on('checkNameExists', (nameToCheck, callback) => {
    let nameExists = false;

    for (const lobby of Object.values(lobbies)) {
      if (!Array.isArray(lobby.players)) continue;
      if (lobby.players.some(p => p.name === nameToCheck)) {
        nameExists = true;
        break;
      }
    }

    callback(nameExists); // Send result back to client
  });

  //************************************************************
  // socket.on
  // SET GAME PARAMETERS (HOST ENTERS 'DIALOG')
  //************************************************************
  socket.on('setGameParms', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;
    if (!lobby) return;

    ggs.bSettingGameParms = true;
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });

  //************************************************************
  // socket.on
  // SAVE GAME PARAMETERS (HOST HAS CHOSEN)
  //************************************************************
  socket.on('saveGameParms', (lobbyId, sticks, paso, palofijo) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;
    if (!lobby) return;

    ggs.maxSticks = sticks;
    ggs.bPasoAllowed = paso;
    ggs.bPaloFijoAllowed = palofijo;

    ggs.bSettingGameParms = false;

    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });

  //************************************************************
  // socket.on
  // CANCEL GAME PARAMETERS (HOST HAS CANCELLED)
  //************************************************************
  socket.on('cancelGameParms', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;
    if (!lobby) return;

    ggs.bSettingGameParms = false;

    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });

  //************************************************************
  // socket.on
  // START GAME WITH PARAMETERS
  //************************************************************
  socket.on('startGameWithParms', (lobbyId, sticks, paso, palofijo) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;
    if (!lobby) return;

    ggs.maxSticks = sticks;
    ggs.bPasoAllowed = paso;
    ggs.bPaloFijoAllowed = palofijo;

    // hear back to see who's in or out
    for (let cc=0; cc<MAX_CONNECTIONS; cc++) {
      ggs.inOutMustSay[cc] = false;
      ggs.inOutDidSay[cc] = false;
    }
    ggs.getInOutMustSay();
    
    ggs.bAskInOut = true;
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });

  //************************************************************
  // socket.on
  // START GAME - CANCEL
  //************************************************************
  socket.on('cancelStartGame', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;
    if (!lobby) return;

    for (let cc=0; cc<MAX_CONNECTIONS; cc++) {
      ggs.inOutMustSay[cc] = false;
      ggs.inOutDidSay[cc] = false;
    }
    
    ggs.bAskInOut = false;
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });

  //************************************************************
  // socket.on
  // START GAME (obsolete)
  //************************************************************
  /*
  socket.on('startGame', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;
    if (!lobby) return;

    // for debugging:  show what sockets are actually in the room
    //io.in(lobbyId).fetchSockets().then(sockets => console.log(`Lobby ${lobbyId} has ${sockets.length} sockets:`, sockets.map(s => s.id)));

    // hear back to see who's in or out
    for (let cc=0; cc<MAX_CONNECTIONS; cc++) {
      ggs.inOutMustSay[cc] = false;
      ggs.inOutDidSay[cc] = false;
    }
    ggs.getInOutMustSay();
    
    ggs.bAskInOut = true;
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);

  });
*/
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

      // log the end date/time
      const now = new Date();
      lobbies[lobbyId].session.endDate = GetDate(now);
      lobbies[lobbyId].session.endTime = GetTime(now);

      // delete the lobby from the lobbies array
      delete lobbies[lobbyId];

      // tell everybody else to leave
      io.to(lobbyId).emit('lobbyData', lobby);
      io.emit('lobbiesList', getLobbiesList());
      io.to(lobbyId).emit('forceLeaveLobby', lobby);

      // write the lobby object to file &&&
      try {
        const file = './temp.json';
        const str = JSON.stringify(lobby, null, 2);
        fs.writeFileSync(file, str, 'utf-8');
        console.log(`Debug dump written to ${file}`);
      } catch (err) {
        console.error('Failed to write debug file:', err);
      }

      return;
    }

    // Remove this player from game
    const ggs = lobby.game;
    for (let cc=playerIndex; cc < MAX_CONNECTIONS - 1; cc++) {
      ggs.allParticipantNames[cc] = ggs.allParticipantNames[cc+1];
      ggs.allConnectionID[cc]     = ggs.allConnectionID[cc+1];
      ggs.allConnectionStatus[cc] = ggs.allConnectionStatus[cc+1];
      ggs.allSticks[cc]           = ggs.allSticks[cc+1];
      ggs.allPasoUsed[cc]         = ggs.allPasoUsed[cc+1];
    }
    ggs.allParticipantNames[MAX_CONNECTIONS - 1] = '';
    ggs.allConnectionID[MAX_CONNECTIONS - 1]     = '';
    ggs.allConnectionStatus[MAX_CONNECTIONS - 1] = CONN_UNUSED;
    ggs.allSticks[MAX_CONNECTIONS - 1]           = 0;
    ggs.allPasoUsed[MAX_CONNECTIONS - 1]         = false;
    
    console.log(`server.js: ${playerName} left lobby: ${lobbyId}`)
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
    if (!lobby) return;

    //-------------------------------------------------
    // lobby object
    //-------------------------------------------------
    const idx = lobby.players.findIndex(p => p.name === playerName);
    if (idx == -1) {
      // player not found, add player
      lobby.players.push({ id: socket.id, name: playerName });
      console.log("server.js: 'rejoinLobby' adding a player " + playerName);
    } else {
      // player found, update socket.id
      lobby.players[idx].id = socket.id;
      console.log("server.js: 'rejoinLobby' swapping old id -> new id for index " + idx);
    }

    //-------------------------------------------------
    // DudoGame object
    //-------------------------------------------------
    const ggs = lobby.game;
    const index = ggs.allParticipantNames.indexOf(playerName);  // lookup by name
    if (index == -1) {
      // new player (not reconnecting); add him
      console.log ('server.js: rejoinLobby, PLAYER NOT FOUND. HIS SHOULD NEVER HAPPEN, DELETE LATER&&&');

      //lobby.players.push({ id: socket.id, name: playerName });
      //socket.join(lobbyId);

      let ptr = 0;
      for (let i=0; i<MAX_CONNECTIONS; i++) {
        if (ggs.allConnectionStatus[i] == CONN_UNUSED) {
          ptr = i;
          break;
        }
      }
      ggs.allParticipantNames[ptr] = playerName;
      ggs.allConnectionID[ptr] = socket.id;
      ggs.allConnectionStatus[ptr] = CONN_PLAYER_IN;
    } else {
      // player found, re-connect him
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

      // if host, update socketId
      if (playerName == lobby.host) {
        lobby.hostSocketId = socket.id;
      }

      // stop disconnect counter
      io.to(id).emit('disconnectCountdownEnded', {
        playerName: playerName
      });

      // for debugging:  show what sockets are actually in the room
      //io.in(lobbyId).fetchSockets().then(sockets => console.log(`Lobby ${lobbyId} has ${sockets.length} sockets:`, sockets.map(s => s.id)));
    }

    socket.join(lobbyId);               // (re)enter the room
    io.to(lobbyId).emit('lobbyData', lobby); // let everyone refresh

    io.emit('lobbiesList', getLobbiesList());    

    // Send back current lobby state via callback
    if (callback) {
      callback({
        host: lobby.host,
        players: lobby.players,
        game: lobby.game
      });
    }

  });

  //************************************************************
  // socket.on
  // UI SHAKING/ROLLING
  // need to track this, to avoid re-shaking on reconnect
  //************************************************************
  socket.on('UIShaking', (lobbyId) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    const lastBid = ggs.curRound?.Bids[ggs.curRound?.numBids - 1];
    lastBid.didUIShake = true;

    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    console.log("server.js: socket.on('UIShaking'): emitting 'gameStateUpdate'");
  });



  //************************************************************
  // socket.on
  // PROCESS THE DIRECTION
  //************************************************************
  socket.on('direction', ({ lobbyId, index, direction }) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    ggs.bDirectionInProgress = false;
    ggs.curRound.whichDirection = direction;
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    console.log("server.js: socket.on('direction'): emitting 'gameStateUpdate'");
  });

  //************************************************************
  // socket.on
  // PROCESS THE BID
  //************************************************************
  socket.on('bid', ({ lobbyId, bidText, bidShowShake, index, name }) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    //-------------------------------------------------
    // add this bid to the bid array
    //-------------------------------------------------
    ggs.curRound.curBid.text = bidText;
    ggs.curRound.curBid.playerIndex = index;
    ggs.curRound.curBid.playerName = name;
    if ((bidText !=="PASO") && (bidText !=="DOUBT")) {
      ggs.parseBid(bidText);
      ggs.curRound.curBid.howMany = ggs.parsedHowMany;
      ggs.curRound.curBid.ofWhat = ggs.parsedOfWhat;
      ggs.curRound.curBid.bPaso = false;
      ggs.curRound.curBid.bDudo = false;
      ggs.curRound.curBid.bShowShake = bidShowShake;
    }
    if (bidText === "PASO") {
      ggs.curRound.curBid.bPaso = true;
      ggs.curRound.curBid.bDudo = false;
      ggs.curRound.curBid.bShowShake = false;
      ggs.curRound.curBid.howManyShown = undefined;
      ggs.allPasoUsed[index] = true;
    }
    if (bidText === "DOUBT") {
      ggs.curRound.curBid.bPaso = false;
      ggs.curRound.curBid.bDudo = true;
      ggs.curRound.curBid.bShowShake = false;
      ggs.curRound.curBid.howManyShown = undefined;
    }

    //----------------------------------------------------
    // show and shake?
    //----------------------------------------------------
    if (ggs.curRound.curBid.bShowShake) {
      // initialize shown
      ggs.curRound.curBid.howManyShown = 0;
      ggs.curRound.curBid.bWhichShown = Array(5).fill(false); 
      for (let i = 0; i < 5; i++) {
          ggs.curRound.curBid.bWhichShaken[i] = true;
          ggs.curRound.curBid.bDiceHidden[i] = ggs.bDiceHidden[index][i];
          if (ggs.bDiceHidden[index][i]) {
              let die = ggs.dice[index][i];
              if (ggs.bPaloFijoRound) {
                  if (die == ggs.curRound.curBid.ofWhat) {
                      // they just showed this one, don't shake it
                      ggs.curRound.curBid.howManyShown++;
                      ggs.curRound.curBid.bWhichShown[i] = true;
                      ggs.curRound.curBid.bWhichShaken[i] = false;
                      ggs.curRound.curBid.bDiceHidden[i] = false;
                      ggs.bDiceHidden[index][i] = false;
                  }
                  
              } else {
                  if ((die == ggs.curRound.curBid.ofWhat) || (die == 1)) {
                      // they just showed this one, don't shake it
                      ggs.curRound.curBid.howManyShown++;
                      ggs.curRound.curBid.bWhichShown[i] = true;
                      ggs.curRound.curBid.bWhichShaken[i] = false;
                      ggs.curRound.curBid.bDiceHidden[i] = false;
                      ggs.bDiceHidden[index][i] = false;
                  }
              }
          } else {
              // die already showing, don't shake it
              ggs.curRound.curBid.bWhichShaken[i] = false;
          }
        }
        // shake
        ggs.curRound.curBid.howManyShaken = 0;
        for (let i = 0; i < 5; i++) {
            if (ggs.curRound.curBid.bWhichShaken[i]) {
                const random = Math.floor(Math.random() * 6) + 1;
                ggs.dice[ggs.curRound.curBid.playerIndex][i] = random;
                ggs.curRound.curBid.howManyShaken++;
            }
        }
    }

    //-------------------------------------------------
    // finalize bid in bid array
    //-------------------------------------------------
    // dice
    for (let i=0; i<5; i++) {
      ggs.curRound.curBid.dice[i] = ggs.dice[index][i];
    }
    // showing (on the table) and looking for
    let showing = undefined;
    let lookingFor = undefined;
    if (bidText !== "PASO" && bidText !== "DUDO") {
      showing = ggs.GetHowManyShowing (ggs.parsedOfWhat, ggs.bPaloFijoRound);
      lookingFor = ggs.parsedHowMany - showing;
      if (lookingFor < 0) {
        lookingFor = 0;
      }
    }
    ggs.curRound.curBid.showing = showing;
    ggs.curRound.curBid.lookingFor = lookingFor;

    //-------------------------------------------------
    // push the bid
    //-------------------------------------------------
		ggs.curRound.Bids.push(ggs.curRound.curBid);
    ggs.curRound.numBids++;
    ggs.curRound.curBid = new DudoBid();

    //-------------------------------------------------
    // keep going
    //-------------------------------------------------
    if (!lobby || !lobby.game || !lobby.game.bRoundInProgress) return;

    if (bidText === "DOUBT") {
      // process doubt
      lobby.game.bDoubtInProgress = true;

      ggs.getDoubtResult();
      ggs.getMustLiftCupList();
      ggs.whosTurn = -1;

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
    ggs.doubtDidLiftCup[index] = true;

    // is that everybody we need to hear from?
    let allLifted = true;
    for (let i=0; i<MAX_CONNECTIONS; i++) {
      if (ggs.doubtMustLiftCup[i]) {
        if (!ggs.doubtDidLiftCup[i]) {
          allLifted = false;
          break;
        }
      }
    }

    // re-compute showing and lookage
    ggs.curRound.doubtShowing = ggs.GetHowManyShowing(ggs.curRound.doubtOfWhat, ggs.bPaloFijoRound);
    ggs.curRound.doubtLookingFor = ggs.curRound.doubtHowMany - ggs.curRound.doubtShowing;
    if (ggs.curRound.doubtLookingFor < 0) {
      ggs.curRound.doubtLookingFor = 0;
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
    ggs.nextRoundDidSay[index] = true;

    // is that everybody we need to hear from?
    let okToGo = true;
    for (let i=0; i<MAX_CONNECTIONS; i++) {
      if (ggs.nextRoundMustSay[i]) {
        if (!ggs.nextRoundDidSay[i]) {
          okToGo = false;
          break;
        }
      }
    }

    if (okToGo) {
      //-----------------------------------
      // the round is over
      //-----------------------------------
      lobby.game.bDoubtInProgress = false;
      lobby.game.bShowDoubtResult = false;

      PostRound(lobby.game, lobbyId);
      
      if (ggs.bWinnerGame) {
      //-----------------------------------
      // the game is over
      //-----------------------------------
        ggs.GetOrderOfFinish();

        // log the end date/time
        const now = new Date();
        ggs.endDate = GetDate(now);
        ggs.endTime = GetTime(now);

        // save this game
        const snapshot = JSON.parse(JSON.stringify(lobby.game));
        session.Games.push(snapshot);
        
        ggs.PrepareNextGame();
      } else {
        StartRound(lobby.game);
      }
    }

    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
    ggs.bBlinkSticks = false;
    ggs.bBlinkSticksPlayer = undefined;

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
    for (let i=0; i<MAX_CONNECTIONS; i++) {
      if (ggs.inOutMustSay[i]) {
        if (!ggs.inOutDidSay[i]) {
          okToGo = false;
          break;
        }
      }
    }

    if (okToGo) {
      ggs.bAskInOut = false;
      // need 2 or more players
      if (ggs.GetNumberPlayersStillIn() > 1) {
        ggs.bRoundInProgress = true;  //&&& need this?
        ggs.whosTurn = 0; //&&& need this?
        StartGame(ggs);
      } else {
        // anything? &&&
      }
    }
    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });
  
  //************************************************************
  // socket.on
  // DISCONNECT
  //************************************************************
  socket.on('disconnect', () => {
    console.log('server.js: Client disconnected:', socket.id);

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
/*
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
*/


//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
// start
/*
        io.to(id).emit('lobbyData', lobby);

        // Start disconnect countdown
        const countdownDuration = 10;
        let secondsRemaining = countdownDuration;

        io.to(id).emit('disconnectCountdown', {
          playerName: removedPlayer.name,
          secondsRemaining
        });

        console.log('server.js: setting 30 second interval timer');
        const intervalId = setInterval(() => {
          secondsRemaining--;

          if (secondsRemaining > 0) {
            // still giving them time for re-connect
            io.to(id).emit('disconnectCountdown', {
              playerName: removedPlayer.name,
              secondsRemaining
            });
          } else {
            // time's up
            console.log("server.js: clearing 30 second interval timer; time's up");
            clearInterval(intervalId);

            io.to(id).emit('disconnectCountdownEnded', {
              playerName: removedPlayer.name
            });
          }
        }, 1000);
*/        
// end
//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
      }
    }
  });

  //************************************************************
  // socket.on
  // BidUIMode
  //************************************************************
  socket.on('BidUIMode', ({ lobbyId, index, UIMode }) => {
    const lobby = lobbies[lobbyId];
    const ggs = lobby.game;

    ggs.allBidUIMode[index] = UIMode;
    console.log('server.js: BidUIMode (index,mode): ', index, ' ', UIMode);

    io.to(lobbyId).emit('gameStateUpdate', lobby.game);
  });

});
//**************************************************************
//**************************************************************
//  end of socket.on
//**************************************************************
//**************************************************************

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
  for (let i = 0; i < MAX_CONNECTIONS; i++) {
      ggs.allSticks[i] = 0;
  }

  //&&& for debugging
  //ggs.allConnectionStatus[0] = CONN_OBSERVER;

  ggs.bGameInProgress = true;

  //------------------------------------------------------------
  // log the start date/time
  //------------------------------------------------------------
  const now = new Date();
  ggs.startDate = GetDate(now);
  ggs.startTime = GetTime(now);

  StartRound(ggs);
}

//****************************************************************
// Start a round 
//****************************************************************
function StartRound (ggs) {

		ggs.curRound = new DudoRound();
		ggs.curRound.init();

    ggs.bRoundInProgress = true;
    ggs.bDoubtInProgress = false;
    ggs.bShowDoubtResult = false;

    if (ggs.GetNumberPlayersStillIn() > 2) {
      ggs.bDirectionInProgress = true;
      ggs.curRound.whichDirection = undefined;
    } else {
      ggs.bDirectionInProgress = false;
      ggs.curRound.whichDirection = 0;
    }

    ggs.doubtDidLiftCup = Array(MAX_CONNECTIONS).fill(false);  // &&& need this?
    ggs.nextRoundMustSay = Array(MAX_CONNECTIONS).fill(false);       // &&& need this?
    ggs.nextRoundDidSay = Array(MAX_CONNECTIONS).fill(false);       // &&& need this?
    ggs.getNextRoundMustSay();

    //------------------------------------------------------------
    // first round, randomly choose who goes first
    // (otherwise determined in PostRound())
    //------------------------------------------------------------
    if (ggs.firstRound) {

        //let rr = randomGenerator.nextInt(ggs.GetNumberPlayersStillIn());
        const random = Math.floor(Math.random() * ggs.GetNumberPlayersStillIn());
        let temp = 0;
        for (let cc = 0; cc < MAX_CONNECTIONS; cc++) {
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
    for (let cc = 0; cc < MAX_CONNECTIONS; cc++) {
        if (ggs.allConnectionStatus[cc] == CONN_PLAYER_IN) {
            for (let j = 0; j < 5; j++) {
                const random = Math.floor(Math.random() * 6) + 1;
                //int r = randomGenerator.nextInt(6) + 1;
                ggs.dice[cc][j] = random;
                ggs.bDiceHidden[cc][j] = true;
                ggs.bDiceHilite[cc][j] = false;
            }
        }
    }

    //------------------------------------------------------------
    // initialize bidding
    //------------------------------------------------------------
		ggs.curRound.Bids.length = 0; // reset bids
    ggs.curRound.numBids = 0;
/* &&&		
    ggs.numBids = 0;
    for (let i = 0; i < ggs.maxBids; i++) {
        ggs.allBids[i].InitDudoBid();
    }
*/
    for (let i = 0; i < MAX_CONNECTIONS; i++) {
        ggs.allPasoUsed[i] = false;
    }
}

//****************************************************************
// End of round processing 
//****************************************************************
function PostRound(ggs, lobbyId) {
    //------------------------------------------------------------
    // player who lost doubt gets a stick, are they out?
    // determine who goes next
    // and if palofijo
    //------------------------------------------------------------
    ggs.bPaloFijoRound = false;

    // loser gets a stick
    ggs.allSticks[ggs.curRound.doubtLoser]++;
    
    if (ggs.allSticks[ggs.curRound.doubtLoser] == ggs.maxSticks) {
        // out! winner of doubt inherits first bid
        ggs.allConnectionStatus[ggs.curRound.doubtLoser] = CONN_PLAYER_OUT;
        ggs.allSticks[ggs.curRound.doubtLoser] = 0;  
        ggs.whosTurn = ggs.curRound.doubtWinner;
        ggs.bPaloFijoRound = false;
    } else {
        // not out, loser of doubt goes first next round
        ggs.whosTurn = ggs.curRound.doubtLoser;
        // see if palofijo
        if (ggs.bPaloFijoAllowed && ggs.GetNumberPlayersStillIn() > 2) {
            if (ggs.allSticks[ggs.curRound.doubtLoser] == ggs.maxSticks - 1) {
                ggs.bPaloFijoRound = true;
            }
        }

        ggs.bBlinkSticks = true;
        ggs.bBlinkSticksPlayer = ggs.curRound.doubtLoser;
        //io.to(lobbyId).emit('blinkSticks', ggs.curRound.doubtLoser);
    }
    
    //------------------------------------------------------------
    // push the round  
    //------------------------------------------------------------
		ggs.Rounds.push(ggs.curRound);

		//------------------------------------------------------------
    // flip bool after first round
    //------------------------------------------------------------
    if (ggs.firstRound) {
        ggs.firstRound = false;
    }

}

//****************************************************************
// Date/time functions
// input: Date object
// output:  "mm/dd/yy" or "hh:mm:ss"
//****************************************************************
function GetDate (date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // getMonth is 0-based
  const dd = String(date.getDate()).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const dateStr = `${mm}/${dd}/${yy}`;
  return dateStr;
}

function GetTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  const timeStr = `${hh}:${min}:${sec}`;
  return timeStr;
}
