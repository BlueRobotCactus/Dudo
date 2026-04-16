'use strict';

import { LobbySession, DudoGame, DudoRound, DudoBid } from './client/src/shared/DudoGame.js';

import { MAX_CONNECTIONS, CONN_UNUSED, CONN_PLAYER_IN, CONN_PLAYER_OUT, CONN_OBSERVER,
  CONN_PLAYER_IN_DISCONN, CONN_PLAYER_OUT_DISCONN, CONN_OBSERVER_DISCONN } from './client/src/shared/DudoGame.js';

import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { getPool } from './db.js';
import bcrypt from 'bcrypt';
import session from 'express-session';

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

//-------------------------------------------
// session middleware (chatgpt)
// cookies
//-------------------------------------------
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});

app.use(sessionMiddleware);

io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// In-memory lobbies storage
const lobbies = {};
/*
  lobbies[lobbyId] = {
    id: lobbyId,
    hostGuid: authedPlayer.guid,
    host: hostName,              // optional display field
    hostSocketId: socket.id,     // temporary, can keep for now
    players: [{
      guid: authedPlayer.guid,
      socketId: socket.id,
      username: authedPlayer.username,
      displayName: hostName
    }],
    game: ggs,
    lobbySession,
  };
*/

const disconnectTimers = {};
/*
  disconnectTimers[lobbyId] = {
    [guid]: {
      intervalId,
      timeoutAt
    }
  };
*/
const COUNTDOWN_SECONDS = 30;

// ******************************
// Socket.IO setup
// ******************************
io.on('connection', (socket) => {

  //---------------------------------------
  // helper functions
  //---------------------------------------
  function getAuthedPlayer(socket) {
    return socket.request?.session?.player || null;
  }
  function findGameIndexByGuid(ggs, guid) {
    return ggs.allParticipantGuid.indexOf(guid);
  }
  function disconnectStatus (status) {
    if (status === CONN_PLAYER_IN)  return CONN_PLAYER_IN_DISCONN;
    if (status === CONN_PLAYER_OUT) return CONN_PLAYER_OUT_DISCONN;
    if (status === CONN_OBSERVER)   return CONN_OBSERVER_DISCONN;
  }
  function reconnectStatus(status) {
    if (status === CONN_PLAYER_IN_DISCONN)  return CONN_PLAYER_IN;
    if (status === CONN_PLAYER_OUT_DISCONN) return CONN_PLAYER_OUT;
    if (status === CONN_OBSERVER_DISCONN)   return CONN_OBSERVER;
    return status;
  }
  function turnPauseON(ggs, name, seconds) {
    ggs.bDisconnectPause = true;
    ggs.disconnectPausedPlayerName = name;
    ggs.disconnectSecondsRemaining = seconds;
  }
  function turnPauseOFF(ggs) {
    ggs.bDisconnectPause = false;
    ggs.disconnectPausedPlayerName = '';
    ggs.disconnectSecondsRemaining = 0;
  }
  
  //----------------------------------------
  function ensureLobbyTimerMap(lobbyId) {
    if (!disconnectTimers[lobbyId]) {
      disconnectTimers[lobbyId] = {};
    }
    return disconnectTimers[lobbyId];
  }

  //----------------------------------------
  function clearDisconnectTimer(lobbyId, guid) {
    const lobbyTimers = disconnectTimers[lobbyId];
    if (!lobbyTimers || !lobbyTimers[guid]) return;

    clearInterval(lobbyTimers[guid].intervalId);
    delete lobbyTimers[guid];

    if (Object.keys(lobbyTimers).length === 0) {
      delete disconnectTimers[lobbyId];
    }
  }

  //----------------------------------------
  // removePlayerFromActiveGame
  //----------------------------------------
  function removePlayerFromActiveGame(ggs, index) {
    if (index < 0) return;

    ggs.allConnectionID.splice(index, 1);
    ggs.allConnectionStatus.splice(index, 1);
    ggs.allParticipantGuid.splice(index,1);
    ggs.allParticipantNames.splice(index,1);

    /*    
    // mark them out
    ggs.allConnectionID[index] = '';
    ggs.allConnectionStatus[index] = CONN_PLAYER_TIMED_OUT;
    ggs.allSticks[index] = 0;
    ggs.allPasoUsed[index] = false;
*/
    // if whose turn / previous turn points to disconnected player,
    // move them to a sane value
    if (ggs.whosTurn === index) {
      ggs.whosTurn = ggs.getWhosTurnNext();
    }
    if (ggs.whosTurnPrev === index) {
      ggs.whosTurnPrev = -1;
    }
  }

  //----------------------------------------
  // handleDisconnectTimeout
  //----------------------------------------
  function handleDisconnectTimeout(lobbyId, guid) {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    const ggs = lobby.game;
    const gameIndex = findGameIndexByGuid(ggs, guid);
    if (gameIndex === -1) return;

    const playerName = ggs.allParticipantNames[gameIndex];

    // only act if they are still disconnected
    if (ggs.allConnectionStatus[gameIndex] !== CONN_PLAYER_IN_DISCONN &&
        ggs.allConnectionStatus[gameIndex] !== CONN_PLAYER_OUT_DISCONN &&
        ggs.allConnectionStatus[gameIndex] !== CONN_OBSERVER_DISCONN) {
      return;
    }

    clearDisconnectTimer(lobbyId, guid);

    // If game not in progress, just leave them disconnected/out of lobby state
    if (!ggs.bGameInProgress) {
      io.to(lobbyId).emit('disconnectCountdownEnded', { playerName, reason: 'timed_out' });
      io.to(lobbyId).emit('lobbyData', lobby);
      io.emit('lobbiesList', getLobbiesList());
      turnPauseOFF (ggs);
      io.to(lobbyId).emit('gameStateUpdate', ggs);
      return;
    }

    // Game is in progress 
    // Observers: simply mark back to observer/out-of-room state
    if (ggs.allConnectionStatus[gameIndex] === CONN_OBSERVER_DISCONN) {
      ggs.allConnectionStatus[gameIndex] = CONN_OBSERVER;
      ggs.allConnectionID[gameIndex] = '';
      io.to(lobbyId).emit('disconnectCountdownEnded', { playerName, reason: 'timed_out' });
      turnPauseOFF (ggs);
      io.to(lobbyId).emit('gameStateUpdate', ggs);
      return;
    }

    const hadAnyBid =
      ggs.bRoundInProgress &&
      ggs.curRound &&
      ggs.curRound.numBids > 0;

    const originalStarter = ggs.curRound?.startingPlayerIndex ?? ggs.whosTurn;

    removePlayerFromActiveGame(ggs, gameIndex);

    // need at least 2 players still in
    if (ggs.GetNumberPlayersStillIn() <= 1) {
      ggs.bRoundInProgress = false;
      ggs.bDoubtInProgress = false;
      ggs.bShowDoubtResult = false;
      ggs.bGameInProgress = false;
      io.to(lobbyId).emit('disconnectCountdownEnded', { playerName, reason: 'timed_out' });
      turnPauseOFF (ggs);
      io.to(lobbyId).emit('gameStateUpdate', ggs);
      return;
    }

    if (hadAnyBid) {
      // discard current round and restart it
      ggs.bDoubtInProgress = false;
      ggs.bShowDoubtResult = false;
      ggs.bDirectionInProgress = false;

      // keep same starting player for restarted round
      ggs.firstRound = false;
      ggs.whosTurn = originalStarter;

      // if starter was the disconnected player, advance to next live player
      if (ggs.whosTurn === gameIndex ||
          ggs.allConnectionStatus[ggs.whosTurn] !== CONN_PLAYER_IN) {
        ggs.whosTurn = ggs.getWhosTurnNext();
      }

      StartRound(ggs);
    } else {
      // no bid yet: player is simply out, game goes on
      if (ggs.whosTurn === gameIndex ||
          ggs.allConnectionStatus[ggs.whosTurn] !== CONN_PLAYER_IN) {
        ggs.whosTurn = ggs.getWhosTurnNext();
      }
    }

    io.to(lobbyId).emit('disconnectCountdownEnded', { playerName, reason: 'timed_out' });
    io.to(lobbyId).emit('lobbyData', lobby);
    io.emit('lobbiesList', getLobbiesList());
    turnPauseOFF (ggs);
    io.to(lobbyId).emit('gameStateUpdate', ggs);
  }

  //----------------------------------------
  // startDisconnectCountdown
  //----------------------------------------
  function startDisconnectCountdown(lobbyId, removedPlayer) {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    const lobbyTimers = ensureLobbyTimerMap(lobbyId);

    clearDisconnectTimer(lobbyId, removedPlayer.guid);

    let secondsRemaining = COUNTDOWN_SECONDS;

    // turn pause ON
    const ggs = lobby.game;
    turnPauseON (ggs, removedPlayer.displayName, secondsRemaining);

    // broadcast updated game state so clients freeze immediately
    io.to(lobbyId).emit('gameStateUpdate', ggs);

    // existing countdown event (you can keep this)
    io.to(lobbyId).emit('disconnectCountdown', {
      playerName: removedPlayer.displayName,
      playerGuid: removedPlayer.guid,
      secondsRemaining
    });

    const intervalId = setInterval(() => {
      const stillLobby = lobbies[lobbyId];
      if (!stillLobby) {
        clearDisconnectTimer(lobbyId, removedPlayer.guid);
        return;
      }

      const ggs = stillLobby.game;
      const gameIndex = findGameIndexByGuid(ggs, removedPlayer.guid);

      if (gameIndex === -1) {
        clearDisconnectTimer(lobbyId, removedPlayer.guid);
        return;
      }

      const status = ggs.allConnectionStatus[gameIndex];
      const stillDisconnected =
        status === CONN_PLAYER_IN_DISCONN ||
        status === CONN_PLAYER_OUT_DISCONN ||
        status === CONN_OBSERVER_DISCONN;

      if (!stillDisconnected) {
        clearDisconnectTimer(lobbyId, removedPlayer.guid);
        return;
      }

      secondsRemaining--;

      // update game state countdown
      ggs.disconnectSecondsRemaining = secondsRemaining;
      io.to(lobbyId).emit('gameStateUpdate', ggs);

      if (secondsRemaining > 0) {
        io.to(lobbyId).emit('disconnectCountdown', {
          playerName: removedPlayer.displayName,
          playerGuid: removedPlayer.guid,
          secondsRemaining
        });
      } else {
        handleDisconnectTimeout(lobbyId, removedPlayer.guid);
      }
    }, 1000);

    lobbyTimers[removedPlayer.guid] = {
      intervalId,
      timeoutAt: Date.now() + (COUNTDOWN_SECONDS * 1000)
    };
  }

  //---------------------------------------
  // END HELPER FUNCTIONS
  //---------------------------------------

  console.log('server.js: New client connected:', socket.id);

  socket.emit("yourSocketId", socket.id);

  //************************************************************
  // socket.on
  // CREATE LOBBY
  //************************************************************
  socket.on('createLobby', (hostName, callback) => {
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    const lobbySession = new LobbySession(hostName);

    const ggs = new DudoGame();

    for (let i=0; i<MAX_CONNECTIONS; i++) {
      ggs.allConnectionStatus[i] = CONN_UNUSED;
    }

    const lobbyId = uuidv4();
    lobbies[lobbyId] = {
      id: lobbyId,
      hostGuid: authedPlayer.guid,
      host: hostName,              // optional display field
      hostSocketId: socket.id,     // temporary, can keep for now
      players: [{
        guid: authedPlayer.guid,
        socketId: socket.id,
        username: authedPlayer.username,
        displayName: hostName
      }],
      game: ggs,
      lobbySession,
    };
    console.log("JUST CREATED LOBBY OBJECT");

    // log the start date/time
    const now = new Date();
    lobbies[lobbyId].lobbySession.startDate = GetDate(now);
    lobbies[lobbyId].lobbySession.startTime = GetTime(now);

    // add host to game
    ggs.allParticipantGuid[0] = authedPlayer.guid;
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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    const { lobbyId, playerName } = data;
    const lobby = lobbies[lobbyId];

    if (lobby) {
      const ggs = lobby.game;

      // First try to find this authenticated user in the game by guid
      const gameIndex = findGameIndexByGuid(ggs, authedPlayer.guid);

//------------------------------------------------------------------- BEGIN

      // ============================================================
      // Prevent same authenticated player from joining twice
      // in two different browsers/tabs at the same time.
      //
      // Allow only:
      //   1) truly new player (gameIndex === -1), or
      //   2) legitimate reconnect from a disconnected state
      //
      // Reject:
      //   same guid already active in lobby on a different socket
      // ============================================================
      if (gameIndex !== -1) {
        const status = ggs.allConnectionStatus[gameIndex];
        const existingSocketId = ggs.allConnectionID[gameIndex];

        const isAlreadyActive =
          status === CONN_PLAYER_IN ||
          status === CONN_PLAYER_OUT ||
          status === CONN_OBSERVER;

        if (isAlreadyActive && existingSocketId && existingSocketId !== socket.id) {
          callback?.({ error: 'You are already in this lobby from another browser or tab.' });
          return;
        }

        // Optional safety: if the same socket somehow calls join again,
        // just return current lobby data instead of reprocessing.
        if (isAlreadyActive && existingSocketId === socket.id) {
          callback?.(lobby);
          return;
        }
      }

//------------------------------------------------------------------- END

      if (gameIndex === -1) {
        // truly new player
        lobby.players.push({
          guid: authedPlayer.guid,
          socketId: socket.id,
          username: authedPlayer.username,
          displayName: playerName
        });

        let ptr = -1;
        for (let i = 0; i < MAX_CONNECTIONS; i++) {
          if (ggs.allConnectionStatus[i] === CONN_UNUSED) {
            ptr = i;
            break;
          }
        }

        if (ptr === -1) {
          callback?.({ error: 'Lobby is full' });
          return;
        }

        socket.join(lobbyId);

        ggs.allParticipantGuid[ptr] = authedPlayer.guid;
        ggs.allParticipantNames[ptr] = playerName;
        ggs.allConnectionID[ptr] = socket.id;
        ggs.allConnectionStatus[ptr] = ggs.bGameInProgress ? CONN_OBSERVER : CONN_PLAYER_IN;
      } else {
        // reconnect / duplicate-join by same authenticated player
        const lobbyIdx = lobby.players.findIndex(p => p.guid === authedPlayer.guid);

        if (lobbyIdx === -1) {
          lobby.players.push({
            guid: authedPlayer.guid,
            socketId: socket.id,
            username: authedPlayer.username,
            displayName: playerName
          });
        } else {
          lobby.players[lobbyIdx].socketId = socket.id;
          lobby.players[lobbyIdx].displayName = playerName;
        }

        socket.join(lobbyId);

        ggs.allParticipantGuid[gameIndex] = authedPlayer.guid;
        ggs.allParticipantNames[gameIndex] = playerName;
        ggs.allConnectionID[gameIndex] = socket.id;
        ggs.allConnectionStatus[gameIndex] = reconnectStatus(ggs.allConnectionStatus[gameIndex]);
        clearDisconnectTimer(lobbyId, authedPlayer.guid);

        if (authedPlayer.guid === lobby.hostGuid) {
          lobby.hostSocketId = socket.id;
        }
      }

      console.log(`server.js: ${playerName} joined lobby: ${lobbyId}`);

      io.to(lobbyId).emit('lobbyData', lobby);

      if (callback) {
        callback(lobby);
      }

      io.emit('lobbiesList', getLobbiesList());

      io.to(lobbyId).emit('gameStateUpdate', lobby.game);
      console.log("server.js: 'joinLobby': emitting 'gameStateUpdate'");
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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

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
      //if (lobby.players.some(p => p.name === nameToCheck)) {
      if (lobby.players.some(p => p.displayName === nameToCheck)) {
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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }
    
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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    // get player index and game index of player who left
    const playerIndex = lobby.players.findIndex((p) => p.socketId === socket.id);    
    if (playerIndex === -1) return;
    const removedPlayer = lobby.players[playerIndex];
    const gameIndex = findGameIndexByGuid(lobby.game, removedPlayer.guid);

    // Remove this player from the lobby
    lobby.players.splice(playerIndex, 1);
    socket.leave(lobbyId);

    // If the removed player was the host
    if (removedPlayer.socketId === lobby.hostSocketId) { 
      console.log(`server.js: Host left lobby. Removing lobby: ${lobbyId}`);

      // log the end date/time
      const now = new Date();
      lobbies[lobbyId].lobbySession.endDate = GetDate(now);
      lobbies[lobbyId].lobbySession.endTime = GetTime(now);

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
    for (let cc=gameIndex; cc < MAX_CONNECTIONS - 1; cc++) {
      ggs.allParticipantGuid[cc]  = ggs.allParticipantGuid[cc+1];
      ggs.allParticipantNames[cc] = ggs.allParticipantNames[cc+1];
      ggs.allConnectionID[cc]     = ggs.allConnectionID[cc+1];
      ggs.allConnectionStatus[cc] = ggs.allConnectionStatus[cc+1];
      ggs.allSticks[cc]           = ggs.allSticks[cc+1];
      ggs.allPasoUsed[cc]         = ggs.allPasoUsed[cc+1];
    }
    ggs.allParticipantGuid[MAX_CONNECTIONS - 1]  = '';
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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    const lobby = lobbies[lobbyId];
    if (!lobby) {
      callback?.({ error: 'Lobby not found' });
      return;
    }

    const ggs = lobby.game;
/*
CHATGPT code that breaks things.  Do we need it?
//------------------------------------------------------------------- BEGIN
    // Find player in game
    const gameIndex = findGameIndexByGuid(ggs, authedPlayer.guid);

    // BLOCK invalid rejoin
    if (gameIndex !== -1) {
      const status = ggs.allConnectionStatus[gameIndex];

      const isDisconnected =
        status === CONN_PLAYER_IN_DISCONN ||
        status === CONN_PLAYER_OUT_DISCONN ||
        status === CONN_OBSERVER_DISCONN;

      if (!isDisconnected) {
        callback?.({ error: 'You are already connected to this lobby from another browser or tab.' });
        return;
      }
    }

    // NOW safe to update lobby.players
//------------------------------------------------------------------- END
*/

    //-------------------------------------------------
    // lobby object
    //-------------------------------------------------
    const lobbyIdx = lobby.players.findIndex(p => p.guid === authedPlayer.guid);
    if (lobbyIdx === -1) {
      lobby.players.push({
        guid: authedPlayer.guid,
        socketId: socket.id,
        username: authedPlayer.username,
        displayName: playerName
      });
      console.log("server.js: 'rejoinLobby' adding a player " + playerName);
    } else {
      lobby.players[lobbyIdx].socketId = socket.id;
      lobby.players[lobbyIdx].displayName = playerName;
      console.log("server.js: 'rejoinLobby' swapping old id -> new id for index " + lobbyIdx);
    }

    //-------------------------------------------------
    // DudoGame object
    //-------------------------------------------------
    const gameIndex = findGameIndexByGuid(ggs, authedPlayer.guid);

    if (gameIndex === -1) {
      console.log("server.js: 'rejoinLobby' guid not found in game; restoring player slot");

      let ptr = -1;
      for (let i = 0; i < MAX_CONNECTIONS; i++) {
        if (ggs.allConnectionStatus[i] === CONN_UNUSED) {
          ptr = i;
          break;
        }
      }

      if (ptr === -1) {
        callback?.({ error: 'Lobby is full' });
        return;
      }

      ggs.allParticipantGuid[ptr] = authedPlayer.guid;
      ggs.allParticipantNames[ptr] = playerName;
      ggs.allConnectionID[ptr] = socket.id;
      ggs.allConnectionStatus[ptr] = ggs.bGameInProgress ? CONN_OBSERVER : CONN_PLAYER_IN;
    } else {
      console.log("server.js: 'rejoinLobby' resetting DudoGame for ", playerName);

      ggs.allParticipantGuid[gameIndex] = authedPlayer.guid;
      ggs.allParticipantNames[gameIndex] = playerName;
      ggs.allConnectionID[gameIndex] = socket.id;
      ggs.allConnectionStatus[gameIndex] = reconnectStatus(ggs.allConnectionStatus[gameIndex]);
    }

    if (authedPlayer.guid === lobby.hostGuid) {
      lobby.hostSocketId = socket.id;
    }
    clearDisconnectTimer(lobbyId, authedPlayer.guid);

    socket.join(lobbyId);
    io.to(lobbyId).emit('disconnectCountdownEnded', { playerName, reason: 'reconnected' });

    turnPauseOFF (ggs);
    io.to(lobbyId).emit('gameStateUpdate', ggs);

    io.to(lobbyId).emit('lobbyData', lobby);
    io.emit('lobbiesList', getLobbiesList());

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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }
    
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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    const ggs = lobby.game;
    if (ggs.bDisconnectPause) return;

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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    const ggs = lobby.game;
    if (ggs.bDisconnectPause) return;

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
                  if (die === ggs.curRound.curBid.ofWhat) {
                      // they just showed this one, don't shake it
                      ggs.curRound.curBid.howManyShown++;
                      ggs.curRound.curBid.bWhichShown[i] = true;
                      ggs.curRound.curBid.bWhichShaken[i] = false;
                      ggs.curRound.curBid.bDiceHidden[i] = false;
                      ggs.bDiceHidden[index][i] = false;
                  }
                  
              } else {
                  if ((die === ggs.curRound.curBid.ofWhat) || (die === 1)) {
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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    const ggs = lobby.game;
    if (ggs.bDisconnectPause) return;

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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    const ggs = lobby.game;
    if (ggs.bDisconnectPause) return;

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
        lobby.lobbySession.Games.push(snapshot);

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
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

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
    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
      const playerIndex = lobby.players.findIndex((p) => p.socketId === socket.id);

      if (playerIndex === -1) continue;

      const removedPlayer = lobby.players[playerIndex];

      // remove only from live socket list in lobby.players
      lobby.players.splice(playerIndex, 1);

      const ggs = lobby.game;
      const gameIndex = findGameIndexByGuid(ggs, removedPlayer.guid);

      let bCountDown = true;
      if (gameIndex !== -1) {
        ggs.allConnectionID[gameIndex] = '';
        let status = ggs.allConnectionStatus[gameIndex];
        // do we countdown?
        if (ggs.bGameInProgress) {
          // game in progress: YES
          if (status === CONN_PLAYER_IN)  bCountDown = true;
          if (status === CONN_PLAYER_OUT) bCountDown = false;
          if (status === CONN_OBSERVER)   bCountDown = false;
        }
        if (!ggs.bGameInProgress) {
          // game in progress: NO
          if (status === CONN_PLAYER_IN)  bCountDown = false;
          if (status === CONN_PLAYER_OUT) bCountDown = false;
          if (status === CONN_OBSERVER)   bCountDown = false;
        }
        // now flip statuses to disconnected
        ggs.allConnectionStatus[gameIndex] = disconnectStatus(status);
      }

      io.to(lobbyId).emit('lobbyData', lobby);
      io.emit('lobbiesList', getLobbiesList());
      io.to(lobbyId).emit('gameStateUpdate', ggs);

      if (bCountDown) {
        startDisconnectCountdown(lobbyId, removedPlayer);
      }
      break;
    }
  });

  //************************************************************
  // socket.on
  // BidUIMode
  //************************************************************
  socket.on('BidUIMode', ({ lobbyId, index, UIMode }) => {
    const authedPlayer = getAuthedPlayer(socket);
    if (!authedPlayer) {
      return;
    }

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

//**************************************************************
//  Express endpoints (appended to '/api/')
//**************************************************************

// ------------------------------
// GET: Lobbies
// ------------------------------
app.get('/api/lobbies', (req, res) => {
  res.json(getLobbiesList());
});

// ------------------------------
// AUTH POST: login
// ------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const pool = getPool();

    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Username and password are required',
      });
    }

    const [rows] = await pool.query(
      'SELECT id, guid, username, password_hash, created_at FROM players WHERE username = ?',
      [username]
    );

    const player = rows[0];
    const DUMMY_PASSWORD_HASH = '$2b$10$C6UzMDM.H6dfI/f/IKcEeOq7V0dKqzE6p5nK3X1i7tGZV5pJ8Q2W6';
    if (!player) {
      // fake comparison to equalize timing
      // hackers can probe endpoint and tell when a username exists by the timing
      // if username exists, decryption of pw takes a 'long time'. 
      // so we decrypt this dummy even if username does not exist.
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);

      return res.status(401).json({
        ok: false,
        error: 'Invalid username or password',
      });
    }
    const passwordMatches = await bcrypt.compare(password, player.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid username or password',
      });
    }

    // remember the browser session
    req.session.player = {
      id: player.id,
      guid: player.guid,
      username: player.username,
    };

    res.json({
      ok: true,
      player: {
        id: player.id,
        guid: player.guid,
        username: player.username,
        created_at: player.created_at,
      },
    });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// ------------------------------
// PLAYERS GET: list players
// ------------------------------
app.get('/api/players', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, guid, username, created_at FROM players'
    );
    res.json({ ok: true, players: rows });
  } catch (err) {
    console.error('Players query failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ------------------------------
// PLAYERS POST: add player
// ------------------------------
app.post('/api/players', async (req, res) => {
  try {
    const pool = getPool();

    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();
    
    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Username and password are required',
      });
    }

    const guid = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO players (guid, username, password_hash) VALUES (?, ?, ?)',
      [guid, username, passwordHash]
    );

    res.json({
      ok: true,
      player: {
        id: result.insertId,
        guid,
        username,
      },
    });
  } catch (err) {
    console.error('Add player failed:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        ok: false,
        error: 'Username already exists',
      });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// ------------------------------
// PLAYERS DELETE: delete a player
// ------------------------------
app.delete('/api/players/:id', async (req, res) => {
  try {
    const pool = getPool();
    const playerId = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM players WHERE id = ?',
      [playerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Player not found' });
    }

    res.json({ ok: true, deletedId: playerId });
  } catch (err) {
    console.error('Delete player failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ------------------------------
// PLAYERS PUT: reset password
// ------------------------------
app.put('/api/players/:id/password', async (req, res) => {
  try {
    const pool = getPool();
    const playerId = req.params.id;
    const { password } = req.body;

    if (!password || !password.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Password is required',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'UPDATE players SET password_hash = ? WHERE id = ?',
      [passwordHash, playerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Player not found',
      });
    }

    res.json({
      ok: true,
      updatedId: playerId,
    });
  } catch (err) {
    console.error('Reset password failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ------------------------------
// AUTH GET: current logged-in player
// ------------------------------
app.get('/api/auth/me', (req, res) => {
  if (!req.session.player) {
    return res.status(401).json({
      ok: false,
      error: 'Not logged in',
    });
  }

  res.json({
    ok: true,
    player: req.session.player,
  });
});

// ------------------------------
// AUTH POST: logout
// ------------------------------
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout failed:', err);
      return res.status(500).json({
        ok: false,
        error: 'Logout failed',
      });
    }

    res.clearCookie('connect.sid');

    res.json({
      ok: true,
      message: 'Logged out',
    });
  });
});

//**************************************************************
//  end of Express endpoints
//**************************************************************

// Serve all the static files in the React app's build folder
app.use(express.static(path.join(__dirname, 'client', 'build')));

// ------------------------------
// Catch-all handler: For any request that doesn't match an API route,
// send back index.html so that client-side routing can handle it.
// ------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
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
// Start server
// ------------------------------
const PORT = process.env.PORT || 8080;
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
        const random = Math.floor(Math.random() * ggs.GetNumberPlayersStillIn());
        let temp = 0;
        for (let cc = 0; cc < MAX_CONNECTIONS; cc++) {
            if (ggs.allConnectionStatus[cc] === CONN_PLAYER_IN) {
                if (random === temp) {
                    ggs.whosTurn = cc;
                    console.log ('server.js: StartRound: randomly picked whosTurn = ' + cc);
                    break;
                }
                temp++;
            }
        }
    }
    ggs.curRound.startingPlayerIndex = ggs.whosTurn; 

    //------------------------------------------------------------
    // roll the dice for all players
    //------------------------------------------------------------
    for (let cc = 0; cc < MAX_CONNECTIONS; cc++) {
        if (ggs.allConnectionStatus[cc] === CONN_PLAYER_IN) {
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
    
    if (ggs.allSticks[ggs.curRound.doubtLoser] === ggs.maxSticks) {
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
            if (ggs.allSticks[ggs.curRound.doubtLoser] === ggs.maxSticks - 1) {
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
