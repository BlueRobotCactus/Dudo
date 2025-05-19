import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { SocketContext } from '../SocketContext.js';
import { DudoGame } from '../DudoGameC.js'

import { BidDlg } from '../Dialogs.js';
import { DoubtDlg } from '../Dialogs.js';
import { ShowShakeDlg } from '../Dialogs.js';
import { ConfirmBidDlg } from '../Dialogs.js';
import { OkDlg } from '../Dialogs.js';
import { YesNoDlg } from '../Dialogs.js';

import { CONN_UNUSED, CONN_PLAYER_IN, CONN_PLAYER_OUT, CONN_OBSERVER, CONN_PLAYER_LEFT,
  CONN_PLAYER_IN_DISCONN, CONN_PLAYER_OUT_DISCONN, CONN_OBSERVER_DISCONN } from '../DudoGameC.js';;

  //************************************************************
  // GamePage function
  //************************************************************
  function GamePage() {
    console.log("GamePage: entering GamePage ()");

    // get our socket id
    const { socket, socketId, connected } = useContext(SocketContext);

    // routing params
    const { lobbyId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const playerName = location.state?.playerName || sessionStorage.getItem('playerName') || '';

    // state hooks
    const [gameState, setGameState] = useState({});
    const [lobby, setLobby] = useState([]);
    const [lobbyHost, setLobbyHost] = useState([]);
    const [lobbyPlayers, setLobbyPlayers] = useState([]);
    const [screenSize, setScreenSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    const [ggc] = useState(() => new DudoGame());
    const [possibleBids, setPossibleBids] = useState([]);

    const [myIndex, setMyIndex] = useState(0);
    const [myName, setMyName] = useState('');
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [whosTurnName, setWhosTurnName] = useState('');
    const [imagesReady, setImagesReady] = useState(false);

    const [showCountdown, setShowCountdown] = useState(false);
    // structure: { playerName: 'Alice', secondsRemaining: 23 }
    const [countdownMessage, setCountdownMessage] = useState('');
    
    // dialogs
    // bid
    const [showBidDlg, setShowBidDlg] = useState(false);
    const [bidPosition, setBidPosition] = useState({ x: 200, y: 200 });
    const [bidTitle, setBidTitle] = useState('');
    const [thisBid, setThisBid] = useState('');

    // show doubt
    const [showDoubtDlg, setShowDoubtDlg] = useState(false);
    const [doubtPosition, setDoubtPosition] = useState({ x: 200, y: 240 });
    const [doubtTitle, setDoubtTitle] = useState('');
    const [doubtMessage, setDoubtMessage] = useState('');
    const [doubtShowButton, setDoubtShowButton] = useState('');
    const [doubtButtonText, setDoubtButtonText] = useState('');
    const [doubtEvent, setDoubtEvent] = useState('');

    // show and shake
    const [showShowShakeDlg, setShowShakeDlg] = useState(false);
    const [showShakePosition, setShowShakePosition] = useState({ x: 200, y: 200 });
    const [showShakeTitle, setShowShakeTitle] = useState('');
    const [showShakeMessage, setShowShakeMessage] = useState('');

    // confirmBid (nuke? &&&)
    const [showConfirmBidDlg, setShowConfirmBidDlg] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');

    // OK
    const [showOkDlg, setShowOkDlg] = useState(false);
    const [okPosition, setOkPosition] = useState({ x: 200, y: 200 });
    const [okTitle, setOkTitle] = useState('');
    const [okMessage, setOkMessage] = useState('');
    const [onOkHandler, setOnOkHandler] = useState(() => () => {});

    // Yes / No
    const [showYesNoDlg, setShowYesNoDlg] = useState(false);
    const [yesNoPosition, setYesNoPosition] = useState({ x: 200, y: 200 });
    const [yesNoTitle, setYesNoTitle] = useState('');
    const [yesNoMessage, setYesNoMessage] = useState('');
    const [yesText, setYesText] = useState('');
    const [noText, setNoText] = useState('');
    const [yesShowButton, setYesShowButton] = useState(true);
    const [noShowButton, setNoShowButton] = useState(true);
    const [xShowButton, setXShowButton] = useState(true);
    const [onYesHandler, setOnYesHandler] = useState(() => () => {});  // default no-op
    const [onNoHandler, setOnNoHandler] = useState(() => () => {});  // default no-op

    // Refs
    const canvasRef = useRef(null);
    const cupDownImageRef = useRef(null);
    const cupUpImageRef = useRef(null);
    const diceImagesRef = useRef({});
    const diceHiddenImageRef = useRef({});
    const myShowShakeRef = useRef(false);
    const needRejoin = useRef(false);
    const amIHost = useRef(null);

    // Refs debugging
    const prevReconnect = useRef(null);
    const prevDraw = useRef(null);


    //************************************************************
    // UseEffect DEBUG [socket, gameState]
    //           put socket into windows so
    //           browser console can access it
    //************************************************************
    useEffect(() => {
      if (socket) {
        window.socket = socket;  // Expose socket globally for DevTools
        window.gameState = gameState;
        window.myIndex = myIndex;
        window.myName = myName;
        window.isMyTurn = isMyTurn;
        console.log("GamePage: UseEffect DEBUG");
      }
    }, [socket, gameState]);

    //************************************************************
    // useEffect SESSION STORAGE [lobbyId, playerName]
    //           Store session values to survive refresh
    //************************************************************
    // Immediately store values to survive refresh
    useEffect(() => {
      sessionStorage.setItem('lobbyId', lobbyId);
      sessionStorage.setItem('playerName', playerName);
      console.log("GamePage: useEffect: SESSION STORAGE");
    }, [lobbyId, playerName]);
  
    //************************************************************
    // useEffect: INITIAL LOBBY [socket, connected, lobbyId, navigate]
    //            Join lobby, get initial lobby data, listener
    //************************************************************
    //
    useEffect(() => {
      if (!socket || !connected) {
        console.log('GamePage: useEffect: INITIAL LOBBY: socket not connected yet');
        return;
      }
  
      console.log('GamePage: useEffect: INITIAL LOBBY: socket connected');
  
      // Get initial lobby data
      socket.emit('getLobbyData', lobbyId, (data) => {
        if (data && !data.error) {
          setLobby(data);
          setLobbyPlayers(data.players);
        } else {
          navigate('/'); // lobby doesn't exist
        }
      });
  
      // Listen for lobby data updates
      const handleLobbyData = (updatedLobby) => {
        if (updatedLobby.id === lobbyId) {
          setLobby(updatedLobby);
          setLobbyPlayers(updatedLobby.players);
        }
      };
      socket.on('lobbyData', handleLobbyData);
  
      // Clean up
      return () => {
        socket.off('lobbyData', handleLobbyData);
      };
    }, [socket, connected, lobbyId, navigate]);
  
  //************************************************************
  // function handleGameStateUpdate
  //************************************************************
  const handleGameStateUpdate = (data) => {
    console.log("GamePage: entering function: handleGameStateUpdate");

    // close down any dialogs
    setShowBidDlg (false);
    setShowShakeDlg (false);
    setShowConfirmBidDlg (false);
    setShowDoubtDlg (false);
    setShowOkDlg (false);
    setShowYesNoDlg (false);

    setGameState(data);
    ggc.AssignGameState(data);

    // What is my index and my name?
    const stringSocketId = String(socketId);
    const index = ggc.allConnectionID.indexOf(stringSocketId);
    setMyIndex (index);
    setMyName (ggc.allParticipantNames[index]);
    setWhosTurnName(ggc.allParticipantNames[ggc.whosTurn]);

    // is it my turn to bid?
    setIsMyTurn(index == ggc.whosTurn);

    // &&& nuke?
    if (isMyTurn) {
      if (ggc.bPaloFijoRound) {
        ggc.PopulateBidListPaloFijo();
      } else {
        ggc.PopulateBidListRegular();
      }
      ggc.PopulateBidListPasoDudo();
      setPossibleBids(ggc.possibleBids || []);
    }
  };

  //************************************************************
  // function handleGameOver
  //************************************************************
  const handleGameOver = (data) => {
    console.log("GamePage: entering function: handleGameOver");
    alert(data.message);
  };

  //************************************************************
  // Click: Host starts game
  //************************************************************
  const handleStartGame = () => {
    if (connected) {
      socket.emit('startGame', lobbyId);
      console.log ('GamePage: emiting "startGame"');
    }
  };

  //************************************************************
  // Click: Leave Lobby
  //************************************************************
  const handleLeaveLobby = () => {
    if (connected) {
      socket.emit('leaveLobby', { playerName, lobbyId });
      navigate('/');
      console.log ('GamePage: emiting "leaveLobby"');
    }
  };

  //************************************************************
  //  function handle BidOK
  //************************************************************
  const handleBidOK = (bid) => {
    console.log("GamePage: entering function: handleBidOK()");
    console.log("GamePage: selected bid:", bid);

    setThisBid (bid);

    // Close the dialog
    setShowBidDlg(false);

    //-------------------------------------------
    // can they show and shake?
    //-------------------------------------------
    myShowShakeRef.current = false;
    let bFound = false;
    if (bid != "PASO" && bid != "DOUBT") {
    // does player have any of hidden dice of what they bid?
      ggc.parseBid(bid);
      for (let i = 0; i < 5; i++) {
          if (ggc.bDiceHidden[myIndex][i]) {
              if (ggc.dice[myIndex][i] == ggc.parsedOfWhat) {
                  bFound = true;
              }
              if (!ggc.bPaloFijoRound) {
                  // aces wild if not palofijo
                  if (ggc.dice[myIndex][i] == 1) {
                      bFound = true;
                  }
              }
          }
      }
      // if so, ask if they want to show and shake
      if (bFound) {
        setShowShakeTitle("Show and Shake");
        setShowShakeMessage("Do you want to show and shake?")
        setShowShakeDlg(true);
      } else {
      // if not, ask if they want to confirm the bid
        PrepareConfirmBidDlg('Your bid is:\n' + bid + '\n\nSubmit this bid?', bid);
        setShowYesNoDlg(true);
      }
    }
    if (bid == "PASO" || bid == "DOUBT") {
      PrepareConfirmBidDlg('Your bid is:\n' + bid + '\n\nSubmit this bid?', bid);
      setShowYesNoDlg(true);
//      setConfirmMessage ('Your bid is:\n' + bid + '\n\nSubmit this bid?');
//      setShowConfirmBidDlg(true);
    }
  };

  //************************************************************
  // function to prepare the confirm bid dlg
  // (sets up to use the YesNoDlg
  //************************************************************
  const PrepareConfirmBidDlg = (msg, bid) => {
    setYesNoMessage(msg);
    setYesNoTitle("Confirm Bid");
    setYesText("Yes");
    setNoText("No");
    setYesShowButton(true);
    setNoShowButton(true);
    setXShowButton(false);
    
    setOnYesHandler(() => () => {
      setShowYesNoDlg(false);
      if (connected) {
        socket?.emit('bid', {
          lobbyId,
          bidText: bid,
          bidShakeShow: myShowShakeRef.current,
          index: myIndex,
          name: myName,
          direction: ggc.whichDirection,
        });
      }
    });
    setOnNoHandler(() => () => {
      setShowYesNoDlg(false);
      setThisBid('');
      myShowShakeRef.current = false;
      setBidTitle("Select your bid");
      setShowBidDlg(true); // start over
    });

  }
  
  //************************************************************
  // function to handle 'forceLeaveLobby'
  // (host has left, the lobby is about to be deleted)
  //************************************************************
  const handleForceLeaveLobby = () => {
    setOkMessage("The host has closed the lobby.\nPress OK to continue.");
    setOkTitle("");
    setOnOkHandler(() => () => {
      if (connected) {
        socket.emit('leaveLobby', { playerName, lobbyId });
        navigate('/');
        console.log ('GamePage: handleForceLeaveLobby, leaving"');
      }
      setShowOkDlg(false);
    });
    setShowOkDlg(true);
  }

  //************************************************************
  // functions to handle disconnectdCountdown
  //************************************************************
  const handleDisconnectCountdown = ({ playerName, secondsRemaining }) => {
    console.log(`Countdown for ${playerName}: ${secondsRemaining}s`);
    setCountdownMessage(`${playerName} disconnected. Pausing for ${secondsRemaining} seconds to allow reconnection...`);
    setShowCountdown(true);
  };

  const handleDisconnectCountdownEnded = ({ playerName }) => {
    console.log(`Countdown for ${playerName} ended`);
    setCountdownMessage(`${playerName} did not reconnect in time.`);
    setTimeout(() => setShowCountdown(false), 3000);  // Optional: hide after brief display
  };

  //************************************************************
  // functions handle Yes, No from ShowShakeDlg
  //************************************************************
  const handleShowShakeYes = () => {
    myShowShakeRef.current = true;

    // Close the dialog
    setShowShakeDlg(false);

    // confirm the bid
    PrepareConfirmBidDlg('Your bid is:\n' + thisBid + ', Show and Shake\n\nSubmit this bid?', thisBid);
    setShowYesNoDlg(true);
    //setConfirmMessage ('Your bid is:\n' + thisBid + ', Show and Shake\n\nSubmit this bid?');
    //setShowConfirmBidDlg(true);
  };

  const handleShowShakeNo = () => {
    myShowShakeRef.current = false;

    // Close the dialog
    setShowShakeDlg(false);

    // confirm the bid
    PrepareConfirmBidDlg('Your bid is:\n' + thisBid + '\n\nSubmit this bid?', thisBid);
    setShowYesNoDlg(true);
    //setConfirmMessage ('Your bid is:\n' + thisBid + '\n\nSubmit this bid?');
    //setShowConfirmBidDlg(true);
  };

  //************************************************************
  // functions handle Yes, No from ConfirmBidDlg
  //************************************************************
  const handleConfirmBidYes = () => {
    setShowConfirmBidDlg(false);

    // Now send the bid to the server
    if (connected) {
      socket?.emit('bid', {
        lobbyId,
        bidText: thisBid,
        bidShakeShow: myShowShakeRef.current,
        index: myIndex,
        name: myName,
      });
    }
  };

  const handleConfirmBidNo = () => {
    setShowConfirmBidDlg(false);
    setThisBid('');
    myShowShakeRef.current = false;
    setBidTitle("Select your bid");
    setShowBidDlg(true); // start over
  };
  
  //************************************************************
  // useEffect:  LISTENERS ON [socket, connected]
  //             turn on listeners 
  //************************************************************
  useEffect(() => {
    if (!socket || !connected) {
      console.log("GamePage: useEffect: LISTENERS ON: socket not ready yet");
      return;
    }
  
    console.log("GamePage: useEffect: LISTENERS ON: socket ready");

    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('gameOver', handleGameOver);
    socket.on('forceLeaveLobby', handleForceLeaveLobby);
    socket.on('disconnectCountdown', handleDisconnectCountdown);
    socket.on('disconnectCountdownEnded', handleDisconnectCountdownEnded);

    return () => {
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('gameOver', handleGameOver);
      socket.off('forceLeaveLobby', handleForceLeaveLobby);
      socket.off('disconnectCountdown', handleDisconnectCountdown);
      socket.off('disconnectCountdownEnded', handleDisconnectCountdownEnded);
    };
  }, [socket, connected]); 

  //************************************************************
  // useEffect:  WINDOW RESIZE []
  //************************************************************
  useEffect(() => {
    console.log("GamePage: useEffect: WINDOW RESIZE");

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

  //************************************************************
  // useEffect:  LOAD IMAGES []
  //************************************************************
  useEffect(() => {
    console.log("GamePage: useEffect: LOAD IMAGES");
  
    let loaded = 0;
    const totalToLoad = 9;  // cup down, cup up, 6 dice, hidden die
    const diceImgs = {};
  
    const checkIfDone = () => {
      loaded++;
      console.log(`Image loaded: ${loaded}/${totalToLoad}`);
      if (loaded === totalToLoad) {
        diceImagesRef.current = diceImgs;
        setImagesReady(true);
        console.log("GamePage: useEffect LOAD IMAGES; All images loaded");
      }
    };
  
    // Load cup down image
    const imgCupDown = new Image();
    imgCupDown.src = '/images/CupDown.jpg';
    imgCupDown.onload = () => {
      cupDownImageRef.current = imgCupDown;
      checkIfDone();
    };
    imgCupDown.onerror = (e) => {
      console.error("Failed to load CupDown.jpg", e);
    };

    // Load cup up image
    const imgCupUp = new Image();
    imgCupUp.src = '/images/CupUp.jpg';
    imgCupUp.onload = () => {
      cupUpImageRef.current = imgCupUp;
      checkIfDone();
    };
    imgCupUp.onerror = (e) => {
      console.error("Failed to load CupUp.jpg", e);
    };
  
    // Load dice images
    for (let i = 1; i <= 6; i++) {
      const imgDice = new Image();
      imgDice.src = `/images/Dice${i}.jpg`;
      imgDice.onload = () => {
        diceImgs[i] = imgDice;
        checkIfDone();
      };
      imgDice.onerror = (e) => {
        console.error(`Failed to load Dice${i}.jpg`, e);
      };
    }

    // Hidden die image
    const imgDiceHidden = new Image();
    imgDiceHidden.src = '/images/DiceHidden.jpg';
    imgDiceHidden.onload = () => {
      diceHiddenImageRef.current = imgDiceHidden;
      checkIfDone();
    };
    imgDiceHidden.onerror = (e) => {
      console.error("Failed to load DiceHidden.jpg", e);
    };
  
  }, []);
  
//************************************************************
// useEffect:  REQUEST LOBBY DATA [lobbyId]
//             Request from server with callback
//************************************************************
useEffect(() => {
  console.log("GamePage: useEffect: REQUEST LOBBY DATA: entering");

  if (connected) {
    socket?.emit('getLobbyData', lobbyId, (lobby) => {
      console.log ("GamePage.js: REQUEST LOBBY DATA: connected");
      setLobby(lobby);
      setGameState(lobby.game);
      setLobbyPlayers(lobby.players);
  
      ggc.AssignGameState(lobby.game);

      const stringSocketId = String(socketId);
      const index = ggc.allConnectionID.indexOf(stringSocketId);
      setMyIndex(index);
      setMyName (ggc.allParticipantNames[index]);
    });
  }
}, [lobbyId]);

//*************************************************************
// useEffect:  RECONNECT [socket, socketId]
//*************************************************************
useEffect(() => {

  // for debugging
  if (prevReconnect.current) {
    const p = prevReconnect.current;
    if (p.socket     !== socket)   console.log('RECONNECT: socket changed', p.socket, '→', socket);
    if (p.socketId   !== socketId) console.log('RECONNECT: socketId changed', p.socketId, '→', socketId);
    if (p.connected  !== connected)console.log('RECONNECT: connected changed', p.connected, '→', connected);
    if (p.lobbyId    !== lobbyId)  console.log('RECONNECT: lobbyId changed', p.lobbyId, '→', lobbyId);
    if (p.myName     !== myName)   console.log('RECONNECT: myName changed', p.myName, '→', myName);
  }
  prevReconnect.current = { socket, socketId, connected, lobbyId, myName };

  //************************************************************
  // function handle Reconnect
  //************************************************************
  function handleReconnect() {
   
    console.log("handleRECONNECT: entering", lobbyId, myName);
    
    // get the name from storage, in case this was a browser tab refresh
    let nameFromStorage = sessionStorage.getItem('playerName');

    // this won't get updated until the next render (React behavior)
    // so use 'nameFromStorage' for the rest of this routine
    setMyName(nameFromStorage);   

    if (lobbyId && nameFromStorage) {
      if (connected) {
        socket.emit('rejoinLobby', { lobbyId, playerName: nameFromStorage, id: socket.id }, (serverLobbyData) => {
          console.log("handleRECONNECT: callback received lobby/game data:", serverLobbyData);
  
          // Reconstruct your client-side state
          setLobbyHost(serverLobbyData.host);
          setGameState(serverLobbyData.game);
          setLobbyPlayers(serverLobbyData.players);

          ggc.AssignGameState(serverLobbyData.game);
  
          const whosTurnSocketId = ggc.allConnectionID[ggc.whosTurn];
          const stringSocketId = String(socketId);
          setIsMyTurn(whosTurnSocketId === stringSocketId);
          setWhosTurnName(ggc.allParticipantNames[ggc.whosTurn]);
  
          const index = ggc.allConnectionID.indexOf(stringSocketId);
          setMyIndex(index);
          setMyName(ggc.allParticipantNames[index]);
        });
      }
      else {
        console.log("handleRECONNECT: not rejoining lobby, 'connected' not valid. ", connected);
      }
    }
    else {
      console.log("handleRECONNECT: not rejoining lobby, 'lobbyID' and/or 'nameFromStorage' not valid. ", lobbyId, nameFromStorage);
    }
  }

  if (!socket || !connected) {
    console.log("Gamepage: useEffect: RECONNECT: socket not ready yet");
    return;
  }

  // set up listener for reconnecting
  console.log("Gamepage: useEffect: RECONNECT: socket ready, turn on 'connect' listener");
  socket.on('connect', handleReconnect);

  // &&& comment out or not?
  // Call immediately if already connected (e.g. on refresh)
  if (socket.connected) {
    console.log("GamePage: socket already connected, calling handleReconnect immediately");
    handleReconnect();
  }
  
  return () => {
    console.log("handleRECONNECT: socket.off('connect') for reconnect handling");
    socket.off('connect', handleReconnect);
  };
}, [socket, socketId]);


//************************************************************
// useEffect:  DRAW [gameState, lobbyPlayers, isMyTurn, screenSize, imagesReady, socketId]
//************************************************************
useEffect(() => {
  console.log("GamePage: useEffect DRAW");

  // for debugging
  if (prevReconnect.current) {
    const p = prevReconnect.current;
    if (p.gameState     !== gameState)    console.log ('DRAW: gameState changed', p.gameState, '→', gameState);
    if (p.lobbyPlayers  !== lobbyPlayers) console.log ('DRAW: lobbyPlayers changed', p.lobbyPlayers, '→', lobbyPlayers);
    if (p.isMyTurn      !== isMyTurn)     console.log ('DRAW: isMyTurn changed', p.isMyTurn, '→', isMyTurn);
    if (p.screenSize    !== screenSize)   console.log ('DRAW: screenSize changed', p.screenSize, '→', screenSize);
    if (p.imagesReady   !== imagesReady)  console.log ('DRAW: imagesReady changed', p.imagesReady, '→', imagesReady);
    if (p.socketId      !== socketId)     console.log ('DRAW: socketId changed', p.socketId, '→', socketId);
  }
  prevReconnect.current = { gameState, lobbyPlayers, isMyTurn, screenSize, imagesReady, socketId };

  // wait for images to be loaded
  if (!imagesReady) {
    console.log("GamePage: useEffect DRAW: IMAGES ARE NOT LOADED YET");
    return;
  }

  // prepare canvas
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');

  // Set canvas size to match screen
  canvas.width = screenSize.width;
  canvas.height = screenSize.height;

  // Clear canvas
  ctx.fillStyle = (ggc.allConnectionStatus[myIndex] == CONN_OBSERVER ? 'lightgray' : 'lightblue');
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Make sure we have the latest game state
  ggc.AssignGameState(gameState);

  // Start drawing
  DrawSomeText ();

  let yPos = 140;
  const offset = 110;
  let arrayObserverNames = [];
  arrayObserverNames.length = 0;
  
  // Loop through participants
  for (let cc=0; cc<ggc.maxConnections; cc++) {
    if (ggc.allConnectionStatus[cc] == CONN_UNUSED) {
      continue;
    }
    if (ggc.allConnectionStatus[cc] == CONN_OBSERVER) {
      arrayObserverNames.push(ggc.allParticipantNames[cc]);
      continue;
    }
    DrawPlayerCupDice (cc, yPos);
    yPos += offset;
  }

  // draw bid history
  if (ggc.bGameInProgress) {
    DrawBidHistory();
  }

  // Display observer names
  yPos += 20;
  DrawObserverNames (yPos);

  // dialogs
  if (ggc.bAskInOut) {
    DrawInOrOut();
  }

  if (ggc.bGameInProgress) {
    DrawProcessBid();
  }

  if (ggc.bDoubtInProgress) {
    DrawDoubtInProgress();
  }
  
  if (ggc.bShowDoubtResult) {
    DrawDoubtResult();
  }

  //************************************************************
  //  function Draw Some Text
  //************************************************************
  function DrawSomeText () {
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.fillText('Game Lobby: ' + lobbyId, 20, 40);

  //    if (!gameState?.bRoundInProgress) {
  //        ctx.fillText('Game not active or just ended.', 20, 60);
  //      return;
  //    }

    // Display your name
    let status = '';
    if (ggc.allConnectionStatus[myIndex] == CONN_PLAYER_IN) {
      status = "(PLAYER, IN)";
    }
    if (ggc.allConnectionStatus[myIndex] == CONN_PLAYER_OUT) {
      status = "(PLAYER, OUT)";
    }
    if (ggc.allConnectionStatus[myIndex] == CONN_OBSERVER) {
      status = "(OBSERVER)";
    }
    ctx.fillText(`Your name: ${myName} ${status}`, 20, 60);

    // Display current turn
    if (ggc.bGameInProgress) {
      ctx.fillText(`Current turn: ${whosTurnName}`, 20, 80);
      ctx.fillText(isMyTurn ? "It's YOUR turn to bid!" : `Waiting for ${whosTurnName}...`, 20, 100);
    } else {
      ctx.fillText(`Waiting for host (${lobby.host}) to start a game...`, 20, 80);
    }

    // Display number of sticks
    if (ggc.bGameInProgress) {
      const sticks = ggc.allSticks[myIndex];
      ctx.fillText(`Number of sticks: ${sticks}`, 20, 120);
    }

    // palofijo?
    if (ggc.bGameInProgress) {
      if (ggc.bPaloFijoRound) {
        ctx.fillText('PALO FIJO', 20, 460);
      }
    }
  }

  //************************************************************
  //  function Draw players' cup and dice
  //************************************************************
  function DrawPlayerCupDice (p, yPos) {
    // draw and fill rectangles for player
    if (ggc.allConnectionStatus[p] == CONN_PLAYER_OUT) {
      ctx.fillStyle = 'lightgray';
    } else {
      ctx.fillStyle = 'white';
    }
    ctx.fillRect(20, yPos, 170, 66);
    ctx.fillStyle = 'blue';
    ctx.fillStyle = (ggc.allConnectionStatus[myIndex] == CONN_OBSERVER ? 'lightgray' : 'lightblue');
    ctx.fillRect(20, yPos + 66, 170, 28);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(20, yPos + 66, 170, 28);

    // red box around player whose turn it is
    if (ggc.bGameInProgress) {
      if (p == ggc.whosTurn) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'red'
      } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black'
      }
      ctx.strokeRect(20, yPos, 170, 66 + 28);
      ctx.strokeStyle = 'black'
      ctx.lineWidth = 2;
    }

    // draw cup
    if (ggc.allConnectionStatus[p] == CONN_PLAYER_OUT || !ggc.bGameInProgress) {
      ctx.drawImage(cupUpImageRef.current, 25, yPos + 5, 40, 56);
    } else if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.result.doubtCupLifted[p]) {
      ctx.drawImage(cupUpImageRef.current, 25, yPos + 5, 40, 56);
    } else {
      ctx.drawImage(cupDownImageRef.current, 25, yPos + 5, 40, 56);
    }

    // draw dice
    if (ggc.bGameInProgress) {
      if (ggc.allConnectionStatus[p] == CONN_PLAYER_OUT) {
        // this player is out out; do nothing
      } else {
        const diceImages = diceImagesRef.current;
        for (let i = 0; i < 5; i++) {
          const value = ggc.dice[p][i];
          if (ggc.bDiceHidden[p][i]) {
            // hidden dice in upper box
            if (p == myIndex) {
              // if me, show the die
              ctx.drawImage(diceImages[value], 70 + i*23, yPos + 43, 18, 18);
            } else {
              // other player
              if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.result.doubtCupLifted[p]) {
                // cup lifted, show dice
                ctx.drawImage(diceImages[value], 70 + i*23, yPos + 43, 18, 18);
              } else {
                // cup not lifted, show the empty box
                ctx.drawImage(diceHiddenImageRef.current, 70 + i*23, yPos + 43, 18, 18);
              }
            }
          } else {
            // shown dice in bottom box
            ctx.drawImage(diceImages[value], 70 + i*23, yPos + 43 + 28, 18, 18);
          }
        }
      }
    }
    // draw name
    ctx.fillStyle = 'black'
    ctx.font = '24px Arial';
    ctx.fillText(`${ggc.allParticipantNames[p]}`, 70, yPos + 33);
  }

  //************************************************************
  //  function Draw bid history
  //************************************************************
  function DrawBidHistory () {
    ctx.font = '12px Arial';
    ctx.fillText("Bidding History", 210, 400);
    if (ggc.numBids === 0) {
      ctx.fillText("(no bids yet)", 210, 420);
    }
    if (ggc.numBids > 0) {
      for (let i=0; i<ggc.numBids; i++) {
        const name = ggc.allBids[i].playerName;
        const bid = ggc.allBids[i].text;
        ctx.fillText(`${name}:  ${bid}`, 210, 420 + i*20);
      }
    }
  }

  //************************************************************
  //  function Draw Observer names
  //************************************************************
  function DrawObserverNames (yPos) {
    if (arrayObserverNames.length > 0) {
      ctx.fillStyle = 'black';
      ctx.font = '12px Arial';
      ctx.fillText('OBSERVERS', 20, yPos);
      yPos += 20;
    }
    for (let i=0; i<arrayObserverNames.length; i++) {
      ctx.fillStyle = 'black';
      ctx.font = '12px Arial';
      ctx.fillText(arrayObserverNames[i], 20, yPos + i * 20);
    }
  }

  //************************************************************
  //  function Draw InOrOut
  //************************************************************
  function DrawInOrOut() {
    let msg = "Starting a new game\nAre you in?";
    // who has not yet said in or out
    let ss = "\n\nWaiting to hear from:";
    for (let cc = 0; cc < ggc.maxConnections; cc++) {
      if (ggc.inOutMustSay[cc]) {
        ss += "\n" + ggc.allParticipantNames[cc];
        if (ggc.inOutDidSay[cc]) {
          if (ggc.allConnectionStatus[cc] == CONN_PLAYER_IN) {
            ss += " - IN";
          }
          if (ggc.allConnectionStatus[cc] == CONN_OBSERVER) {
            ss += " - OUT";
          }
        }
      }
    }
    msg += ss;
    setYesNoMessage(msg);
    setYesNoTitle("Start game");
    setYesText("Yes, I'm in");
    setNoText("No, I'll watch");
    setYesShowButton(true);
    setNoShowButton(true);
    setXShowButton(false);
    setOnYesHandler(() => () => {
      setShowYesNoDlg(false);
      ggc.allConnectionStatus[myIndex] = CONN_PLAYER_IN;
      socket.emit('inOrOut', { lobbyId, index: myIndex, status: CONN_PLAYER_IN })
    });
    setOnNoHandler(() => () => {
      setShowYesNoDlg(false);
      ggc.allConnectionStatus[myIndex] = CONN_OBSERVER;
      socket.emit('inOrOut', { lobbyId, index: myIndex, status: CONN_OBSERVER })
    });
    setShowYesNoDlg(true);
  }

  //************************************************************
  //  function Draw and process the bid
  //************************************************************
  function DrawProcessBid() {
    if (isMyTurn) {
      // my turn
      // populate the bid list
      if (ggc.bPaloFijoRound) {
        ggc.PopulateBidListPaloFijo();
      } else {
        ggc.PopulateBidListRegular();
      }
      ggc.PopulateBidListPasoDudo();
      setPossibleBids(ggc.possibleBids || []);

      // show dialog, handle responses
      if (ggc.whichDirection == undefined) {
        // choose direction if starting a round
        setYesNoMessage("You start\nWhich way?");
        setYesNoTitle("Choose direction");
        let cc = ggc.getPlayerToLeft(myIndex);
        setYesText("to " + ggc.allParticipantNames[cc]);
        cc = ggc.getPlayerToRight(myIndex);
        setNoText("to " + ggc.allParticipantNames[cc]);
        setYesShowButton(true);
        setNoShowButton(true);
        setXShowButton(false);
        setOnYesHandler(() => () => {
          setShowYesNoDlg(false);
          ggc.whichDirection = 0;
          setBidTitle("Select your bid");
          setShowBidDlg(true);
        });
        setOnNoHandler(() => () => {
          setShowYesNoDlg(false);
          ggc.whichDirection = 1;
          setBidTitle("Select your bid");
          setShowBidDlg(true);
        });
        setShowYesNoDlg(true);
      } else {
        // no need to choose direction, just bid
        setBidTitle("Select your bid");
        setShowBidDlg(true);
      }
    } else {
      // not my turn
      // show current bid
      if (ggc.numBids > 0) {
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';

        let xPos = 220;
        let yPos = 220;
        const currentBid = ggc.allBids[ggc.numBids-1];
        ctx.fillText(currentBid.playerName + " bid: " + currentBid.text, xPos, yPos);
        yPos += 20;
        if (currentBid.bShakeShow) {
          ctx.fillText('(show and shake)', xPos, yPos);
        }
        yPos += 40;
        ctx.fillText(`Bid is to: ${whosTurnName}...`, xPos, yPos);
      }
    }
  }
  }, [gameState, lobbyPlayers, isMyTurn, screenSize, imagesReady, socketId]);

  //************************************************************
  //  function Draw Doubt in Progress
  //************************************************************
  function DrawDoubtInProgress () {
    // prepare strings to say what happened
    let s1 = "";  // who doubted whom
    let s2 = "";  // what the bid was
    let s3 = '';  // who has not yet lifted the cup
    s1 = ggc.allParticipantNames[ggc.result.whoDoubted];
    s1 += " doubted ";
    s1 += ggc.allParticipantNames[ggc.result.whoGotDoubted];

    if (ggc.result.doubtWasPaso) {
      // PASO
      s2 = ggc.allParticipantNames[ggc.result.whoGotDoubted] + " bid PASO";
    } else {
      // non-PASO
      s2 = ggc.allParticipantNames[ggc.result.whoGotDoubted] + "'s bid was " + ggc.result.doubtedText;

      s2 += "\n(" + ggc.result.doubtShowing + " showing, looking for " + ggc.result.doubtLookingFor + ")\n";
    }
    // who has not yet lifted their cup
    s3 = "Waiting to see dice from:";
    for (let cc = 0; cc < ggc.maxConnections; cc++) {
      if (ggc.result.doubtMustLiftCup[cc]) {
        if (!ggc.result.doubtCupLifted[cc]) {
          s3 += "\n" + ggc.allParticipantNames[cc];
        }
      }
    }

    let msg = s1 + "\n" + s2 + "\n" + s3; 

    setIsMyTurn(false);   //chatgpt

    // show the string in message box
    setDoubtMessage(msg);
    if (ggc.result.doubtMustLiftCup[myIndex] && !ggc.result.doubtCupLifted[myIndex]) {
      setDoubtShowButton(true);
    } else {
      setDoubtShowButton(false);
    }
    setDoubtTitle('DOUBT');
    setDoubtButtonText('Lift Cup');
    setDoubtEvent('liftCup');
    setShowDoubtDlg(true);
  }

  //************************************************************
  //  function Draw Doubt Result
  //************************************************************
  function DrawDoubtResult() {
    // prepare strings to say what happened
    let s1 = "";  // who doubted whom
    let s2 = "";  // what the bid was
    let s3 = "";  // result of doubt
    let s4 = "";  // who got the stick
    s1 = ggc.allParticipantNames[ggc.result.whoDoubted];
    s1 += " doubted ";
    s1 += ggc.allParticipantNames[ggc.result.whoGotDoubted];

    if (ggc.result.doubtWasPaso) {
      // PASO
      s2 = ggc.allParticipantNames[ggc.result.whoGotDoubted] + " bid PASO";
      if (ggc.result.doubtPasoWasThere) {
          s3 = ggc.allParticipantNames[ggc.result.whoGotDoubted] + " has the PASO";
      } else {
          s3 = ggc.allParticipantNames[ggc.result.whoGotDoubted] + " does not have the PASO";
      }
    } else {
      // non-PASO
      s2 = ggc.allParticipantNames[ggc.result.whoGotDoubted] + "'s bid was " + ggc.result.doubtedText;

      s3 = (ggc.result.doubtCount == 1 ? "There is " : "There are ") + ggc.result.doubtCount;
    }

    s4 = ggc.allParticipantNames[ggc.result.doubtLoser] + " got the stick";
    if (ggc.result.doubtLoserOut) {
      s4 += ", and is OUT";
    }

    let msg = s1 + "\n" + s2 + "\n" + s3 + "\n" + s4; 

    if (ggc.bWinnerGame) {
      msg += "\n\n" + ggc.allParticipantNames[ggc.whoWonGame] + " WINS THE GAME!!";
    }

    setIsMyTurn(false);   //chatgpt

    // show the string in message box
    setDoubtMessage(msg);
    setDoubtShowButton(ggc.allConnectionStatus[myIndex] == CONN_PLAYER_IN);
    setDoubtButtonText('OK');
    setDoubtEvent('nextRound');
    setShowDoubtDlg(true);
  }


  //************************************************************
  //  Render
  //************************************************************
  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: '0', margin: '0' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      {showCountdown && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          fontSize: '20px',
          zIndex: 3000,
        }}>
          {countdownMessage}
        </div>
      )}

      {/* === Top-Right Buttons === */}
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '10px', zIndex: 1000 }}>
        {(!ggc.bGameInProgress && (lobby.host == myName)) && (
          <>
          <button
            onClick={handleStartGame}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
            }}
            disabled={ggc.GetNumberPlayersStillIn() < 2}
          >
            Start Game
          </button>
          <button
            onClick={handleLeaveLobby}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
            }}
          >
            Close lobby
          </button>
          </>
        )}
        {((ggc.allConnectionStatus[myIndex] == CONN_OBSERVER) ||(!ggc.bGameInProgress && (lobby.host != myName))) && (
          <button
            onClick={handleLeaveLobby}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
            }}
          >
            Leave lobby
          </button>
        )}
      </div>

      {showBidDlg && (
        <BidDlg
          open={showBidDlg}
          position={bidPosition}
          setPosition={setBidPosition}          
          onClose={() => setShowBidDlg(false)}
          onSubmit={handleBidOK}
          bids={possibleBids}
          title={bidTitle}
          yourTurnString={
            ggc.allBids && ggc.allBids.length > 0 && ggc.numBids > 0
              ? `The bid to you is ${ggc.allBids[ggc.numBids-1].text}`
              : 'You bid first'
          }
          specialPasoString={
            ggc.allBids && ggc.allBids.length > 1 && ggc.numBids > 1 && ggc.allBids[ggc.numBids-1].text == "PASO"
              ? `Doubt the PASO or top the bid ${ggc.allBids[ggc.FindLastNonPasoBid()].text}`
              : ''
          }


        />
      )}

      {showDoubtDlg && (
        <DoubtDlg
          open={showDoubtDlg}
          position={doubtPosition}
          setPosition={setDoubtPosition}          
          title={doubtTitle}
          message={doubtMessage}
          doubtButtonText={doubtButtonText}
          doubtShowButton={doubtShowButton}
          doubtEvent={doubtEvent}
          onClose={() => {
            setShowDoubtDlg(false);
            socket.emit(doubtEvent, { lobbyId, index: myIndex })
            //socket.emit('liftCup', { lobbyId, index: myIndex })
            //socket.emit('nextRound', { lobbyId, index: myIndex })
          }}
          x = {200}
          y = {240}
        />
      )}

      {showShowShakeDlg && (
        <ShowShakeDlg
          open={showShowShakeDlg}
          position={showShakePosition}
          setPosition={setShowShakePosition}          
          title={showShakeTitle}
          message={showShakeMessage}
          onYes={handleShowShakeYes}
          onNo={handleShowShakeNo}
        />
      )}

      {showConfirmBidDlg && (
        <ConfirmBidDlg
          open={showConfirmBidDlg}
          message={confirmMessage}
          onYes={handleConfirmBidYes}
          onNo={handleConfirmBidNo}
        />
      )}

      {showOkDlg && (
        <OkDlg
          open={showOkDlg}
          position={okPosition}
          setPosition={setOkPosition}          
          title={okTitle}
          message={okMessage}
          onOk={onOkHandler}
        />
      )}

      {showYesNoDlg && (
        <YesNoDlg
          open={showYesNoDlg}
          position={yesNoPosition}
          setPosition={setYesNoPosition}          
          title={yesNoTitle}
          message={yesNoMessage}
          yesText={yesText}
          noText={noText}
          yesShowButton = {yesShowButton}
          noShowButton = {noShowButton}
          xShowButton = {xShowButton}
          onYes={onYesHandler}
          onNo={onNoHandler}
        />
      )}
    </div>
  );
}

export default GamePage;
