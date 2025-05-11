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
    
    // dialogs
    const [showBidDlg, setShowBidDlg] = useState(false);
    const [thisBid, setThisBid] = useState('');

    const [showDoubtDlg, setShowDoubtDlg] = useState(false);
    const [doubtPosition, setDoubtPosition] = useState({ x: 200, y: 240 });
    const [doubtTitle, setDoubtTitle] = useState('');
    const [doubtMessage, setDoubtMessage] = useState('');
    const [doubtShowButton, setDoubtShowButton] = useState('');
    const [doubtButtonText, setDoubtButtonText] = useState('');
    const [doubtEvent, setDoubtEvent] = useState('');

    const [showShowShakeDlg, setShowShakeDlg] = useState(false);
    const [showShakePosition, setShowShakePosition] = useState({ x: 200, y: 200 });
    const [showShakeTitle, setShowShakeTitle] = useState('');
    const [showShakeMessage, setShowShakeMessage] = useState('');

    const [showConfirmBidDlg, setShowConfirmBidDlg] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');

    const [showOkDlg, setShowOkDlg] = useState(false);
    const [okPosition, setOkPosition] = useState({ x: 200, y: 200 });
    const [okTitle, setOkTitle] = useState('');
    const [okMessage, setOkMessage] = useState('');
    const [onOkHandler, setOnOkHandler] = useState(() => () => {});  // default no-op

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
    const prev = useRef(null);
    const amIHost = useRef(null);

  //************************************************************
  // DEBUGGING, put socket into windows so
  //            browser console can access it
  //************************************************************
  useEffect(() => {
    if (socket) {
      window.socket = socket;  // Expose socket globally for DevTools
      window.gameState = gameState;
      window.myIndex = myIndex;
      window.myName = myName;
      window.isMyTurn = isMyTurn;
      console.log("GamePage: DEBUG window.stuff set!");
    }
  }, [socket, gameState]);

    //************************************************************
    // useEffect:  Store session values to survive refresh
    //             Trigger: [lobbyId, playerName]
    //************************************************************
    // Immediately store values to survive refresh
    useEffect(() => {
      sessionStorage.setItem('lobbyId', lobbyId);
      sessionStorage.setItem('playerName', playerName);
    }, [lobbyId, playerName]);
  
    //************************************************************
    // useEffect:  Initial setup: 
    //             Join lobby, get initial lobby data, listener
    //             Trigger: [lobbyId, playerName]
    //************************************************************
    //
    useEffect(() => {
      if (!socket || !connected) {
        console.log('GamePage: socket not connected yet');
        return;
      }
  
      console.log('GamePage: running initial lobby setup');
  
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
  
    /*
  //************************************************************
  // useEffect:  Ask for latest game state on mount
  //             Trigger: [socket, lobbyId]
  //************************************************************
  useEffect(() => {
    if (socket && lobbyId) {
      console.log("GamePage: requesting latest lobby/game state");
      if (connected) {
        socket.emit('getLobbyData', lobbyId, (lobby) => {
          if (lobby && lobby.game) {
            console.log("GamePage: received lobby/game after manual request");
            setLobby(lobby);
            setGameState(lobby.game);
            ggc.AssignGameState(lobby.game);
    
            const stringSocketId = String(socketId);  //&&&
            const index = ggc.allConnectionID.indexOf(stringSocketId);
            setMyIndex (index);
            setMyName (ggc.allParticipantNames[index]);
        
          } else {
            console.warn("GamePage: Failed to get lobby/game data!");
          }
        });
      }
    }
  }, [socket, lobbyId]);
*/
  //************************************************************
  // function handleGameStateUpdate
  //************************************************************
  const handleGameStateUpdate = (data) => {
    console.log("GamePage: entering function: handleGameStateUpdate");
    setGameState(data);
    ggc.AssignGameState(data);

    // Take down any dialog boxes
    setShowBidDlg (false);
    setShowShakeDlg (false);
    setShowConfirmBidDlg (false);
    setShowDoubtDlg (false);
    setShowOkDlg (false);
    setShowYesNoDlg (false);

    // What is my index and my name?
    const stringSocketId = String(socketId);
    const index = ggc.allConnectionID.indexOf(stringSocketId);
    setMyIndex (index);
    setMyName (ggc.allParticipantNames[index]);
    setWhosTurnName(ggc.allParticipantNames[ggc.whosTurn]);

    // is it my turn to bid?
    setIsMyTurn(index == ggc.whosTurn);

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
        });
      }
    });
    setOnNoHandler(() => () => {
      setShowYesNoDlg(false);
      setThisBid('');
      myShowShakeRef.current = false;
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
    setShowBidDlg(true); // start over
  };
  
  //************************************************************
  // useEffect:  Turn listeners on 
  //             Trigger: [socket, connected]
  //************************************************************
  useEffect(() => {
    if (!socket || !connected) {
      console.log("GamePage: socket not ready yet, skipping socket.on setup");
      return;
    }
  
    console.log("GamePage: useEffect [] registering socket listeners");

    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('gameOver', handleGameOver);
    socket.on('forceLeaveLobby', handleForceLeaveLobby);

    return () => {
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('gameOver', handleGameOver);
      socket.off('forceLeaveLobby', handleForceLeaveLobby);
    };
  }, [socket, connected]); 

  //************************************************************
  // useEffect:  Handle window resize
  //             Trigger: []
  //************************************************************
  useEffect(() => {
    console.log("GamePage: useEffect [] setScreenSize");

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
  // useEffect:  load images
  //             Trigger: []
  //************************************************************
  useEffect(() => {
    console.log("GamePage: useEffect [] load images");
  
    let loaded = 0;
    const totalToLoad = 9;  // cup down, cup up, 6 dice, hidden die
    const diceImgs = {};
  
    const checkIfDone = () => {
      loaded++;
      console.log(`Image loaded: ${loaded}/${totalToLoad}`);
      if (loaded === totalToLoad) {
        diceImagesRef.current = diceImgs;
        setImagesReady(true);
        console.log("All images loaded. Setting imagesReady = true");
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
// useEffect:  ask server to send lobby data with callback
//             Trigger:  [lobbyID]
//************************************************************
useEffect(() => {
  console.log("GamePage: useEffect [lobbyId] 'getLobbyData' with callback");

  if (connected) {
    socket?.emit('getLobbyData', lobbyId, (lobby) => {
      console.log ("GamePage.js: useEffect callback from getLobbyData");
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
// useEffect:  socket re-connect
//             Trigger:  [socket, socketId, connected, lobbyId, myName]
//*************************************************************
useEffect(() => {

  if (prev.current) {
    const p = prev.current;
    if (p.socket     !== socket)   console.log('RECONNECT: socket changed', p.socket, '→', socket);
    if (p.socketId   !== socketId) console.log('RECONNECT: socketId changed', p.socketId, '→', socketId);
    if (p.connected  !== connected)console.log('RECONNECT: connected changed', p.connected, '→', connected);
    if (p.lobbyId    !== lobbyId)  console.log('RECONNECT: lobbyId changed', p.lobbyId, '→', lobbyId);
    if (p.myName     !== myName)   console.log('RECONNECT: myName changed', p.myName, '→', myName);
  }
  prev.current = { socket, socketId, connected, lobbyId, myName };

  if (!socket) {
    console.log("RECONNECT: socket not ready yet, skipping connect handler setup");
    return;
  }

  //************************************************************
  // function handle Reconnect
  //************************************************************
  function handleReconnect() {
   
    console.log("RECONNECT: function handleReconnect", lobbyId, myName);
    console.log("RECONNECT: trying to rejoin lobby");
    
    // get the name from storage, in case this was a browser tab refresh
    let nameFromStorage = sessionStorage.getItem('playerName');

    // this won't get updated until the next render (React behavior)
    // so use 'nameFromStorage' for the rest of this routine
    setMyName(nameFromStorage);   

    if (lobbyId && nameFromStorage) {
      if (connected) {
        socket.emit('rejoinLobby', { lobbyId, playerName: nameFromStorage, id: socket.id }, (serverLobbyData) => {
          console.log("RECONNECT: callback received lobby/game data:", serverLobbyData);
  
          // Reconstruct your client-side state
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
        console.log("RECONNECT: not rejoining lobby, 'connected' not valid. ", connected);
      }
    }
    else {
      console.log("RECONNECT: not rejoining lobby, 'lobbyID' and/or 'nameFromStorage' not valid. ", lobbyId, nameFromStorage);
    }
  }

  console.log("RECONNECT: socket.on('connect') for reconnect handling");
  socket.on('connect', handleReconnect);

  // Call immediately if already connected (e.g. on refresh)
  if (socket.connected) {
    console.log("GamePage: socket already connected, calling handleReconnect immediately");
    handleReconnect();
  }
  
  return () => {
    console.log("RECONNECT: socket.off('connect') for reconnect handling");
    socket.off('connect', handleReconnect);
  };
}, [socket, socketId, connected, lobbyId, myName]);


//************************************************************
// useEffect:  Draw on canvas
//             Trigger:  [gameState, lobbyPlayers, isMyTurn, screenSize]
//************************************************************
useEffect(() => {
    console.log("GamePage: useEffect [gameState, lobbyPlayers, isMyTurn, screenSize, imagesReady] Draw on canvas");

    //-------------------------------------------
    // wait for images to be loaded
    //-------------------------------------------
    if (!imagesReady) {
      console.log("GamePage: useEffect IMAGES ARE NOT LOADED YET");
      return;
    }

    //-------------------------------------------
    // prepare canvas
    //-------------------------------------------
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match screen
    canvas.width = screenSize.width;
    canvas.height = screenSize.height;

    // Clear canvas
    ctx.fillStyle = (ggc.allConnectionStatus[myIndex] == CONN_OBSERVER ? 'lightgray' : 'lightblue');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ggc.AssignGameState(gameState);

    //-------------------------------------------
    // draw some text
    //-------------------------------------------
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
    //ctx.fillText(`Your name: ${myName} (id = ${socketId})`, 20, 60);

    // Display current turn
    if (ggc.bGameInProgress) {
      ctx.fillText(`Current turn: ${whosTurnName}`, 20, 80);
      ctx.fillText(isMyTurn ? "It's YOUR turn to bid!" : `Waiting for ${whosTurnName}...`, 20, 100);
    } else {
      ctx.fillText(`Waiting for host to start a game...`, 20, 80);
    }

    // Display number of sticks
    if (ggc.bGameInProgress) {
      const sticks = ggc.allSticks[myIndex];
      ctx.fillText(`Number of sticks: ${sticks}`, 20, 120);
    }

    //************************************************
    // Begin loop through all connections (players)
    //************************************************
    //-------------------------------------------
    // Display cup and dice images
    //-------------------------------------------
    let yPos = 140;
    const offset = 110;
    let arrayObserverNames = [];
    arrayObserverNames.length = 0;
    
    for (let p=0; p<ggc.maxConnections; p++) {
      if (ggc.allConnectionStatus[p] == CONN_UNUSED) {
        continue;
      }
      if (ggc.allConnectionStatus[p] == CONN_OBSERVER) {
        arrayObserverNames.push(ggc.allParticipantNames[p]);
        continue;
      }
      
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

      yPos += offset;
    }

    //-------------------------------------------
    // Display bid history
    //-------------------------------------------
    if (ggc.bGameInProgress) {
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

    //-------------------------------------------
    // my turn?
    //-------------------------------------------
    if (ggc.bGameInProgress) {
      if (isMyTurn) {
        if (ggc.bPaloFijoRound) {
          ggc.PopulateBidListPaloFijo();
        } else {
          ggc.PopulateBidListRegular();
        }
        ggc.PopulateBidListPasoDudo();
        setPossibleBids(ggc.possibleBids || []);
      }
    }

    //-------------------------------------------
    // palofijo?
    //-------------------------------------------
    if (ggc.bGameInProgress) {
      if (ggc.bPaloFijoRound) {
        ctx.fillText('PALO FIJO', 20, 460);
      }
    }
  
    //-------------------------------------------
    // doubt in progress?
    //-------------------------------------------
    if (ggc.bDoubtInProgress) {
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
    
    //-------------------------------------------
    // show doubt result?
    //-------------------------------------------
    if (ggc.bShowDoubtResult) {
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
    //************************************************
    // End loop through all connections (players)
    //************************************************

    //-------------------------------------------
    // Display observer names
    //-------------------------------------------
    yPos += 20;
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

    //-------------------------------------------
    // Display (or not) Ask in or out
    //-------------------------------------------
     if (ggc.bAskInOut) {
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
  
    //-------------------------------------------
    // Display (or not) bid UI
    //-------------------------------------------
    if (ggc.bGameInProgress) {
      if (isMyTurn) {
        setShowBidDlg(true);
      } else {
        setShowBidDlg(false); // optional: auto-close when it's no longer their turn
      }
    }

  }, [gameState, lobbyPlayers, isMyTurn, screenSize, imagesReady, socketId]);


  //************************************************************
  //  Render
  //************************************************************
  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: '0', margin: '0' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
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
        {(!ggc.bGameInProgress && (lobby.host != myName)) && (
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

      {/* === Bid dialog === */}
      {isMyTurn && (
        <>
          <BidDlg
            open={showBidDlg}
            onClose={() => setShowBidDlg(false)}
            onSubmit={handleBidOK}
            bids={possibleBids}
            makeBidString="Select your bid"
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
            style={{ left: 210, top: 140, position: 'absolute', zIndex: 1000 }}
          />
        </>
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
