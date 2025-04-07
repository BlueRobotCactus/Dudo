import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import socket from '../socket';
import { DudoGame } from '../DudoGameC.js'
import BidDialog from '../BidDialog';
import PopupDialog from '../PopupDialog';

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
    const [showDialog, setShowDialog] = useState(false);
    const [ggc] = useState(() => new DudoGame());
    const [possibleBids, setPossibleBids] = useState([]);

    const [myIndex, setMyIndex] = useState(0);
    const [mySocketId, setMySocketId] = useState();
    const [myName, setMyName] = useState('');
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [whosTurnName, setWhosTurnName] = useState('');
    
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');

    const [imagesReady, setImagesReady] = useState(false);

    // Refs
    const canvasRef = useRef(null);
    const cupImageRef = useRef(null);
    const diceImagesRef = useRef({});
    
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

    console.log ("bPaloFijoRound is ${ggc.bPaloFijoRound}");

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
  //             Trigger: [lobbyId]
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
  }, [lobbyId]); 

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

  let loaded = 0;
  const totalToLoad = 7;

  const imgCupDown = new Image();
  imgCupDown.src = '/images/CupDown.jpg';
  imgCupDown.onload = () => {
    cupImageRef.current = imgCupDown;
    loaded++;
  };

  const diceImgs = {};
  for (let i = 1; i <= 6; i++) {
    const imgDice = new Image();
    imgDice.src = `/images/Dice${i}.jpg`;
    imgDice.onload = () => {
      loaded++;
      if (loaded === totalToLoad) {
        diceImagesRef.current = diceImgs;
        setImagesReady(true);  // ✅ signal everything's loaded
      }
    };
    diceImgs[i] = imgDice;
  }
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
/*
    if (isMyTurn) {
      if (ggc.bPaloFijoRound) {
        ggc.PopulateBidListPaloFijo();
      } else {
        ggc.PopulateBidListRegular();
      }
      ggc.PpulateBidListPasoDudo();
      setPossibleBids(ggc.possibleBids || []);
    }
*/
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

    ggc.AssignGameState(gameState);

    //-------------------------------------------
    // Display cup and dice images
    //-------------------------------------------
    if (cupImageRef.current) {
      ctx.drawImage(cupImageRef.current, 20, 240, 100, 140);
    }

    const diceImages = diceImagesRef.current;

    for (let i = 0; i < 5; i++) {
      const value = ggc.dice[myIndex][i];
      ctx.drawImage(diceImages[value], 21 + i*20, 390, 18, 18);
    }

    //-------------------------------------------
    // Display bid history
    //-------------------------------------------
    ctx.fillText("Bidding History", 20, 500);
    if (ggc.numBids === 0) {
      ctx.fillText("(no bids yet)", 20, 520);
    }
    if (ggc.numBids > 0) {
      for (let i=0; i<ggc.numBids; i++) {
        const name = ggc.allBids[i].playerName;
        const bid = ggc.allBids[i].text;
        ctx.fillText(`${name}:  ${bid}`, 20, 520 + i*20);
      }
    }

    //-------------------------------------------
    // my turn?
    //-------------------------------------------

    console.log ("bPaloFijoRound is ${ggc.bPaloFijoRound}");

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
      ctx.fillText('PALO FIJO', 20, 800);
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
      setShowDialog(true);
    } else {
      setShowDialog(false); // optional: auto-close when it's no longer their turn
    }
  }, [gameState, lobbyPlayers, isMyTurn, screenSize, imagesReady]);


//************************************************************
//  Handlers
//************************************************************
  const handleBidSubmit = (bid) => {
    console.log("GamePage: entering function: handleBidSubmit()");
    console.log("GamePage; selected bid:", bid);

    if (bid === "theDefaultBid") {
      console.log("GamePage: bid was default 'myDefaultBid', not submitting");
      return; // Do nothing — BidDialog stays open
    }

    // Close the dialog
    setShowDialog(false);

    // Now send the chosen bid to the server if needed
    socket.emit('bid', { lobbyId, bidText: bid, index: myIndex, name: myName });
};


//************************************************************
//  Render
//************************************************************
return (
  <div style={{ position: 'relative', textAlign: 'center', padding: '0', margin: '0' }}>
    <canvas ref={canvasRef} style={{ display: 'block' }} />
    
    {isMyTurn && (
      <>
        <BidDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onSubmit={handleBidSubmit}
          bids={possibleBids}
          defaultBid="theDefaultBid"
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
          style={{ left: 140, top: 240, position: 'absolute', zIndex: 1000 }}
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

  </div>
);

}

export default GamePage;
