import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { SocketContext } from '../SocketContext.js';
import { DudoGame } from '../DudoGameC.js'

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
    
    // row2
    // bid
    const [thisBid, setThisBid] = useState('');
    const [selectedBid, setSelectedBid] = useState('');
    const [canShowShake, setCanShowShake] = useState(false);
    const [bidShowShake, setBidShowShake] = useState(false);

    const [row2YourTurnString, setRow2YourTurnString] = useState('');
    const [row2SpecialPasoString, setRow2SpecialPasoString] = useState('');
    const [row2CurrentBid, setRow2CurrentBid] = useState('');
    const [row2BidToWhom, setRow2BidToWhom] = useState('');

    // show doubt
    const [row2DoubtWho, setRow2DoubtWho] = useState('');
    const [row2DoubtBid, setRow2DoubtBid] = useState('');
    const [row2DoubtResult, setRow2DoubtResult] = useState('');
    const [row2DoubtStick, setRow2DoubtStick] = useState('');
    const [row2DoubtWin, setRow2DoubtWin] = useState('');
    const [row2DoubtShowButton, setRow2DoubtShowButton] = useState('');
    
    // dialogs
    // confirmBid
    const [showConfirmBidDlg, setShowConfirmBidDlg] = useState(false);
    const [confirmPosition, setConfirmPosition] = useState({ x: 200, y: 200 });
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
    const bidHistoryRef = useRef([]);
    
    // Refs debugging
    const prevReconnect = useRef(null);
    const prevDraw = useRef(null);


    //************************************************************
    // UseEffect CHECKBOX [selectedBid, CanShowShake]
    //           track changes in checkbox
    //************************************************************
    useEffect(() => {
      console.log("GamePage: useEffect: CHECKBOX");
      const result = CanShowShake(selectedBid);
      setCanShowShake(result);
      if (!result) setBidShowShake(false);
    }, [selectedBid, canShowShake]);


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
    setShowConfirmBidDlg (false);
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

/*    
    // &&& nuke?
    if (isMyTurn) {
      if (ggc.bPaloFijoRound) {
        ggc.PopulateBidListPaloFijo();
      } else {
        ggc.PopulateBidListRegular();
      }
      //ggc.PopulateBidListPasoDudo();
      setPossibleBids(ggc.possibleBids || []);
    }
*/    
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
  const handleBidOK = (bid, bShowShake) => {
    console.log("GamePage: entering function: handleBidOK()");
    console.log("GamePage: selected bid:", bid, " show/shake = ", bShowShake);

    setThisBid (bid);
    myShowShakeRef.current = bShowShake;

    if (bid == "PASO" || bid == "DOUBT") {
      PrepareConfirmBidDlg('Your bid is:\n' + bid + '\n\nSubmit this bid?', bid);
    } else {
        if (bShowShake) {
          PrepareConfirmBidDlg('Your bid is:\n' + bid + ', Show and Shake\n\nSubmit this bid?', bid);
        } else {
          PrepareConfirmBidDlg('Your bid is:\n' + bid + ', No  Show\n\nSubmit this bid?', bid);
        }
    }
    setShowYesNoDlg(true);
  };

  //************************************************************
  // function to say whether they can show/shake 
  // based on currently selected bid
  //************************************************************
  const CanShowShake = (bid) => {
    // no, if special strings
    if (bid == "PASO" || bid == "DOUBT" || bid == "--Select--") {
      return false;
    }

    // does player have any of hidden dice of what they bid?
    ggc.parseBid(bid);
    for (let i = 0; i < 5; i++) {
        if (ggc.bDiceHidden[myIndex][i]) {
            if (ggc.dice[myIndex][i] == ggc.parsedOfWhat) {
                return true;
            }
            if (!ggc.bPaloFijoRound) {
                // aces wild if not palofijo
                if (ggc.dice[myIndex][i] == 1) {
                  return true;
                }
            }
        }
    }
    return (false);
  }

  //************************************************************
  // function to prepare the bid UI
  // (sets up to use the YesNoDlg)
  //************************************************************
  const PrepareBidUI = () => {

    console.log ("DEBUGG - PrepareBidUI, isMyTurn = ", isMyTurn);
    
    myShowShakeRef.current = false;
    setBidShowShake(false)    
    if (isMyTurn) {
      //-------------------------------------------
      // my turn
      //-------------------------------------------
      setRow2YourTurnString (ggc.numBids > 0 ? 
                            `The bid to you is ${ggc.allBids[ggc.numBids-1].text}` :
                            'You bid first');
      setRow2SpecialPasoString (ggc.numBids > 1 && ggc.allBids[ggc.numBids-1].text == "PASO" ?
                            `Doubt the PASO or top the bid ${ggc.allBids[ggc.FindLastNonPasoBid()].text}` :
                            '');
      setSelectedBid (ggc.possibleBids[0]);
    } else {
      //-------------------------------------------
      // not my turn
      //-------------------------------------------
      if (ggc.numBids > 0) {
        // there is at least one bid
        const currentBid = ggc.allBids[ggc.numBids-1];
        let s1= currentBid.playerName + " bid: " + currentBid.text;
        let s2 = `Bid is to: ${whosTurnName}...`;
        switch (currentBid.text) {
          case "DOUBT":
            setRow2CurrentBid('');
            setRow2BidToWhom('');
            break;
          case "PASO":
            setRow2CurrentBid(s1);
            setRow2BidToWhom(s2);
            break;
          default:
            setRow2CurrentBid(currentBid.bShowShake ? s1 + ", (show and shake)" : s1 + ", (no show)");
            setRow2BidToWhom(s2);
        }
      } else {
        // waiting for someone to start bidding
        setRow2CurrentBid(`Waiting for ${whosTurnName} to start the bidding...`);
        setRow2BidToWhom('');
      }
    }
  }

  //************************************************************
  // function to prepare the confirm bid dialog
  // (sets up to use the YesNoDlg)
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
          bidShowShake: myShowShakeRef.current,
          index: myIndex,
          name: myName,
          direction: ggc.whichDirection,
        });
      }
    });
    setOnNoHandler(() => () => {
      setShowYesNoDlg(false);
      setThisBid('');
      PrepareBidUI();
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
  // functions handle Yes, No from ConfirmBidDlg
  //************************************************************
  const handleConfirmBidYes = () => {
    setShowConfirmBidDlg(false);

    // Now send the bid to the server
    if (connected) {
      socket?.emit('bid', {
        lobbyId,
        bidText: thisBid,
        bidShowShake: myShowShakeRef.current,
        index: myIndex,
        name: myName,
      });
    }
  };

  const handleConfirmBidNo = () => {
    setShowConfirmBidDlg(false);
    setThisBid('');
    PrepareBidUI();
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
    DrawBidHistoryOld();
  }

  // draw observer names
  yPos += 20;
  DrawObserverNames (yPos);

  // Draw bid status
  if (ggc.bGameInProgress) {
    DrawProcessBid();
  } else {
    DrawWaitingToStartGame();
  }

  // dialogs
  if (ggc.bAskInOut) {
    DrawInOrOut();
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
    } else if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.result.doubtDidLiftCup[p]) {
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
              if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.result.doubtDidLiftCup[p]) {
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
    // clear out any previous values
    bidHistoryRef.current.length = 0;

    // add bids from scratch
    for (let i=0;  i<ggc.numBids; i++) {
      let ss = ggc.allBids[i].text;
      if (ggc.allBids[i].bShowShake) {
        ss += (' (show and shake');
      }
      bidHistoryRef.current.push({ Player: ggc.allBids[i].playerName,
                                   Bid: ss});
    }
  }
  
  //************************************************************
  //  function Draw bid history
  //************************************************************
  function DrawBidHistoryOld () {
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
      socket.emit('inOrOut', { lobbyId, index: myIndex, status: CONN_PLAYER_IN })
    });
    setOnNoHandler(() => () => {
      setShowYesNoDlg(false);
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
      //ggc.PopulateBidListPasoDudo();
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
          PrepareBidUI();
      });
        setOnNoHandler(() => () => {
          setShowYesNoDlg(false);
          ggc.whichDirection = 1;
          PrepareBidUI();
        });
        setShowYesNoDlg(true);
      } else {
          PrepareBidUI();
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
        if (currentBid.bShowShake) {
          ctx.fillText('(show and shake)', xPos, yPos);
        }
        yPos += 40;
        ctx.fillText(`Bid is to: ${whosTurnName}...`, xPos, yPos);
      }
      PrepareBidUI();
    }
  }
  }, [gameState, lobbyPlayers, isMyTurn, screenSize, imagesReady, socketId]);

  //************************************************************
  //  function Draw Waiting for host to start the game
  //************************************************************
  function DrawWaitingToStartGame () {
    if (ggc.GetNumberPlayersStillIn() < 2) {
      setRow2CurrentBid(`Waiting for 2 or more players in the lobby to start a game...`);
    } else {
      setRow2CurrentBid(myName == lobby.host ? 
                        'Waiting for you to start the game...' :
                        `Waiting for ${lobby.host} to start the game...`);
      
    }
    setRow2BidToWhom('');
  }

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
    setRow2DoubtWho(s1);

    if (ggc.result.doubtWasPaso) {
      // PASO
      s2 = ggc.allParticipantNames[ggc.result.whoGotDoubted] + " bid PASO";
    } else {
      // non-PASO
      s2 = ggc.allParticipantNames[ggc.result.whoGotDoubted] + "'s bid was " + ggc.result.doubtedText;

      s2 += "\n(" + ggc.result.doubtShowing + " showing, looking for " + ggc.result.doubtLookingFor + ")\n";
    }
    setRow2DoubtBid(s2);

    // who has not yet lifted their cup
    s3 = "Waiting to see dice from:";
    for (let cc = 0; cc < ggc.maxConnections; cc++) {
      if (ggc.result.doubtMustLiftCup[cc]) {
        if (!ggc.result.doubtDidLiftCup[cc]) {
          s3 += "\n" + ggc.allParticipantNames[cc];
        }
      }
    }
    setRow2DoubtResult('');
    setRow2DoubtStick('');
    setRow2DoubtWin('');
    setIsMyTurn(false);
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
    let s5 = "";  // who got won the game (if anyone)
    s1 = ggc.allParticipantNames[ggc.result.whoDoubted];
    s1 += " doubted ";
    s1 += ggc.allParticipantNames[ggc.result.whoGotDoubted];
    setRow2DoubtWho(s1);

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
    setRow2DoubtBid(s2);
    setRow2DoubtResult(s3);

    s4 = ggc.allParticipantNames[ggc.result.doubtLoser] + " got the stick";
    if (ggc.result.doubtLoserOut) {
      s4 += ", and is OUT";
    }
    setRow2DoubtStick(s4);

    let msg = s1 + "\n" + s2 + "\n" + s3 + "\n" + s4; 

    if (ggc.bWinnerGame) {
      s5 = ggc.allParticipantNames[ggc.whoWonGame] + " WINS THE GAME!!"
      msg += "\n\n" + s5;
      setRow2DoubtWin(s5);
    }
    setIsMyTurn(false);
  }


  //************************************************************
  //  Render
  //************************************************************
  return (

    <div
      className="container mx-auto"
      style={{
        maxWidth: '1000px',
        position: 'relative',
        border: '2px solid #333',
        borderRadius: '10px',
        padding: '10px',
        backgroundColor: 'white',
      }}
    >

      {/*-------------------------------------------------------------------
        Row 1: Lobby title and buttons
      --------------------------------------------------------------------*/}
      <div className="row mb-2 my-2">
        <div className="col">
          <div className="border border-primary rounded p-1 d-flex justify-content-between align-items-center">
            <div className="fw-bold text-start">
              <div>Game Lobby Host: {lobbyHost}</div>
              <div>Your Name: {myName}</div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              {(!ggc.bGameInProgress && lobby.host === myName) && (
                <>
                  <button
                    onClick={handleStartGame}
                    className="btn btn-primary btn-sm"
                    disabled={ggc.GetNumberPlayersInLobby() < 2}
                  >
                    Start Game
                  </button>
                  <button
                    onClick={handleLeaveLobby}
                    className="btn btn-secondary btn-sm"
                  >
                    Close lobby
                  </button>
                </>
              )}
              {((ggc.allConnectionStatus[myIndex] === CONN_OBSERVER) ||
                (!ggc.bGameInProgress && lobby.host !== myName)) && (
                <button
                  onClick={handleLeaveLobby}
                  className="btn btn-secondary btn-sm"
                >
                  Leave lobby
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/*-------------------------------------------------------------------
        Row 2: Game status, current bid, doubt info
      --------------------------------------------------------------------*/}
      <div className="row mb-3">
        <div className="col">
          {/*----------------------------------------------
                  BID
          -----------------------------------------------*/}
          {isMyTurn ? (
            //----- MY TURN -----//
            <div className="border border-primary rounded p-1">
              <div className="row">
                <div className="col">
                  <p className="fw-bold">{row2YourTurnString}</p>
                  <p className="fw-bold">{row2SpecialPasoString}</p>
                </div>
              </div>

              <div className="border border-secondary rounded p-1 d-inline-block">
                <div className="row align-items-center mb-1">
                  {/* dropbox */}
                  <div className="col-auto">
                    <select
                      value={selectedBid}
                      onChange={(e) => setSelectedBid(e.target.value)}
                      className="form-select w-auto"
                    >
                      {possibleBids.map((bid) => (
                        <option key={bid} value={bid}>{bid}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bid button */}
                  <div className="col-auto">
                    <button
                      className="ff-style-button"
                      disabled={selectedBid=='--Select--'}
                      onClick={() => handleBidOK(selectedBid, bidShowShake)}
                    >
                      Bid
                    </button>
                  </div>
                </div>

                {/* checkbox */}
                <div className="row">
                  <div className="col-auto">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showShakeCheckbox"
                        disabled={!canShowShake}
                        checked={bidShowShake}
                        onChange={(e) => setBidShowShake(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="showShakeCheckbox">
                        Show/shake
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row justify-content-between mt-2">
                <div className="col-auto">
                  {/* DOUBT button */}
                  <button
                    className="btn btn-danger btn-sm text-white me-2"
                    disabled={!ggc.numBids > 0}
                    onClick={() => handleBidOK('DOUBT', bidShowShake)}
                  >
                    Doubt
                  </button>
                  {/* PASO button */}
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!ggc.CanPaso()}
                    onClick={() => handleBidOK('PASO', bidShowShake)}
                  >
                    Paso
                  </button>
                </div>
              </div>
            </div>
          ) : null}


          {!ggc.bDoubtInProgress && !ggc.bShowDoubtResult && !isMyTurn ? (
            //----- NOT MY TURN -----//
            <div className="border border-primary rounded p-1">
              <div className="fw-bold text-center">
                <div>{row2CurrentBid}</div>
                <div>{row2BidToWhom}</div>
              </div>
            </div>
          ) : null}

          {/*----------------------------------------------
                  DOUBT
          -----------------------------------------------*/}
          {ggc.bDoubtInProgress || ggc.bShowDoubtResult ? (
            <div className="border border-primary rounded p-1">
              <div className="row">
                <div className="col text-center">
                  <div className="fw-bold">{row2DoubtWho}</div>
                  <div className="fw-bold">{row2DoubtBid}</div>
                  <div className="fw-bold">{row2DoubtResult}</div>
                  <div className="fw-bold">{row2DoubtStick}</div>
                  <div className="fw-bold">{row2DoubtWin}</div>
                  {ggc.bDoubtInProgress ? (
                  <button
                    className="ff-style-button"
                    disabled = {ggc.result.doubtDidLiftCup[myIndex]}
                    onClick={() => socket.emit('liftCup', { lobbyId, index: myIndex })}
                  >
                    Lift Cup
                  </button>
                  ) : null}
                  {ggc.bShowDoubtResult ? (
                  <button
                    className="ff-style-button"
                    disabled = {ggc.nextRoundDidSay[myIndex]}
                    onClick={() => socket.emit('nextRound', { lobbyId, index: myIndex })}
                  >
                    OK
                  </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>


<div style={{ maxHeight: '60px', overflowY: 'auto' }}>
  <div className="container">
    <div className="row fw-bold border-bottom pb-1 mb-1">
      <div className="col-2">Player</div>
      <div className="col-2">Bid</div>
    </div>
    {bidHistoryRef.current.map((row, index) => (
      <div className="row py-1 border-bottom" key={index}>
        <div className="col-2">{row.Player}</div>
        <div className="col-2">{row.Bid}</div>
      </div>
    ))}
  </div>
</div>






      {/*-------------------------------------------------------------------
        Row 3: Canvas
      --------------------------------------------------------------------*/}
      <div className="row">
        <div className="col">
          <canvas
            ref={canvasRef}
            className="img-fluid w-100"
            style={{
              pointerEvents: showYesNoDlg || showOkDlg || showConfirmBidDlg ? 'none' : 'auto'
            }}
          />
        </div>
      </div>

      {/* existing overlays and dialogs stay outside the layout grid */}
      {showCountdown && (
        <div className="position-absolute top-50 start-50 translate-middle bg-dark text-white p-1 rounded" style={{ zIndex: 3000 }}>
          {countdownMessage}
        </div>
      )}

      {/*-------------------------------------------------------------------
        DIALOGS
      --------------------------------------------------------------------*/      }
      {showConfirmBidDlg && (
        <ConfirmBidDlg
          open={showConfirmBidDlg}
          position={confirmPosition}
          setPosition={setConfirmPosition}          
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
