import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import socket from '../socket';
import { DudoGame } from '../DudoGameC.js'
import BidDlg from '../BidDlg';
import PopupDialog from '../PopupDialog';
import ShowShakeDlg from '../ShowShakeDlg.js';
import ConfirmBidDlg from '../ConfirmBidDlg.js';

  //************************************************************
  // GamePage function
  //************************************************************
  function GamePage() {
    console.log("GamePage: entering GamePage ()");

    // routing params
    const { lobbyId } = useParams();
    const location = useLocation();

    // state hooks
    const [gameState, setGameState] = useState({});
    const [lobbyPlayers, setLobbyPlayers] = useState([]);
    const [screenSize, setScreenSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    const [ggc] = useState(() => new DudoGame());
    const [possibleBids, setPossibleBids] = useState([]);

    const [myIndex, setMyIndex] = useState(0);
    const [mySocketId, setMySocketId] = useState();
    const [myName, setMyName] = useState('');
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [whosTurnName, setWhosTurnName] = useState('');
    
    const [bidDlg, setBidDlg] = useState(false);
    const [thisBid, setThisBid] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [showShakeDlg, setShowShakeDlg] = useState(false);
    const [confirmBidDlg, setConfirmBidDlg] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');

    const [imagesReady, setImagesReady] = useState(false);

    // Refs
    const canvasRef = useRef(null);
    const cupDownImageRef = useRef(null);
    const cupUpImageRef = useRef(null);
    const diceImagesRef = useRef({});
    const diceHiddenImageRef = useRef({});
    const myShowShakeRef = useRef(false);
    
    const handleGameStarted = (data) => {
      console.log("GamePage: entering function: handleGameStarted");
    };

  //************************************************************
  // function handleGameStateUpdate
  //************************************************************
  const handleGameStateUpdate = (data) => {
    console.log("GamePage: entering function: handleGameStateUpdate");
    setGameState(data);
    ggc.AssignGameState(data);

    // is it my turn to bid?
    const whosTurnSocketId = ggc.allConnectionID[ggc.whosTurn];
    const stringSocketId = String(window.mySocketId);
    if (whosTurnSocketId.toString() === stringSocketId) {
      setIsMyTurn (true);
    } else {
      setIsMyTurn (false);
    }

    if (isMyTurn) {
      if (ggc.bPaloFijoRound) {
        ggc.PopulateBidListPaloFijo();
      } else {
        ggc.PopulateBidListRegular();
      }
      ggc.PopulateBidListPasoDudo();
      setPossibleBids(ggc.possibleBids || []);
    }

    setWhosTurnName(ggc.allParticipantNames[ggc.whosTurn]);
    // could just use ggc.whosTurn instead of index?
    const index = ggc.allConnectionID.indexOf(stringSocketId);
    setMyIndex (index);
    setMyName (ggc.allParticipantNames[index]);
  };

  //************************************************************
  // function handleGameOver
  //************************************************************
  const handleGameOver = (data) => {
    console.log("GamePage: entering function: handleGameOver");
    alert(data.message);
  };


  //************************************************************
  //  function handle BidOK
  //************************************************************
  const handleBidOK = (bid) => {
    console.log("GamePage: entering function: handleBidOK()");
    console.log("GamePage; selected bid:", bid);

    setThisBid (bid);

    // Close the dialog
    setBidDlg(false);

    //-------------------------------------------
    // can they show and shake?
    //-------------------------------------------
    myShowShakeRef.current = false;
    let bFound = false;
    if (bid != "PASO" && bid != "DUDO") {
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
        setShowShakeDlg(true);
      } else {
      // if not, ask if they want to confirm the bid
        setConfirmMessage ('Your bid is:\n' + thisBid + '\n\nSubmit this bid?');
        setConfirmBidDlg(true);
      }
    }
  };

  //************************************************************
  // functions handle Yes, No from ShowShakeDlg
  //************************************************************
  const handleShowShakeYes = () => {
    myShowShakeRef.current = true;

    // Close the dialog
    setShowShakeDlg(false);

    // confirm the bid
    setConfirmMessage ('Your bid is:\n' + thisBid + ', Show and Shake\n\nSubmit this bid?');
    setConfirmBidDlg(true);
  };

  const handleShowShakeNo = () => {
    myShowShakeRef.current = false;

    // Close the dialog
    setShowShakeDlg(false);

    // confirm the bid
    setConfirmMessage ('Your bid is:\n' + thisBid + '\n\nSubmit this bid?');
    setConfirmBidDlg(true);
  };

  //************************************************************
  // functions handle Yes, No from ConfirmBidDlg
  //************************************************************
  const handleConfirmBidYes = () => {
    setConfirmBidDlg(false);

    // Now send the bid to the server
    socket.emit('bid', {
      lobbyId,
      bidText: thisBid,
      bidShakeShow: myShowShakeRef.current,
      index: myIndex,
      name: myName,
    });
    
  };

  const handleConfirmBidNo = () => {
    setConfirmBidDlg(false);
  };


  //************************************************************
  // useEffect:  Get socket my socket id
  //             Trigger: []
  //
  //************************************************************
  useEffect(() => {
    console.log("GamePage: useEffect [] setMySocketId");
    // Just read the global value (if you stored it like window.mySocketId)
    if (window.mySocketId) {
      setMySocketId(window.mySocketId);
    } else {
      // OR, fallback: check directly from socket.id
      setMySocketId(socket.id);
    }
  }, []);
  
  //************************************************************
  // useEffect:  Turn listeners on 
  //             Trigger: []
  //************************************************************
  useEffect(() => {
    console.log("GamePage: useEffect [lobbyId] socket.on");

    socket.on('gameStarted', handleGameStarted);
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('gameOver', handleGameOver);

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('gameOver', handleGameOver);
    };
  }, []); 

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

  socket.emit('getLobbyData', lobbyId, (lobby) => {
    console.log ("GamePage.js: useEffect callback from getLobbyData");
    setGameState(lobby.game);
    setLobbyPlayers(lobby.players);

    ggc.AssignGameState(lobby.game);

    // is it my turn to bid?
    const whosTurnSocketId = ggc.allConnectionID[ggc.whosTurn];
    const stringSocketId = String(window.mySocketId);
    if (whosTurnSocketId.toString() === stringSocketId) {
      setIsMyTurn (true);
    } else {
      setIsMyTurn (false);
    }

    setWhosTurnName(ggc.allParticipantNames[ggc.whosTurn]);
    const index = ggc.allConnectionID.indexOf(stringSocketId);
    setMyIndex(index);
    setMyName (ggc.allParticipantNames[index]);
  });
}, [lobbyId]);
  
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
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ggc.AssignGameState(gameState);

    //-------------------------------------------
    // draw some text
    //-------------------------------------------
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText('Game Lobby: ' + lobbyId, 20, 40);

    if (!gameState?.bRoundInProgress) {
        ctx.fillText('Game not active or just ended.', 20, 80);
      return;
    }

    // Display your name
    ctx.fillText(`Your name: ${myName} (id = ${mySocketId})`, 20, 80);

    // Display current turn
    ctx.fillText(`Current turn: ${whosTurnName}`, 20, 120);
    ctx.fillText(isMyTurn ? "It's YOUR turn to bid!" : `Waiting for ${whosTurnName}...`, 20, 160);

    // Display number of sticks
    const sticks = ggc.allSticks[myIndex];
    ctx.fillText(`Number of sticks: ${sticks}`, 20, 200);

    //-------------------------------------------
    // Display cup and dice images
    //-------------------------------------------

    const offset = 110;

    for (let p=0; p<ggc.numPlayers; p++) {
      // draw and fill rectangles for player
      ctx.fillStyle = 'white'
      ctx.fillRect(20, 240 + p*offset, 170, 66);
      ctx.fillStyle = 'blue'
      ctx.fillRect(20, 306 + p*offset, 170, 28);
      ctx.strokeStyle = 'black'
      ctx.strokeRect(20, 306 + p*offset, 170, 28);

      if (p == ggc.whosTurn) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'red'
      } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black'
      }
      ctx.strokeRect(20, 240 + p*offset, 170, 66 + 28);
      ctx.strokeStyle = 'black'
      ctx.lineWidth = 2;

      // draw cup
      if (cupDownImageRef.current) {
        ctx.drawImage(cupDownImageRef.current, 25, 245 + p*offset, 40, 56);
      }

      // draw dice
      const diceImages = diceImagesRef.current;

      for (let i = 0; i < 5; i++) {
        const value = ggc.dice[p][i];
        if (ggc.bDiceHidden[p][i]) {
          // hidden dice in upper box
          if (p == myIndex) {
            // if me, show the die
            ctx.drawImage(diceImages[value], 70 + i*23, 278 + p*offset, 18, 18);
          } else {
            // if not me, show the empty box
            ctx.drawImage(diceHiddenImageRef.current, 70 + i*23, 278 + p*offset, 18, 18);
          }
        } else {
          // shown dice in bottom box
          ctx.drawImage(diceImages[value], 70 + i*23, 278 + p*offset + 33, 18, 18);
        }
      }

      // draw name
      ctx.fillStyle = 'black'
      ctx.font = '24px Arial';
      ctx.fillText(`${ggc.allParticipantNames[p]}`, 70, 268 + p*offset);
    }

    /*
    ctx.fillStyle = 'white'
    ctx.fillRect(10, 240, 120, 173);
    ctx.lineWidth = 2;
    ctx.fillStyle = 'black'
    ctx.strokeRect(8, 238, 124, 177);

    if (cupDownImageRef.current) {
      ctx.drawImage(cupDownImageRef.current, 20, 240, 100, 140);
    }

    const diceImages = diceImagesRef.current;

    for (let i = 0; i < 5; i++) {
      const value = ggc.dice[myIndex][i];
      ctx.drawImage(diceImages[value], 15 + i*23, 390, 18, 18);
    }
*/

    //-------------------------------------------
    // Display bid history
    //-------------------------------------------
    ctx.fillText("Bidding History", 210, 500);
    if (ggc.numBids === 0) {
      ctx.fillText("(no bids yet)", 210, 520);
    }
    if (ggc.numBids > 0) {
      for (let i=0; i<ggc.numBids; i++) {
        const name = ggc.allBids[i].playerName;
        const bid = ggc.allBids[i].text;
        ctx.fillText(`${name}:  ${bid}`, 210, 520 + i*20);
      }
    }

    //-------------------------------------------
    // my turn?
    //-------------------------------------------
    if (isMyTurn) {
      if (ggc.bPaloFijoRound) {
        ggc.PopulateBidListPaloFijo();
      } else {
        ggc.PopulateBidListRegular();
      }
      ggc.PopulateBidListPasoDudo();
      setPossibleBids(ggc.possibleBids || []);
    }

    //-------------------------------------------
    // palofijo?
    //-------------------------------------------
    if (ggc.bPaloFijoRound) {
      ctx.fillText('PALO FIJO', 20, 460);
    }
  
    //-------------------------------------------
    // did somebody win the round?
    //-------------------------------------------
    if (ggc.bWinnerRound) {

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
      setPopupMessage(msg);
      setShowPopup(true);
    }
    
    //-------------------------------------------
    // Display (or not) bid UI
    //-------------------------------------------
    if (isMyTurn) {
      setBidDlg(true);
    } else {
      setBidDlg(false); // optional: auto-close when it's no longer their turn
    }
  }, [gameState, lobbyPlayers, isMyTurn, screenSize, imagesReady]);


  //************************************************************
  //  Render
  //************************************************************
  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: '0', margin: '0' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      {isMyTurn && (
        <>
          <BidDlg
            open={bidDlg}
            onClose={() => setBidDlg(false)}
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
            style={{ left: 210, top: 240, position: 'absolute', zIndex: 1000 }}
          />
        </>
      )}

      <PopupDialog
        open={showPopup}
        message={popupMessage}
        onClose={() => {
          setShowPopup(false);
          socket.emit('nextRound', { lobbyId, index: myIndex })
        }}
      />

      <ShowShakeDlg
            open={showShakeDlg}
            message="Do you want to show and shake?"
            onYes={handleShowShakeYes}
            onNo={handleShowShakeNo}
          />

      <ConfirmBidDlg
            open={confirmBidDlg}
            message={confirmMessage}
            onYes={handleConfirmBidYes}
            onNo={handleConfirmBidNo}
      />
    </div>
  );
}

export default GamePage;
