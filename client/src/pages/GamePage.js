import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import socket from '../socket';
import { DudoGame } from '../DudoGameC.js'
import BidDialog from '../BidDialog';

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
    
    // Refs
    const canvasRef = useRef(null);

    
    // derived values
//    const currentTurnIndex = gameState?.currentTurnIndex || 0;
//    const currentPlayer = lobbyPlayers[currentTurnIndex] || {};
//    const isMyTurn = currentPlayer.id === mySocketId;

//      const currentTurnIndex = gameState.whosTurn;
//      const currentPlayer = gameState.alllobbyPlayers[currentTurnIndex];
//    const isMyTurn = currentPlayer.id === mySocketId;

    /*
    // turn queue calc
    let turnQueue = [];
    if (lobbyPlayers.length > 0) {
      for (let i = 1; i < lobbyPlayers.length; i++) {
        const nextPlayerIndex = (currentTurnIndex + i) % lobbyPlayers.length;
        turnQueue.push(lobbyPlayers[nextPlayerIndex]);
      }
    }
  */

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
      ggc.PopulateBidListRegular();
      ggc.PpulateBidListPasoDudo();
      setPossibleBids(ggc.possibleBids || []);
    }
    setWhosTurnName(ggc.allParticipantNames[ggc.whosTurn]);
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
    if (isMyTurn) {
      ggc.PopulateBidListRegular();
      ggc.PpulateBidListPasoDudo();
      setPossibleBids(ggc.possibleBids || []);
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
    console.log("GamePage: useEffect [gameState, lobbyPlayers, isMyTurn, screenSize] Draw on canvas");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match screen
    canvas.width = screenSize.width;
    canvas.height = screenSize.height;

    // Clear canvas
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText('Game Lobby: ' + lobbyId, 20, 40);

    if (!gameState?.bRoundInProgress) {
        //if (!gameState?.isStarted) {
        ctx.fillText('Game not active or just ended.', 20, 80);
      return;
    }

    ggc.AssignGameState(gameState);

    ggc.PopulateBidListRegular();
    ggc.PopulateBidListPasoDudo();
    setPossibleBids(ggc.possibleBids || []);

    // did somebody win the game?
    if (ggc.bWinnerGame) {
      const winnerName = ggc.allParticipantNames[ggc.whoWonGame];
      ctx.fillText(winnerName + " won the game !!", 20, 800);
    }
    
    // did somebody win the round?
    if (ggc.bWinnerRound) {
      const s1 = ggc.allParticipantNames[ggc.result.whoDoubted];
      const s2 = ggc.allParticipantNames[ggc.result.whoGotDoubted];
      const s3 = s2 + "'s bid was " + ggc.result.doubtedText;
      const s4 = "There were " + ggc.result.doubtCount;
      const s5 = ggc.allParticipantNames[ggc.result.doubtLoser] + " got the stick";
      ctx.fillText(s1 + " doubted " + s2, 20, 800);
      ctx.fillText(s3, 20, 820);
      ctx.fillText(s4, 20, 840);
      ctx.fillText(s5, 20, 860);
    }
    
    // Display cup up image
    const cupDown = new Image(); 
    cupDown.src = "/images/CupDown.jpg"
    cupDown.onload = () => {
      ctx.drawImage(cupDown, 20, 200, 100, 140);
    };

    // Display your name
    ctx.fillText(`Your name: ${myName} (id = ${mySocketId})`, 20, 80);

    // Display current turn
    ctx.fillText(`Current turn: ${whosTurnName}`, 20, 120);
    ctx.fillText(isMyTurn ? "It's YOUR turn to bid!" : `Waiting for ${whosTurnName}...`, 20, 160);

    // Display dice  400 120
    ctx.fillText('Your dice:', 400, 120);
    const die1 = ggc.dice[myIndex][0].toString();
    const die2 = ggc.dice[myIndex][1].toString();
    const die3 = ggc.dice[myIndex][2].toString();
    const die4 = ggc.dice[myIndex][3].toString();
    const die5 = ggc.dice[myIndex][4].toString();
    ctx.fillText(die1 + die2 + die3 + die4 + die4, 520, 120);

    /*
    // Display turn queue
    ctx.fillText('Next players:', 20, 200);
    turnQueue.forEach((p, index) => {
      ctx.fillText(`${index + 1}. ${p.id === mySocketId ? 'You' : p.name}`, 40, 230 + index * 30);
    });
*/

    // Display (or not) bid UI
    if (isMyTurn) {
      setShowDialog(true);
    } else {
      setShowDialog(false); // optional: auto-close when it's no longer their turn
    }

    // Display bid history
    ctx.fillText("Bidding History", 300, 460);
    if (ggc.numBids === 0) {
      ctx.fillText("(no bids yet)", 300, 480);
    }
    if (ggc.numBids > 0) {
      for (let i=0; i<ggc.numBids; i++) {
        const name = ggc.allBids[i].playerName;
        const bid = ggc.allBids[i].text;
        ctx.fillText(`${name}:  ${bid}`, 300, 480 + i*20);
      }
    }
  }, [gameState, lobbyPlayers, isMyTurn, screenSize]);


//************************************************************
//  Handlers
//************************************************************
/*
  const handleBid = () => {
    console.log("GamePage: entering function: handleBid()");

    // Instead of directly socket.emit, show the dialog
    setShowDialog(true);
  };
*/
  const handleDoubt = () => socket.emit('doubt', { lobbyId });

  const handleBidSubmit = (bid) => {
    console.log("GamePage: entering function: handleBidSubmit()");
    console.log("GamePage; selected bid:", bid);
    // Close the dialog
    setShowDialog(false);

    // Now send the chosen bid to the server if needed
    socket.emit('bid', { lobbyId, bidText: bid, index: myIndex, name: myName });
};


//************************************************************
//  Render
//************************************************************
return (
  <div style={{ textAlign: 'center', padding: '0', margin: '0' }}>
    <canvas ref={canvasRef} style={{ display: 'block' }} />
    
    {isMyTurn && (
      <>
        {/*
        <div style={{ position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center' }}>
          <button onClick={handleBid} style={{ marginRight: '10px', padding: '15px', fontSize: '18px' }}>Bid</button>
          <button onClick={handleDoubt} style={{ padding: '15px', fontSize: '18px' }}>Doubt</button>
        </div>
        */}
        <BidDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onSubmit={handleBidSubmit}
          bids={possibleBids}
          defaultBid="hamm"
          makeBidString="Please select your bid:"
          yourTurnString="It's your turn!"
          style={{ left: 400, top: 160, position: 'absolute', zIndex: 1000 }}
        />
      </>
    )}
  </div>
);

}

export default GamePage;
