import React, { useEffect, useState, useRef, act } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { SocketContext } from '../SocketContext.js';
import { ImageRefsContext } from '../ImageRefsContext.js';
import { DudoGame } from '../DudoGameC.js'
import { PlayerGrid } from './PlayerGrid.js'
import { TableGrid } from './TableGrid.js'
import tableBackground from '../assets/table-background.png';

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

    const {
      cupDownImageRef,
      cupUpImageRef,
      diceImagesRef,
      diceHiddenImageRef,
      stickImageRef,
      imagesReady
    } = useContext(ImageRefsContext);

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
    //const [imagesReady, setImagesReady] = useState(false);

    const [showCountdown, setShowCountdown] = useState(false);
    // structure: { playerName: 'Alice', secondsRemaining: 23 }
    const [countdownMessage, setCountdownMessage] = useState('');
    
    // Row2
    // game settings
    const [row2NumSticks, setRow2NumSticks] = useState("3");
    const [row2PasoAllowed, setRow2PasoAllowed] = useState(true);
    const [row2PalofijoAllowed, setRow2PalofijoAllowed] = useState(true);

    // bid
    const [row2YourTurnString, setRow2YourTurnString] = useState('');
    const [row2SpecialPasoString, setRow2SpecialPasoString] = useState('');
    const [row2CurrentBid, setRow2CurrentBid] = useState('');
    const [row2BidToWhom, setRow2BidToWhom] = useState('');

    const [thisBid, setThisBid] = useState('');
    const [selectedBid, setSelectedBid] = useState('');
    const [canShowShake, setCanShowShake] = useState(false);
    const [bidShowShake, setBidShowShake] = useState(false);

    // show doubt
    const [row2DoubtWho, setRow2DoubtWho] = useState('');
    const [row2DoubtBid, setRow2DoubtBid] = useState('');
    const [row2DoubtResult, setRow2DoubtResult] = useState('');
    const [row2DoubtStick, setRow2DoubtStick] = useState('');
    const [row2DoubtWin, setRow2DoubtWin] = useState('');
    const [row2DoubtShowButton, setRow2DoubtShowButton] = useState('');
    
    // Row3 (TableGrid)
    const fixedRef = useRef(null);
    const [availableHeight, setAvailableHeight] = useState(window.innerHeight);

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

    // Bid History
    const [histCurrentBid, setHistCurrentBid] = useState('');
    const [histShowing, setHistShowing] = useState('');
    const [histLookage, setHistLookage] = useState('');

    // Refs
    const canvasRef = useRef(null);
    //const cupDownImageRef = useRef(null);
    //const cupUpImageRef = useRef(null);
    //const diceImagesRef = useRef({});
    //const diceHiddenImageRef = useRef({});
    //const stickImageRef = useRef({});
    const myShowShakeRef = useRef(false);
    const bidHistoryRef = useRef([]);
    
    // Refs debugging
    const prevReconnect = useRef(null);
    const prevDraw = useRef(null);

    // for drawing player and dice
    const cupWidth = 40;
    const cupHeight = 56;
    const diceSize = 18;
    const stickSize = 18;
    const playerBoxInnerMargin = 5;
    const playerBoxWidth = cupWidth + 5*diceSize + 8*playerBoxInnerMargin;

    const playerBoxTopHeight = 66;
    const playerBoxBottomHeight = 28;
    const playerBoxHeight = playerBoxTopHeight + playerBoxBottomHeight;

    let xArray = [];
    let yArray = [];
    const directionBoxWidth = playerBoxWidth / 2;
    const directionBoxHeight = playerBoxHeight / 2;
    let directionBoxX;
    let directionBoxY;

    // background for TableGrid
    const backgroundStyle = ggc.allConnectionStatus[myIndex] === CONN_OBSERVER
      ? { backgroundColor: 'lightgray' }
      : {
          backgroundImage: `url(${tableBackground})`,
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0',
        }
    const UIMargin = 8;

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

    // update Bid History
    if (ggc.numBids < 1) {
      return;
    }
    const lastBidText = ggc.allBids[ggc.numBids-1].text;
    setHistCurrentBid(lastBidText);
    if (lastBidText == "PASO" || lastBidText == "DOUBT") {
      setHistShowing('');
      setHistLookage('');
    } else {
      ggc.parseBid(lastBidText);
      const showing = ggc.GetHowManyShowing (ggc.parsedOfWhat, ggc.bPaloFijoRound);
      setHistShowing(showing);
      const lookage = ggc.parsedHowMany - showing;
      setHistLookage(lookage);
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
  // Click: Host set game parameters
  //************************************************************
  const handleGameSettings = () => {
    if (connected) {

      setRow2NumSticks (ggc.maxSticks);
      setRow2PasoAllowed (ggc.bPasoAllowed);
      setRow2PalofijoAllowed (ggc.bPaloFijoAllowed);

      socket.emit('setGameParms', lobbyId);
      console.log ('GamePage: emiting "setGameParms"');
    }
  };
  const handleSaveSettings = () => {
    if (connected) {
      socket.emit('saveGameParms', lobbyId, row2NumSticks, row2PasoAllowed, row2PalofijoAllowed);
      console.log ('GamePage: emiting "SaveGameParms"');
    }
  }
  const handleCancelSettings = () => {
    if (connected) {
      socket.emit('cancelGameParms', lobbyId);
      console.log ('GamePage: emiting "cancelGameParms"');
    }
  }

  //************************************************************
  // Click: In or out?
  //************************************************************
  const handleYesImIn = () => {
    socket.emit('inOrOut', { lobbyId, index: myIndex, status: CONN_PLAYER_IN })
    console.log ('GamePage: emiting "inOrOut" with IN response');
  }

  const handleNoIllWatch = () => {
    socket.emit('inOrOut', { lobbyId, index: myIndex, status: CONN_OBSERVER })
    console.log ('GamePage: emiting "inOrOut" with WATCH response');
  }

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
  //  functions to handle Options menu
  //************************************************************
  const handleOptBidHistory = () => {

  }
  const handleOptObservers = () => {

  }
  const handleOptHowToPlay = () => {

  }
  const handleOptAbout = () => {

  }
  const handleOptHelp = () => {

  }


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
      // show previous bid
      let turnString = (ggc.numBids < 1 ? 'You bid first' : 
                                          `The bid to you is: ${ggc.GetBidString(ggc.numBids-1)}`);
      setRow2YourTurnString(turnString);
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
        let s1= currentBid.playerName + " bid: " + ggc.GetBidString(ggc.numBids-1);
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
            setRow2CurrentBid(s1);
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
  const getViewportHeight = () => {
    // visualWiewport for mobile
    return window.visualViewport?.height || window.innerHeight;
  };

  useEffect(() => {
    const updateLayout = () => {
      setScreenSize({
        width: window.innerWidth,
        height: getViewportHeight(),
      });

      if (fixedRef.current) {
        const fixedHeight = fixedRef.current.offsetHeight;
        setAvailableHeight(getViewportHeight() - fixedHeight - 16);
        //timing issue with UIMargin, use literal instead
        //setAvailableHeight(getViewportHeight() - fixedHeight - 2 * UIMargin);
      }
    };

    // Initial run
    updateLayout ();

    // Listen to resize events
    window.addEventListener('resize', updateLayout);
    window.visualViewport?.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.visualViewport?.removeEventListener('resize', updateLayout);
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
/*
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
*/

  // wait for images to be loaded
  if (!imagesReady) {
    console.log("GamePage: useEffect DRAW: IMAGES ARE NOT LOADED YET");
    return;
  }

  // Make sure we have the latest game state
  ggc.AssignGameState(gameState);

  // Start drawing
  //DrawSomeText ();

  let yPos = 140;   //&&& obsolete
  const yPosIncr = 110;
  let arrayObserverNames = [];
  arrayObserverNames.length = 0;
  

  const DEBUGGING = 0;    // 0 means no debugging
  // draw bid history
  if (ggc.bGameInProgress) {
    DrawBidHistory();
    //DrawBidHistoryOld();
  }

  // draw observer names
  yPos += 20;
  //DrawObserverNames (yPos);

  // Draw bid status
  if (ggc.bGameInProgress) {
    DrawProcessBid();
  } else {
    DrawWaitingToStartGame();
  }

  // dialogs
  if (ggc.bAskInOut) {
    //DrawInOrOut();
  }

  if (ggc.bDoubtInProgress) {
    DrawDoubtInProgress();
  }
  
  if (ggc.bShowDoubtResult) {
    DrawDoubtResult();
  }

  //****************************************************************
  // Set up coordinates of player boxes 
  //****************************************************************
  function SetPlayerCoords(players) {

    const clientWidth = window.innerWidth;
    const clientHeight = window.innerHeight;
    const dividingLine = clientHeight *.8;

    let marginX;
    let marginY;
    let offset;

    switch (players) {
      case 1:
        marginX = (clientWidth - playerBoxWidth) / 2;
        marginY = (dividingLine - playerBoxHeight) / 2;
        xArray[0] = marginX;
        yArray[0] = marginY;
        break;
      case 2:
        marginX = (clientWidth - 2 *playerBoxWidth) / 3;
        marginY = (dividingLine - playerBoxHeight) / 2;
        xArray[0] = marginX;
        yArray[0] = marginY;

        xArray[1] = 2 * marginX + playerBoxWidth;
        yArray[1] = marginY;
        break;
      case 3:
        marginX = (clientWidth - playerBoxWidth) / 2;
        marginY = (dividingLine - 2 * playerBoxHeight) / 3;
        xArray[0] = marginX;
        yArray[0] = marginY;

        offset = 4;
        marginX = (clientWidth - 2 * playerBoxWidth) / 3;
        xArray[1] = 2 * marginX + playerBoxWidth + offset;
        yArray[1] = 2 * marginY + playerBoxHeight;

        xArray[2] = marginX - offset;
        yArray[2] = 2 * marginY + playerBoxHeight;

        directionBoxX = (clientWidth - directionBoxWidth) / 2;
        directionBoxY = 2 * marginY + playerBoxHeight - directionBoxHeight / 2;
        break;
      case 4:
        marginX = (clientWidth - playerBoxWidth) / 2;
        marginY = (dividingLine - 3 * playerBoxHeight) / 4;
        xArray[0] = marginX;
        yArray[0] = marginY;

        xArray[2] = marginX;
        yArray[2] = 3 * marginY + 2 *playerBoxHeight;

        marginX = (clientWidth - 2 * playerBoxWidth) / 3;
        offset = marginX / 2;
        xArray[1] = 2 * marginX + playerBoxWidth + offset;
        yArray[1] = 2 * marginY + playerBoxHeight;

        xArray[3] = marginX - offset;
        yArray[3] = 2 * marginY + playerBoxHeight;

        directionBoxX = (clientWidth - directionBoxWidth) / 2;
        directionBoxY = (dividingLine - directionBoxHeight) / 2;
        break;
      case 5:
        marginX = (clientWidth - playerBoxWidth) / 2;
        marginY = (dividingLine - 3 * playerBoxHeight) / 4;
        xArray[0] = marginX;
        yArray[0] = marginY;

        offset = playerBoxWidth / 2;
        marginX = (clientWidth - 2 *playerBoxWidth) / 3;
        xArray[4] = marginX - offset;
        yArray[4] = 2 * marginY + playerBoxHeight;

        xArray[1] = 2 * marginX + playerBoxWidth + offset;
        yArray[1] = 2 * marginY + playerBoxHeight;

        xArray[3] = marginX;
        yArray[3] = 3 * marginY + 2 * playerBoxHeight;

        xArray[2] = 2 * marginX + playerBoxWidth;
        yArray[2] = 3 * marginY + 2 * playerBoxHeight;

        directionBoxX = (clientWidth - directionBoxWidth) / 2;
        directionBoxY = (dividingLine - directionBoxHeight) / 2;
        break;
      case 6:
        marginX = (clientWidth - playerBoxWidth) / 2;
        marginY = (dividingLine - 3 * playerBoxHeight) / 4;
        xArray[0] = marginX;
        yArray[0] = marginY;

        xArray[3] = marginX;
        yArray[3] = 3 * marginY + 2 * playerBoxHeight;

        marginX = (clientWidth - 3 *playerBoxWidth) / 4;
        marginY = (dividingLine - 2 * playerBoxHeight) / 3;
        xArray[5] = marginX;
        yArray[5] = marginY;

        xArray[4] = marginX;
        yArray[4] = 2 * marginY + playerBoxHeight;

        xArray[1] = 3 * marginX + 2 * playerBoxWidth;
        yArray[1] = marginY;

        xArray[2] = 3 * marginX + 2 * playerBoxWidth;
        yArray[2] = 2 * marginY + playerBoxHeight;

        directionBoxX = (clientWidth - directionBoxWidth) / 2;
        directionBoxY = (dividingLine - directionBoxHeight) / 2;
        break;
      default:
        break;
    }
  }

  //************************************************************
  //  function Draw a rounded rectangle
  //************************************************************
  function drawRoundedRect(ctx, x, y, width, height, radius = 4) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.stroke();
  }

  //************************************************************
  //  function Draw bid history
  //************************************************************
  function DrawBidHistory () {
    // clear out any previous values
    bidHistoryRef.current.length = 0;

    // add bids from scratch
    for (let i=0;  i<ggc.numBids; i++) {
      bidHistoryRef.current.push({ Player: ggc.allBids[i].playerName,
                                   Bid: ggc.GetBidString(i)});
    }
  }
  
  //************************************************************
  //  function Draw InOrOut (obsolete)
  //************************************************************
  function DrawInOrOut() {
    let msg = "Starting a new game\n\n";
    msg += `Number of sticks: ${ggc.maxSticks}\n`;
    if (ggc.maxSticks == 1) msg += ' (one and done)';
    msg += ggc.bPasoAllowed ? "Paso allowed: Yes\n" : "Paso allowed: No\n";
    msg += ggc.bPaloFijoAllowed ? "Palofijo: Yes\n" : "Palofijo: No\n";
    msg += "\nAre you in?";
    
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
  //  Render return function
  //************************************************************
  return (
    <div
      className="d-flex flex-column"
      style={{ height: '100vh', overflow: 'hidden', margin: `${UIMargin}px`}}
    >
    {/* Fixed Content: NavBar + Row1 + Row2 */}
    <div ref={fixedRef}>
      {/* Navigation bar */}
      <div className="w-100">{RenderNavBar()}</div>

      {/* Row 1: Lobby info */}
      <div className="row mb-2 my-2">
        <div className="col">
          <div className="border border-primary rounded p-1 d-flex justify-content-center align-items-center">
            <div className="fw-bold text-center">
              <div>Dudo Lobby Host: {lobbyHost}</div>
              <div>Your Name: {myName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Game status info */}
      <div className="row mb-3">
        <div className="col">
          {ggc.bSettingGameParms && lobby.host === myName && RenderGameSettings()}
          {ggc.bAskInOut && RenderInOut()}
          {isMyTurn && RenderBid()}

          {!ggc.bDoubtInProgress && !ggc.bShowDoubtResult && !ggc.bAskInOut && !isMyTurn && (
            <div className="border border-primary rounded p-1">
              <div className="fw-bold text-center">
                <div>{row2CurrentBid}</div>
                <div>{row2BidToWhom}</div>
              </div>
            </div>
          )}

          {(ggc.bDoubtInProgress || ggc.bShowDoubtResult) && RenderDoubt()}
        </div>
      </div>
    </div>

    {/* Row 3: TableGrid takes up remaining height */}
    <div
      style={{
        height: `${availableHeight}px`,
        overflow: 'hidden',
        padding: '8px',
        ...backgroundStyle,
        boxSizing: 'border-box',
        border: '2px solid red',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          ...backgroundStyle
        }}
      >
        <TableGrid ggc={ggc} myIndex={myIndex} backgroundColor="transparent" />
      </div>
    </div>

    {/* Floating countdown overlay */}
    {showCountdown && (
      <div
        className="position-absolute top-50 start-50 translate-middle bg-dark text-white p-1 rounded"
        style={{ zIndex: 3000 }}
      >
        {countdownMessage}
      </div>
    )}

    {/*-------------------------------------------------------------------
      DIALOGS
    --------------------------------------------------------------------*/}
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

  //************************************************************
  //  Render functions called by return
  //************************************************************
  /*----------------------------------------------
          NAV BAR
  -----------------------------------------------*/
  function RenderNavBar () {
    return (
      <nav className="navbar navbar-expand bg-primary text-white rounded px-0 py-1">
        <div className="container-fluid">
          {/* Dropdown Menu */}
          <div className="dropdown me-3">
            <button
              className="btn btn-primary dropdown-toggle"
              type="button"
              id="optionsMenu"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Options
            </button>
            <ul className="dropdown-menu" aria-labelledby="optionsMenu">
              <li><button className="dropdown-item" 
                onClick={handleOptBidHistory}
                disabled={!ggc.bGameInProgress || ggc.numBids < 1}
              >
                Bid History</button></li>          
              <li><button className="dropdown-item" 
                onClick={handleOptObservers}
              >
                Observers</button></li>          
              <li><button className="dropdown-item" 
                onClick={handleOptHowToPlay}
              >
                How To Play</button></li>          
              <li><button className="dropdown-item" 
                onClick={handleOptAbout}
              >
                About</button></li>          
              <li><button className="dropdown-item" 
                onClick={handleOptHelp}
              >
                Help</button></li>          
            </ul>
          </div>

          {/* Other buttons */}
          {(!ggc.bGameInProgress && lobby.host === myName) && (
            <>
            <button
              onClick={handleStartGame}
              className="btn btn-primary btn-outline-light btn-sm"
              disabled={(ggc.GetNumberPlayersInLobby() < 2) || ggc.bSettingGameParms}
            >
              Start Game
            </button>
            <button
              onClick={handleGameSettings}
              disabled={ggc.bAskInOut}
              className="btn btn-primary btn-outline-light btn-sm"
            >
              Game Settings
            </button>
            <button
              onClick={handleLeaveLobby}
              className="btn btn-secondary btn-outline-light btn-sm"
            >
              Close lobby
            </button>
            </>
          )}
          {(!ggc.bGameInProgress && lobby.host !== myName) && (
            <button
              onClick={handleLeaveLobby}
              className="btn btn-secondary btn-outline-light btn-sm"
            >
              Leave lobby
            </button>
          )}
        </div>
      </nav>
    )
  }

  /*----------------------------------------------
          GAME SETTINGS
  -----------------------------------------------*/
  function RenderGameSettings () {
    return (
      <div className="border border-primary rounded p-3 mb-1">
        <div className="fw-bold text-center mb-2">
          Set Game Parameters
        </div>

        <div className="row align-items-center mb-1">
          {/* number of sticks (dropbox) */}
          <div className="col-4 text-end">
            Number of sticks:
          </div>
          <div className="col-4">
            <select
              className="form-select form-select-sm w-auto"
              value={row2NumSticks}
              onChange={(e) => setRow2NumSticks(e.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>

          <div className="col-4 d-flex justify-content-end">
            {/* Save button */}
            <button
              onClick={handleSaveSettings}
              className="btn btn-primary btn-sm me-2"
            >
              Save
            </button>
          </div>
        </div>

        {/* paso allowed? (checkbox) */}
        <div className="row align-items-center mb-1">
          <div className="col-4 text-end">
            Paso allowed:
          </div>
          <div className="col-4">
            {/* paso checkbox */}
            <input
              type="checkbox"
              className="form-check-input"
              id="pasoAllowedCheckbox"
              checked={row2PasoAllowed}
              onChange={(e) => setRow2PasoAllowed(e.target.checked)}                  
            />
          </div>
          <div className="col-4 d-flex justify-content-end">
            {/* Cancel button */}
            <button
              onClick={handleCancelSettings}
              className="btn btn-secondary btn-sm me-2"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* palofijo allowed? (checkbox) */}
        <div className="row align-items-center">
          <div className="col-4 text-end">
            Palo Fijo allowed:
          </div>
          <div className="col-4">
            {/* palo fijo checkbox */}
            <input
              type="checkbox"
              className="form-check-input"
              id="palofijoAllowedCheckbox"
              checked={row2PalofijoAllowed}
              onChange={(e) => setRow2PalofijoAllowed(e.target.checked)}                  
            />
          </div>
        </div>
      </div>
    )
   }

  /*----------------------------------------------
          IN OR OUT
  -----------------------------------------------*/
   function RenderInOut () {
    return (
      <div className="border border-primary rounded p-3 mb-1">
        <div className="fw-bold text-center mb-1">
          Starting a new game
        </div>
        <div className="fw-bold text-center mb-1">
          Are you in?
        </div>

        <div className="row align-items-center mb-1">
          {/* number of sticks (dropbox) */}
          <div className="col-4 text-end">
            Number of sticks:
          </div>
          <div className="col-4">
            {ggc.maxSticks}
          </div>

          <div className="col-4 d-flex justify-content-end">
            {/* Yes button */}
            <button
              onClick={handleYesImIn}
              className="btn btn-primary btn-sm me-2"
            >
              Yes, I'm in
            </button>
          </div>
        </div>

        {/* paso allowed? (value) */}
        <div className="row align-items-center mb-1">
          <div className="col-4 text-end">
            Paso allowed:
          </div>
          <div className="col-4">
            {ggc.bPasoAllowed? ("Yes") : ("No")}  
          </div>
          <div className="col-4 d-flex justify-content-end">
            {/* No button */}
            <button
              onClick={handleNoIllWatch}
              className="btn btn-secondary btn-sm me-2"
            >
              No, I'll watch
            </button>
          </div>
        </div>

        {/* palofijo allowed? (checkbox) */}
        <div className="row align-items-center">
          <div className="col-4 text-end">
            Palo Fijo allowed:
          </div>
          <div className="col-4">
            {ggc.bPaloFijoAllowed? ("Yes") : ("No")}
          </div>
        </div>
      </div>
    )
  }

  /*----------------------------------------------
          BID
  -----------------------------------------------*/
  function RenderBid () {
    return (
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
    )
  }

  /*----------------------------------------------
          DOUBT
  -----------------------------------------------*/
  function RenderDoubt () {
    return (
      <div className="border border-primary rounded p-1">
        <div className="row">
          <div className="col text-center">
            <div className="fw-bold">{row2DoubtWho}</div>
            <div className="fw-bold">{row2DoubtBid}</div>
            <div className="fw-bold">{row2DoubtResult}</div>
            <div className="fw-bold">{row2DoubtStick}</div>
            <div className="fw-bold">{row2DoubtWin}</div>
            {ggc.bDoubtInProgress && (ggc.result.doubtMustLiftCup[myIndex]) ? (
            <button
              className="ff-style-button"
              disabled = {ggc.result.doubtDidLiftCup[myIndex]}
              onClick={() => socket.emit('liftCup', { lobbyId, index: myIndex })}
            >
              Lift Cup
            </button>
            ) : null}
            {ggc.bShowDoubtResult && (ggc.nextRoundMustSay[myIndex]) ? (
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
    )
  }

}




export default GamePage;
