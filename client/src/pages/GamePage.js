import React, { useEffect, useState, useRef, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { SocketContext } from '../SocketContext.js';
import { ImageRefsContext } from '../ImageRefsContext.js';
import { DudoGame } from '../DudoGameC.js'
import { TableGrid } from './TableGrid.js'
import { BidGrid } from './BidGrid.js'

import tableBackground from '../assets/table-background.png';
import tableBackgroundFaded from '../assets/table-background-faded.png';
import './GamePage.css';

import { ConfirmBidDlg } from '../Dialogs.js';
import { InOutDlg } from '../Dialogs.js';
import { DirectionDlg } from '../Dialogs.js';
import { OkDlg } from '../Dialogs.js';
import { YesNoDlg } from '../Dialogs.js';
import { LiftCupDlg } from '../Dialogs.js';
import { ShowDoubtDlg } from '../Dialogs.js';
import { BidHistoryDlg } from '../Dialogs.js';
import { ObserversDlg } from '../Dialogs.js';
import { GameSettingsDlg } from '../Dialogs.js';
import { SetGameParametersDlg } from '../Dialogs.js';

import { MAX_CONNECTIONS, CONN_PLAYER_IN, CONN_PLAYER_OUT, CONN_OBSERVER } from '../DudoGameC.js';
import { STICKS_BLINK_TIME, SHOWN_DICE_BLINK_TIME, SHAKE_CUPS_TIME } from '../DudoGameC.js';

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
      directionLeftImageRef,
      directionRightImageRef,
      imagesReady,
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
    const [bidMatrix, setBidMatrix] = useState([]);

    const [myIndex, setMyIndex] = useState(0);
    const [myName, setMyName] = useState('');
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [whosTurnName, setWhosTurnName] = useState('');

    const [showCountdown, setShowCountdown] = useState(false);
    // structure: { playerName: 'Alice', secondsRemaining: 23 }
    const [countdownMessage, setCountdownMessage] = useState('');
    
    // Row2
    // game settings
    const [row2NumSticks, setRow2NumSticks] = useState("3");
    const [row2PasoAllowed, setRow2PasoAllowed] = useState(true);
    const [row2PalofijoAllowed, setRow2PalofijoAllowed] = useState(true);

    // bid
    const [showBidPanel, setShowBidPanel] = useState(false);  // obsolete

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
    const [availableWidth, setAvailableWidth] = useState(window.innerWidth);

    // dialogs
    // confirm Bid (obsolete)
    const [showConfirmBidDlg, setShowConfirmBidDlg] = useState(false);
    const [confirmPosition, setConfirmPosition] = useState({ x: 200, y: 200 });
    const [confirmMessage, setConfirmMessage] = useState('');

    // In / Out
    const [showInOutDlg, setShowInOutDlg] = useState(false);
    const [inOutSticks, setInOutSticks] = useState(false);
    const [inOutPaso, setInOutPaso] = useState(false);
    const [inOutPaloFijo, SetInOutPaloFijo] = useState(false);
    const [onInHandler, setOnInHandler] = useState(() => () => {});  // default no-op
    const [onOutHandler, setOnOutHandler] = useState(() => () => {});  // default no-op

    // choose direction
    const [showDirectionDlg, setShowDirectionDlg] = useState(false);
    const [leftTextDirection, setLeftTextDirection] = useState(false);
    const [rightTextDirection, setRightTextDirection] = useState(false);
    const [onLeftHandler, setOnLeftHandler] = useState(() => () => {});
    const [onRightHandler, setOnRightHandler] = useState(() => () => {});

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
    const [onYesHandler, setOnYesHandler] = useState(() => () => {});
    const [onNoHandler, setOnNoHandler] = useState(() => () => {});

    // Set Game Parameters
    const [showSetGameParametersDlg, setShowSetGameParametersDlg] = useState(false);
    const [gameParametersSticks, setGameParametersSticks] = useState(false);
    const [gameParametersPaso, setGameParametersPaso] = useState(false);
    const [gameParametersPalofijo, setGameParametersPalofijo] = useState(false);
    const [onGameParametersSaveHandler, setOnGameParametersSaveHandler] = useState(() => () => {});
    const [onGameParametersCancelHandler, setOnGameParametersCancelHandler] = useState(() => () => {});
    const [gameParametersMode, setGameParametersMode] = useState('navbar'); // called from navbar, or from Start Game?

    // Bid History
    const [showBidHistoryDlg, setShowBidHistoryDlg] = useState(false);
    const [onBidHistoryOkHandler, setOnBidHistoryOkHandler] = useState(() => () => {});

    // doubt result strings (used by Lift Cup and Show Doubt)
    const [doubtWhoDoubtedWhom, setDoubtWhoDoubtedWhom] = useState('');
    const [doubtDoubtedBid, setDoubtDoubtedBid] = useState('');
    const [doubtThereAre, setDoubtThereAre] = useState('');
    const [doubtWhoGotStick, setDoubtWhoGotStick] = useState('');
    const [doubtWhoWon, setDoubtWhoWon] = useState('');

    // Lift Cup
    const [showLiftCupDlg, setShowLiftCupDlg] = useState(false);
    const [onLiftCupOkHandler, setOnLiftCupOkHandler] = useState(() => () => {});
    const [liftCupShowButton, setLiftCupShowButton] = useState(false);
    const [liftCupShowButtonX, setLiftCupShowButtonX] = useState(false);

    // Show Doubt
    const [showShowDoubtDlg, setShowShowDoubtDlg] = useState(false);
    const [onShowDoubtOkHandler, setOnShowDoubtOkHandler] = useState(() => () => {});
    const [showDoubtShowButton, setShowDoubtShowButton] = useState(false);
    const [showDoubtShowButtonX, setShowDoubtShowButtonX] = useState(false);

    // Observers
    const [showObserversDlg, setShowObserversDlg] = useState(false);
    const [onObserversOkHandler, setOnObserversOkHandler] = useState(() => () => {});

    // Game Settings
    const [showGameSettingsDlg, setShowGameSettingsDlg] = useState(false);
    const [onGameSettingsOkHandler, setOnGameSettingsOkHandler] = useState(() => () => {});

    // old stuff
    const [histCurrentBid, setHistCurrentBid] = useState('');
    const [histShowing, setHistShowing] = useState('');
    const [histLookage, setHistLookage] = useState('');

    // Refs
    const myShowShakeRef = useRef(false);
    const bidHistoryRef = useRef([]);
    const reversedBids = useRef([]);
    const observersRef = useRef([]);
    const leaveLobbyTimerRef = useRef(null);

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
      ? { backgroundImage: `url(${tableBackgroundFaded})`,
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0',
        } : {
          backgroundImage: `url(${tableBackground})`,
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0',
        }
    const UIMargin = '.5rem';

    //************************************************************
    // UseEffect CHECKBOX [selectedBid, CanShowShake]
    //           track changes in checkbox
    //************************************************************
    useEffect(() => {
			if (ggc.allConnectionID.length === 0) { 
				return;
			}
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
    setShowLiftCupDlg (false);
    setShowShowDoubtDlg (false);
    setShowBidHistoryDlg (false);
    setShowObserversDlg (false);
    setShowGameSettingsDlg (false);

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

    if (ggc.curRound == null) { 
      return;
    }

    // update Bid History
    if (ggc.curRound.numBids < 1) {
      return;
    }
    const lastBidText = ggc.curRound.Bids[ggc.curRound.numBids-1].text;
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
      setGameParametersSticks(ggc.maxSticks);
      setGameParametersPaso(ggc.bPasoAllowed);
      setGameParametersPalofijo(ggc.bPaloFijoAllowed);

    	setGameParametersMode("start");
    	setShowSetGameParametersDlg(true);

			setOnGameParametersSaveHandler(() => (sticks, paso, palofijo) => {
				if (connected) {
					setGameParametersSticks(sticks);
					setGameParametersPaso(paso);
					setGameParametersPalofijo(palofijo);
					setShowSetGameParametersDlg(false);

					socket.emit('startGameWithParms', lobbyId, sticks, paso, palofijo);
					console.log('GamePage: emitting "startGameWithParms"');
				}
			});

			setOnGameParametersCancelHandler(() => () => {
				if (connected) {
					setShowSetGameParametersDlg(false);
					socket.emit('cancelStartGame', lobbyId);
					console.log('GamePage: emitting "cancelStartGame"');
				}
			});
    }
  };

  //************************************************************
  // Click: Host set game parameters
  //************************************************************
  const handleGameSettings = () => {

    if (connected) {
      setGameParametersSticks(ggc.maxSticks);
      setGameParametersPaso(ggc.bPasoAllowed);
      setGameParametersPalofijo(ggc.bPaloFijoAllowed);

    	setGameParametersMode("navbar");
      setShowSetGameParametersDlg(true);

      // Set the handlers dynamically
      setOnGameParametersSaveHandler(() => (sticks, paso, palofijo) => {
        if (connected) {
          setGameParametersSticks(sticks);
          setGameParametersPaso(paso);
          setGameParametersPalofijo(palofijo);

          setShowSetGameParametersDlg(false);
          socket.emit('saveGameParms', lobbyId, sticks, paso, palofijo);
          console.log('GamePage: emitting "saveGameParms"');
        }
      });

      setOnGameParametersCancelHandler(() => () => {
        if (connected) {
          setShowSetGameParametersDlg(false);
          socket.emit('cancelGameParms', lobbyId);
          console.log('GamePage: emitting "cancelGameParms"');
        }
      });

      socket.emit('setGameParms', lobbyId);
      console.log('GamePage: emitting "setGameParms"');
    }
  };

  //************************************************************
  // Click: Host set game parameters
  // (obsolete)
  //************************************************************
  /*
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
*/
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
    setShowBidPanel(false);

    // prepare to confirm the bid using YesNoDlg
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
    reversedBids.current = ggc.curRound.Bids.slice(0, ggc.curRound.numBids).reverse();
    setShowBidHistoryDlg(true);

    setOnBidHistoryOkHandler(() => () => {
      setShowBidHistoryDlg(false);
    });
  }

  const handleOptObservers = () => {
    observersRef.current = []; // ← Clear it first
    for (let cc=0; cc<MAX_CONNECTIONS; cc++) {
      if (ggc.allConnectionStatus[cc] === CONN_OBSERVER) {
        observersRef.current.push({ playerName: ggc.allParticipantNames[cc]});
      }
    }
    setShowObserversDlg(true);

    setOnObserversOkHandler(() => () => {
      setShowObserversDlg(false);
    });
  }

  const handleOptGameSettings = () => {
    setShowGameSettingsDlg(true);

    setOnGameSettingsOkHandler(() => () => {
      setShowGameSettingsDlg(false);
    });

  }

  const handleOptHowToPlay = () => {
    navigate('/how-to-play', { state: { lobbyId } });
  }

  const handleOptAbout = () => {
    navigate('/about', { state: { lobbyId } });
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

    myShowShakeRef.current = false;
    setBidShowShake(false)    
    if (isMyTurn) {
      //-------------------------------------------
      // my turn
      //-------------------------------------------

      if (ggc.bDirectionInProgress) {
        let s = (ggc.bPaloFijoRound ? 'PALO FIJO: ' : '');
        s += "You choose the direction";
        setRow2CurrentBid(s);
        setRow2BidToWhom('');
      } else {
        // show previous bid
        let turnString = '';
        if (ggc.curRound.numBids > 0) {
          const sName = ggc.curRound.Bids[ggc.curRound.numBids-1].playerName;
          turnString = (`${sName} bid to you: ${ggc.GetBidString(ggc.curRound.numBids-1)}`);
        } else {
          turnString = 'You start the bidding.';
        }

        if (ggc.bPaloFijoRound) {
          turnString = 'PALO FIJO: ' + turnString;
        }
        setRow2YourTurnString(turnString);
        setRow2SpecialPasoString (ggc.curRound.numBids > 1 && ggc.curRound.Bids[ggc.curRound.numBids-1].text == "PASO" ?
                              `Doubt the PASO or top the bid: ${ggc.curRound.Bids[ggc.FindLastNonPasoBid()].text}.` :
                              '');
        setSelectedBid (ggc.possibleBids[0]);
        setShowBidPanel(true);
      }
    } else {
      //-------------------------------------------
      // not my turn
      //-------------------------------------------
      if (ggc.curRound.numBids > 0) {
        // there is at least one bid
        const currentBid = ggc.curRound.Bids[ggc.curRound.numBids-1];
        let s1= currentBid.playerName + " bid: " + ggc.GetBidString(ggc.curRound.numBids-1);
        if (ggc.bPaloFijoRound) {
          s1 = "PALO FIJO: " + s1;
        }
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
        let s = (ggc.bPaloFijoRound ? 'PALO FIJO: ' : '');
        s += `Waiting for ${whosTurnName} to start the bidding...`;
        setRow2CurrentBid(s);
        setRow2BidToWhom('');
      }
      if (ggc.bDirectionInProgress) {
        // waiting for someone to choose the direction
        let s = (ggc.bPaloFijoRound ? 'PALO FIJO: ' : '');
        s += `Waiting for ${whosTurnName} to choose the direction...`;
        setRow2CurrentBid(s);
        setRow2BidToWhom('');
      }
    }
  }

  //************************************************************
  // function to prepare the in/out dialog
  //************************************************************
  const PrepareInOrOutDlg = () => {

    setInOutSticks(ggc.maxSticks);
    setInOutPaso(ggc.bPasoAllowed ? "Yes" : "No");
    SetInOutPaloFijo(ggc.bPaloFijoAllowed ? "Yes" : "No");
    setShowInOutDlg(true);

    setOnInHandler(() => () => {
      setShowInOutDlg(false);
      socket.emit('inOrOut', { lobbyId, index: myIndex, status: CONN_PLAYER_IN })
      console.log ('GamePage: emiting "inOrOut" with IN response');
    });
    setOnOutHandler(() => () => {
      setShowInOutDlg(false);
      socket.emit('inOrOut', { lobbyId, index: myIndex, status: CONN_OBSERVER })
      console.log ('GamePage: emiting "inOrOut" with WATCH response');
    });
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
  // function to prepare the Lift Cup dialog
  //************************************************************
  const PrepareLiftCupDlg = () => {
    PrepareLiftCupStrings();
    if (ggc.doubtMustLiftCup[myIndex] &&
       !ggc.doubtDidLiftCup[myIndex]) {
        setLiftCupShowButton(true);
    } else {
      setLiftCupShowButton(false);
    }
    setLiftCupShowButtonX(ggc.allConnectionStatus[myIndex] === CONN_OBSERVER ? true : false);

    setShowLiftCupDlg(true);
    // do not show, if observer hit the X
    if (ggc.allConnectionStatus[myIndex] === CONN_OBSERVER &&
        ggc.doubtDidLiftCup[myIndex]) {
        setShowLiftCupDlg(false);
    }

    setOnLiftCupOkHandler(() => () => {
      setShowLiftCupDlg(false);
      socket.emit('liftCup', { lobbyId, index: myIndex })
      console.log ('GamePage: emiting "LiftCup"');
    });
  }

  //************************************************************
  // function to prepare the Show Doubt dialog
  //************************************************************
  const PrepareShowDoubtDlg = () => {
    PrepareShowDoubtStrings();

    const status = ggc.allConnectionStatus[myIndex];
    const canBail = (status === CONN_PLAYER_OUT || status === CONN_OBSERVER);
    setShowDoubtShowButton  (canBail ? false : true);
    //setShowDoubtShowButtonX (canBail ? true : false);
    setShowDoubtShowButtonX (false);

    setShowShowDoubtDlg(true);
    // do not show, if observer hit the X
    if (ggc.allConnectionStatus[myIndex] === CONN_OBSERVER &&
        ggc.nextRoundDidSay[myIndex]) {
        setShowShowDoubtDlg(false);
    }

    setOnShowDoubtOkHandler(() => () => {
      setShowShowDoubtDlg(false);
      setIsMyTurn(false);
      socket.emit('nextRound', { lobbyId, index: myIndex })
      console.log ('GamePage: emiting "nextRound"');
    });
  }

  //************************************************************
  // function to prepare lift cup strings
  //************************************************************
    function PrepareLiftCupStrings() {
    // prepare strings to say what happened
    let s1 = "";  // who doubted whom
    let s2 = "";  // what the bid was
    s1 = ggc.allParticipantNames[ggc.curRound.whoDoubted];
    s1 += " doubted ";
    s1 += ggc.allParticipantNames[ggc.curRound.whoGotDoubted];
    setDoubtWhoDoubtedWhom(s1);

    if (ggc.curRound.doubtWasPaso) {
      // PASO
      s2 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + " bid PASO . . .";
    } else {
      // non-PASO
      s2 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + "'s bid was " + ggc.curRound.doubtedText + ' . . .';
      s2 += "\n(" + ggc.curRound.doubtShowing + " showing, looking for " + ggc.curRound.doubtLookingFor + ")\n";
    }
    setDoubtDoubtedBid(s2);

    setDoubtThereAre('');    
    setDoubtWhoGotStick('');    
    setDoubtWhoWon('');    
  }

  //************************************************************
  // function to prepare doubt result strings
  //************************************************************
    function PrepareShowDoubtStrings() {
    // prepare strings to say what happened
    let s1 = "";  // who doubted whom
    let s2 = "";  // what the bid was
    let s3 = "";  // result of doubt
    let s4 = "";  // who got the stick
    let s5 = "";  // who got won the game (if anyone)
    s1 = ggc.allParticipantNames[ggc.curRound.whoDoubted];
    s1 += " doubted ";
    s1 += ggc.allParticipantNames[ggc.curRound.whoGotDoubted];
    setDoubtWhoDoubtedWhom(s1);

    if (ggc.curRound.doubtWasPaso) {
      // PASO
      s2 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + " bid PASO . . . ";
      if (ggc.curRound.doubtPasoWasThere) {
          s3 = "It is there.";
      } else {
          s3 = "It is NOT there.";
      }

/*
      if (ggc.curRound.doubtPasoWasThere) {
          s3 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + " has the PASO.";
      } else {
          s3 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + " does not have the PASO.";
      }
*/


    } else {
      // non-PASO
      s2 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + "'s bid was " + ggc.curRound.doubtedText;

      s3 = (ggc.curRound.doubtCount == 1 ? " . . . There is " : " . . . There are ") + ggc.curRound.doubtCount + '.';
    }
    setDoubtDoubtedBid(s2);

    setDoubtThereAre(s3);

    s4 = ggc.allParticipantNames[ggc.curRound.doubtLoser] + " got the stick";
    if (ggc.curRound.doubtLoserPaloFijo) {
      s4 += ", and is PALO FIJO.";
    }
    if (ggc.curRound.doubtLoserOut) {
      s4 += ", and is OUT.";
    }
//    if (!ggc.curRound.doubtLoserPaloFijo && !ggc.curRound.doubtLoserOut) {
//      s4 += ".";
//    }
    setDoubtWhoGotStick(s4);

    let msg = s1 + "\n" + s2 + s3 + "\n" + s4; 

    if (ggc.bWinnerGame) {
      s5 = ggc.allParticipantNames[ggc.whoWonGame] + " WINS THE GAME!!"
    } else {
      s5 = '';
    }
    setDoubtWhoWon(s5);
  }

  //************************************************************
  // function to handle 'forceLeaveLobby'
  // (host has left, the lobby is about to be deleted)
  //************************************************************
  const handleForceLeaveLobby = () => {
    setOkMessage("The host has closed the lobby.");
    setOkTitle("Closing lobby");

    // user clicks OK or auto-times out
    const onOk = () => {
      // Clear the timer if still pending
      if (leaveLobbyTimerRef.current) {
        clearTimeout(leaveLobbyTimerRef.current);
        leaveLobbyTimerRef.current = null;
      }
      if (connected) {
        socket.emit('leaveLobby', { playerName, lobbyId });
        navigate('/');
        console.log('GamePage: handleForceLeaveLobby, leaving');
      }
      setShowOkDlg(false);
    };

    // Set the dialog's handler
    setOnOkHandler(() => onOk);
    setShowOkDlg(true);

    // Auto-trigger leave after 15 seconds
    leaveLobbyTimerRef.current = setTimeout(() => {
      onOk();
    }, 15000);
  };

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
  // (obsolete)
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
  const getViewportWidth = () => {
    // visualWiewport for mobile
    return window.visualViewport?.width || window.innerWidth;
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
    if (ggc.inOutMustSay[myIndex] && !ggc.inOutDidSay[myIndex]) {
      PrepareInOrOutDlg();
      //DrawInOrOut();
    }
  }

//  if (ggc.bDoubtInProgress) {
    // DrawDoubtInProgress();
  if (ggc.bDoubtInProgress) {
//    if (!ggc.doubtMustLiftCup[myIndex] || 
//        !ggc.doubtDidLiftCup[myIndex]) {
      PrepareLiftCupDlg();
//    }
  }
  
  if (ggc.bShowDoubtResult && 
      ggc.nextRoundMustSay[myIndex] &&
      !ggc.nextRoundDidSay[myIndex]) {
    setShowLiftCupDlg (false);
    PrepareShowDoubtDlg();
  }
  if (ggc.bShowDoubtResult && 
     ((ggc.allConnectionStatus[myIndex] === CONN_OBSERVER)  ||
      (ggc.allConnectionStatus[myIndex] === CONN_PLAYER_OUT))) {
    setShowLiftCupDlg (false);
    PrepareShowDoubtDlg();
  }

  //if (ggc.bShowDoubtResult) {
    //DrawDoubtResult();
  //}

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
    for (let i=0;  i<ggc.curRound.numBids; i++) {
      bidHistoryRef.current.push({ Player: ggc.curRound.Bids[i].playerName,
                                   Bid: ggc.GetBidString(i)});
    }
  }
  
  //************************************************************
  //  function Draw InOrOut (obsolete)
  //************************************************************
  /*
  function DrawInOrOut() {
    let msg = "Starting a new game\n\n";
    msg += `Number of sticks: ${ggc.maxSticks}\n`;
    if (ggc.maxSticks == 1) msg += ' (one and done)';
    msg += ggc.bPasoAllowed ? "Paso allowed: Yes\n" : "Paso allowed: No\n";
    msg += ggc.bPaloFijoAllowed ? "Palofijo: Yes\n" : "Palofijo: No\n";
    msg += "\nAre you in?";
    
    // who has not yet said in or out
    let ss = "\n\nWaiting to hear from:";
    for (let cc = 0; cc < MAX_CONNECTIONS; cc++) {
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
*/
  //************************************************************
  //  function Draw and process the bid
  //************************************************************
  function DrawProcessBid() {

    // wait for UI to be ready
    let delay = 0;
    if (ggc.SomebodyGotStick()) {
      delay += STICKS_BLINK_TIME;
    }
//    if (ggc.ShouldAllRollDice()) {
//      delay += SHAKE_CUPS_TIME;  
//    }
    if (delay > 0) {
  
      console.log("DELAY - STICKS BLINKING", delay);

      setTimeout(() => {
        DoProcessBid();
      }, delay);
    } else {
      DoProcessBid();
    }
  }

  function DoProcessBid() {
      if (isMyTurn) {
        // my turn
        // populate the bid list
        if (ggc.bPaloFijoRound) {
          ggc.PopulateBidListPaloFijo();
        } else {
          ggc.PopulateBidListRegular();
        }
        ggc.PopulateBidListTrim();
        setPossibleBids(ggc.possibleBids || []);
        ggc.PopulateBidMatrix();
        setBidMatrix(ggc.BidMatrix);

        // show dialog, handle responses
        if (ggc.curRound.whichDirection == undefined) {
          //---------------------------------------------
          // choose direction if starting a round
          //---------------------------------------------
          setTimeout(() => {
            // wait until dice are shaken
            let cc = ggc.getPlayerToLeft(myIndex);
            setLeftTextDirection("to " + ggc.allParticipantNames[cc]);
            cc = ggc.getPlayerToRight(myIndex);
            setRightTextDirection("to " + ggc.allParticipantNames[cc]);
            setOnLeftHandler(() => () => {
              setShowDirectionDlg(false);
              socket.emit('direction', { lobbyId, index: myIndex, direction: 1 })
              PrepareBidUI();
            });
            setOnRightHandler(() => () => {
              setShowDirectionDlg(false);
              socket.emit('direction', { lobbyId, index: myIndex, direction: 2 })
              PrepareBidUI();
            });
            setShowDirectionDlg(true);



/*            
            setYesNoMessage("You start the bidding.\nWhich way?");
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
              socket.emit('direction', { lobbyId, index: myIndex, direction: 1 })
              PrepareBidUI();
            });
            setOnNoHandler(() => () => {
              setShowYesNoDlg(false);
              socket.emit('direction', { lobbyId, index: myIndex, direction: 2 })
              PrepareBidUI();
            });
            setShowYesNoDlg(true);
*/
          }, SHAKE_CUPS_TIME);
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
                        'Waiting for YOU to start the game...' :
                        `Waiting for ${lobby.host} to start the game...`);
    }
    setRow2BidToWhom('');
  }

  //************************************************************
  //  function Draw Doubt in Progress
  //  (obsolete)
  //************************************************************
  function DrawDoubtInProgress () {
    // prepare strings to say what happened
    let s1 = "";  // who doubted whom
    let s2 = "";  // what the bid was
    let s3 = '';  // who has not yet lifted the cup
    s1 = ggc.allParticipantNames[ggc.curRound.whoDoubted];
    s1 += " doubted ";
    s1 += ggc.allParticipantNames[ggc.curRound.whoGotDoubted];
    setRow2DoubtWho(s1);

    if (ggc.curRound.doubtWasPaso) {
      // PASO
      s2 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + " bid PASO";
    } else {
      // non-PASO
      s2 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + "'s bid was " + ggc.curRound.doubtedText;

      s2 += "\n(" + ggc.curRound.doubtShowing + " showing, looking for " + ggc.curRound.doubtLookingFor + ")\n";
    }
    setRow2DoubtBid(s2);

    // who has not yet lifted their cup
    s3 = "Waiting to see dice from:";
    for (let cc = 0; cc < MAX_CONNECTIONS; cc++) {
      if (ggc.doubtMustLiftCup[cc]) {
        if (!ggc.doubtDidLiftCup[cc]) {
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
  //  obsolete?
  //************************************************************
  function DrawDoubtResult() {
    // prepare strings to say what happened
    let s1 = "";  // who doubted whom
    let s2 = "";  // what the bid was
    let s3 = "";  // result of doubt
    let s4 = "";  // who got the stick
    let s5 = "";  // who got won the game (if anyone)
    s1 = ggc.allParticipantNames[ggc.curRound.whoDoubted];
    s1 += " doubted ";
    s1 += ggc.allParticipantNames[ggc.curRound.whoGotDoubted];
    setRow2DoubtWho(s1);

    if (ggc.curRound.doubtWasPaso) {
      // PASO
      s2 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + " bid PASO";
      if (ggc.curRound.doubtPasoWasThere) {
          s3 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + " has the PASO";
      } else {
          s3 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + " does not have the PASO";
      }
    } else {
      // non-PASO
      s2 = ggc.allParticipantNames[ggc.curRound.whoGotDoubted] + "'s bid was " + ggc.curRound.doubtedText;

      s3 = (ggc.curRound.doubtCount == 1 ? "There is " : "There are ") + ggc.curRound.doubtCount;
    }
    setRow2DoubtBid(s2);
    setRow2DoubtResult(s3);

    s4 = ggc.allParticipantNames[ggc.curRound.doubtLoser] + " got the stick";
    if (ggc.curRound.doubtLoserOut) {
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
  //************************************************************
  //  Render 
  //************************************************************
  //************************************************************
  return (
    <>
        <div
          className="d-flex flex-column"
          style={{ height: '100vh', overflow: 'hidden', margin: `${UIMargin}`}}
        >
        {/* Fixed Content: NavBar + Row1 + Row2 */}
        <div ref={fixedRef}>
          {/* Navigation bar */}
          <div className="w-100">{RenderNavBar()}</div>

          {/* Row 1: Lobby info */}
          <div className="row mb-2 my-2">
            <div className="col">
              <div className="border border-primary rounded p-1 d-flex justify-content-between align-items-center fw-bold">
                <div>Your Name: {myName}</div>
                <div>Dudo Lobby Host: {lobbyHost}</div>
              </div>
            </div>
          </div>

          {/* Row 2: Game status info */}
          <div className="row mb-3">
            <div className="col">
              {/* ggc.bSettingGameParms && lobby.host === myName && RenderGameSettings() */}

              {/* {ggc.bAskInOut && RenderInOut()} */}

              {/* isMyTurn && RenderBid() */}
              {isMyTurn && RenderGridBid()}

              {!ggc.bDoubtInProgress && !ggc.bShowDoubtResult && !ggc.bAskInOut && !isMyTurn && (
                <div className="border border-primary rounded p-1">
                  <div className="fw-bold text-center">
                    <div>{row2CurrentBid}</div>
                    <div>{row2BidToWhom}</div>
                  </div>
                </div>
              )}

              {/* (ggc.bDoubtInProgress || ggc.bShowDoubtResult) && RenderDoubt() */}
            </div>
          </div>
        </div>

        {/* Row 3: TableGrid takes up remaining height */}
        <div
          style={{
            height: `${availableHeight}px`,
            overflow: 'hidden',
            padding: '.5rem',
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
            <TableGrid lobbyId={lobbyId} ggc={ggc} myIndex={myIndex} backgroundColor="transparent" />
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

        {showInOutDlg && (
          <InOutDlg
            open={showInOutDlg}
            inOutSticks={inOutSticks}
            inOutPaso={inOutPaso}
            inOutPaloFijo={inOutPaloFijo}
            onIn={onInHandler}
            onOut={onOutHandler}
          />
        )}

        {showDirectionDlg && (
          <DirectionDlg
            open={showDirectionDlg}
            leftText={leftTextDirection}
            rightText={rightTextDirection}
            onLeft={onLeftHandler}
            onRight={onRightHandler}
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

        {showLiftCupDlg && (
          <LiftCupDlg
            open={showLiftCupDlg}
            doubtWhoDoubtedWhom={doubtWhoDoubtedWhom}
            doubtDoubtedBid={doubtDoubtedBid}
            liftCupShowButton={liftCupShowButton}
            liftCupShowButtonX={liftCupShowButtonX}
            onOk={onLiftCupOkHandler}
          />
        )}

        {showShowDoubtDlg && (
          <ShowDoubtDlg
            open={showShowDoubtDlg}
            doubtWhoDoubtedWhom={doubtWhoDoubtedWhom}
            doubtDoubtedBid={doubtDoubtedBid}
            doubtThereAre={doubtThereAre}
            doubtWhoGotStick={doubtWhoGotStick}
            doubtWhoWon={doubtWhoWon}
            showDoubtShowButton={showDoubtShowButton}
            showDoubtShowButtonX={showDoubtShowButtonX}
            onOk={onShowDoubtOkHandler}
          />
        )}

        {showBidHistoryDlg && (
          <BidHistoryDlg
            open={showBidHistoryDlg}
            bids={reversedBids.current}
            onOk={onBidHistoryOkHandler}
          />
        )}

        {showObserversDlg && (
          <ObserversDlg
            open={showObserversDlg}
            observers={observersRef.current}
            onOk={onObserversOkHandler}
          />
        )}

        {showSetGameParametersDlg && (
          <SetGameParametersDlg
            open={showSetGameParametersDlg}
            sticks={gameParametersSticks}
            paso={gameParametersPaso}
            palofijo={gameParametersPalofijo}
            onSave={onGameParametersSaveHandler}
            onCancel={onGameParametersCancelHandler}
            mode={gameParametersMode}
          />
        )}

        {showGameSettingsDlg && (
          <GameSettingsDlg
            open={showGameSettingsDlg}
            sticks={ggc.maxSticks}
            paso={ggc.bPasoAllowed}
            palofijo={ggc.bPaloFijoAllowed}
            onOk={onGameSettingsOkHandler}
          />
        )}

      </div>

      {/* OUTSIDE of flex column to allow fixed positioning */}
      {/* <BidPanel show={showBidPanel} onClose={() => setShowBidPanel(false)} /> */}

    </>
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
                disabled={!ggc.bGameInProgress || ggc.curRound.numBids < 1}
              >
                Bid History</button></li>
              <li><button className="dropdown-item" 
                onClick={handleOptObservers}
              >
                Observers</button></li>
              <li><button className="dropdown-item" 
                onClick={handleOptGameSettings}
                disabled={!ggc.bGameInProgress}
              >
                Game Settings</button></li>
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
          {(ggc.allConnectionStatus[myIndex] === CONN_OBSERVER || 
           (!ggc.bGameInProgress && lobby.host !== myName)) && (
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
          IN OR OUT (obsolete)
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
  /*
  function BidPanel({ show, onClose }) {
    return (
      <div className={`bid-panel ${show ? 'open' : ''}`}>
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Your Turn to Bid</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>×</button>
        </div>
        <div className="p-3">
          <RenderBid />
        </div>
      </div>
    );
  }
*/
  function RenderBid () {
    return (
      //----- MY TURN -----//
      <div className="border border-primary rounded p-2">
        <div
          className="d-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto auto auto',
            gridTemplateRows: 'auto auto',
            alignItems: 'center',
            rowGap: '0.5rem',
            columnGap: '0.75rem',
          }}
        >
          {/* Row 1: message spans first 4 cols */}
          <div style={{ gridColumn: '1 / span 4' }}>
            <p className="fw-bold mb-1">{row2YourTurnString}</p>
            <p className="fw-bold mb-0">{row2SpecialPasoString}</p>
          </div>

          {/* Row 1: Paso button (col 5) on narrow screens*/}
          {ggc.bPasoAllowed && getViewportWidth() < 500 ? (
            <div style={{ gridColumn: 5 }}>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={!ggc.CanPaso()}
                onClick={() => handleBidOK('PASO', bidShowShake)}
              >
                Paso
              </button>
            </div>
          ) : null}

          {/* Row 2: bordered wrapper around cols 1-3 */}
          <div
            style={{
              gridColumn: '1 / span 3',
              display: 'contents', // children placed directly in grid
            }}
          >
            <div
              className="border border-secondary rounded p-2 d-flex align-items-center justify-content-start"
              style={{
                gridColumn: '1 / span 3',
                display: 'grid',
                gridTemplateColumns: 'auto auto auto',
                columnGap: '0.75rem',
              }}
            >
              {/* Select box */}
              <select
                value={selectedBid}
                onChange={(e) => setSelectedBid(e.target.value)}
                className="form-select form-select-sm w-auto"
                style={{ minWidth: 0, width: 'auto' }}        >
                {possibleBids.map((bid) => (
                  <option key={bid} value={bid}>{bid}</option>
                ))}
              </select>

              {/* Checkbox */}
              <div className="form-check me-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showShakeCheckbox"
                  disabled={!canShowShake}
                  checked={bidShowShake}
                  onChange={(e) => setBidShowShake(e.target.checked)}
                />
                <label
                  className="form-check-label"
                  htmlFor="showShakeCheckbox"
                  style={{
                    color: canShowShake ? 'black' : 'gray',
                  }}
                >
                  Show
                </label>
              </div>

              {/* Bid button */}
              <button
                className="btn btn-primary btn-sm"
                disabled={selectedBid === '--Select--'}
                onClick={() => handleBidOK(selectedBid, bidShowShake)}
              >
                Bid
              </button>
            </div>
          </div>

          {/* Row 2: Paso button (col 4) on wider screens*/}
          {ggc.bPasoAllowed && getViewportWidth() >= 500 ? (
            <div style={{ gridColumn: 4 }}>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={!ggc.CanPaso()}
                onClick={() => handleBidOK('PASO', bidShowShake)}
              >
                Paso
              </button>
            </div>
            ) : null}

          {/* Row 2: Doubt button (col 5) */}
          <div style={{ gridColumn: 5 }}>
            <button
              className="btn btn-danger btn-sm text-white"
              disabled={!ggc.curRound.numBids > 0}
              onClick={() => handleBidOK('DOUBT', bidShowShake)}
            >
              Doubt
            </button>
          </div>
        </div>
      </div>
    )
  }

  /*----------------------------------------------
          BID USING GRID
  -----------------------------------------------*/
function RenderGridBid() {
  const bidGridRows = bidMatrix.length;

  return (
    <div className="border border-primary rounded p-2">
      {/* Row 1: header message (span all 8 cols) */}
      <div style={{ marginBottom: '0.5rem' }}>
        <p className="fw-bold mb-1">{row2YourTurnString}</p>
        <p className="fw-bold mb-0">{row2SpecialPasoString}</p>
      </div>

      <div
        className="d-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, auto) auto', // 7 bid columns + 1 right column
          gridTemplateRows: `repeat(${bidGridRows}, auto)`, // each row of BidGrid = 1 row
          columnGap: '0.75rem',
          rowGap: '0.25rem',
        }}
      >
        {/* BidGrid: spans 7 columns and all rows */}
        <div style={{ gridColumn: '1 / span 7', gridRow: `1 / span ${bidGridRows}` }}>
          <BidGrid
            validBids={bidMatrix}
            onBidSelect={(row, col) => {
              console.log(`You selected: ${row + 1} x ${col + 1}`);
              setSelectedBid(`${row + 1} - ${col + 1}`);
            }}
          />
        </div>

        {/* Right-side controls aligned with rows 1–4 */}

        {/* Row 1: Checkbox */}
        <div style={{ gridColumn: 8, gridRow: 1 }}>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="showShakeCheckbox"
              disabled={!canShowShake}
              checked={bidShowShake}
              onChange={(e) => setBidShowShake(e.target.checked)}
            />
            <label
              className="form-check-label"
              htmlFor="showShakeCheckbox"
              style={{ color: canShowShake ? 'black' : 'gray' }}
            >
              Show
            </label>
          </div>
        </div>

        {/* Row 2: Bid button */}
        <div style={{ gridColumn: 8, gridRow: 2 }}>
          <button
            className="btn btn-primary btn-sm w-100"
            disabled={selectedBid === '--Select--'}
            onClick={() => handleBidOK(selectedBid, bidShowShake)}
          >
            Bid
          </button>
        </div>

        {/* Row 3: Doubt button */}
        <div style={{ gridColumn: 8, gridRow: 3 }}>
          <button
            className="btn btn-danger btn-sm text-white w-100"
            disabled={!ggc.curRound.numBids > 0}
            onClick={() => handleBidOK('DOUBT', bidShowShake)}
          >
            Doubt
          </button>
        </div>

        {/* Row 4: Paso button */}
        {ggc.bPasoAllowed && (
          <div style={{ gridColumn: 8, gridRow: 4 }}>
            <button
              className="btn btn-outline-secondary btn-sm w-100"
              disabled={!ggc.CanPaso()}
              onClick={() => handleBidOK('PASO', bidShowShake)}
            >
              Paso
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

  /*----------------------------------------------
          DOUBT (obsolete)
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
            {ggc.bDoubtInProgress && (ggc.doubtMustLiftCup[myIndex]) ? (
            <button
              className="btn btn-primary btn-sm"
              disabled = {ggc.doubtDidLiftCup[myIndex]}
              onClick={() => socket.emit('liftCup', { lobbyId, index: myIndex })}
            >
              Lift Cup
            </button>
            ) : null}
            {ggc.bShowDoubtResult && (ggc.nextRoundMustSay[myIndex]) ? (
            <button
              className="btn btn-primary btn-sm"
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
