import React, { useState, useEffect, useRef, useContext} from 'react';

import './PlayerGrid.css';
//import './GamePage.js'
import { ImageRefsContext } from '../ImageRefsContext.js';
import { CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';
import { STICKS_BLINK_TIME, SHOWN_DICE_BLINK_TIME, SHAKE_CUPS_TIME } from '../DudoGameC.js';

//************************************************************
// PlayerGrid (placed inside TableGrid)
// ggc = DudoGame object
// cc = connection number of this player
//************************************************************
export function PlayerGrid({ggc, myIndex, cc }) {

  const gridRef = useRef();
  const [colSize, setColSize] = useState('1fr');
  const [cupShaking, setCupShaking] = useState(false);
  const [sticksBlinking, setSticksBlinking] = useState(false);
  const [diceBlinking, setDiceBlinking] = useState(false);

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

  //*****************************************************************
  // useEffect:  SET COLSIZE []
  //             Make cols same width as row heights (square cells)
  //*****************************************************************
  useEffect(() => {
    console.log("PlayerGrid: useEffect: SET COLSIZE: entering");
    const updateGrid = () => {
      if (gridRef.current) {
        const gridHeight = gridRef.current.clientHeight;
        const rowHeights = [3, 2, 2];
        const total = rowHeights.reduce((a, b) => a + b, 0);
        const row2Height = (2 / total) * gridHeight;
        const cellSize = `${row2Height / 7}px`;

        setColSize(cellSize);
        console.log('Measured gridHeight:', gridHeight);
        console.log('Calculated colSize:', cellSize);
      }
    };

    updateGrid();
    window.addEventListener('resize', updateGrid);
    return () => window.removeEventListener('resize', updateGrid);
  }, []);

  
  //*****************************************************************
  // useEffect:  END OF ROUND
  //             [ggc.bGameInProgress, ggc.numBids, ggc.firstRound]
  //*****************************************************************
  useEffect(() => {
		if (ggc.SomebodyGotStick()) {
      //-------------------------------------------------
      // somebody got a stick
      //-------------------------------------------------
      if (ggc.result.doubtLoser === cc) {
        // it was this player
        triggerSticksBlinking();
      }
      // wait for sticks, then shake cup
      setTimeout(() => {
				if (ggc.ShouldAllRollDice()) {
          if (ggc.allConnectionStatus[cc] === CONN_PLAYER_IN) {
            triggerCupShaking();
          }
        }
      }, STICKS_BLINK_TIME);
    } else {
      //-------------------------------------------------
      // all shake to start round
      //-------------------------------------------------
			if (ggc.ShouldAllRollDice()) {
        if (ggc.allConnectionStatus[cc] === CONN_PLAYER_IN) {
          triggerCupShaking();
        }
      }
    }
  }, [ggc.bGameInProgress, ggc.numBids, ggc.firstRound]);
  
/*
  //*****************************************************************
  // useEffect:  THIS PLAYER GOT STICK: blink stick 
  //             [ggc.bGameInProgress, ggc.numBids, ggc.firstRound]
  //*****************************************************************
  useEffect(() => {
    if (ggc.bGameInProgress && 
        ggc.numBids === 0 &&
        !ggc.firstRound) {
      if (ggc.result.doubtLoser === cc) {
         triggerSticksBlinking();
      }
    }
  }, [ggc.bGameInProgress, ggc.numBids, ggc.firstRound]);

  //*****************************************************************
  // useEffect:  ALL SHAKE TO START ROUND 
  //             [ggc.bGameInProgress, ggc.numBids]
  //*****************************************************************
  useEffect(() => {
    if (sticksBlinking) {
      return;
    }
    if (ggc.bRoundInProgress && ggc.numBids === 0) {
      if (ggc.allConnectionStatus[cc] === CONN_PLAYER_IN) {
         triggerCupShaking();
      }
    }
  }, [ggc.bGameInProgress, ggc.numBids, sticksBlinking]);
*/

  //*****************************************************************
  // useEffect:  THIS PLAYER SHOW/SHAKE:  blink shown dice, shake cup 
  //             [ggc.numBids, ggc.bGameInProgress, ggc.allBids, cc]
  //*****************************************************************
  useEffect(() => {
    if (ggc.bGameInProgress && ggc.numBids > 0) {
      const lastBid = ggc.allBids[ggc.numBids - 1];
      if (lastBid.playerIndex === cc && lastBid.bShowShake) {
        // Enable blinking
        setDiceBlinking(true);
        setTimeout(() => {
          setDiceBlinking(false); // Stop blinking after 4s
          if (!ggc.GetPlayerShowingAllDice(cc)) {
            triggerCupShaking();      // Start cup shake after that
          }
        }, SHOWN_DICE_BLINK_TIME);
      }
    }
  }, [ggc.numBids, ggc.bGameInProgress, ggc.allBids, cc]);

  //--------------------------------------------------------
  // bail out if images are not ready
  //--------------------------------------------------------
  if (!imagesReady) {
    return <div>Loading images...</div>;
  }

  //--------------------------------------------------------
  // which cup image to show
  //--------------------------------------------------------
  let cupImageToShow;

  if (ggc.allConnectionStatus[cc] == CONN_PLAYER_OUT || !ggc.bGameInProgress) {
      cupImageToShow = cupUpImageRef.current;
  } else if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.doubtDidLiftCup[cc]) {
      cupImageToShow = cupUpImageRef.current;
  } else {
      cupImageToShow = cupDownImageRef.current;
  }
  // special case of pulsating the shown dice
  if (diceBlinking) {
      cupImageToShow = cupUpImageRef.current;
  }
  // special case of all 5 dice shown
  if (ggc.GetPlayerShowingAllDice(cc)) {
      cupImageToShow = cupUpImageRef.current;
  }

  //--------------------------------------------------------
  // which dice to show in each place, either:
  // - a dice image (1-6)
  // - the dice hidden image
  // - nothing at all (null)
  //--------------------------------------------------------

  // list of which dice images to use 
  let diceImageTopList = [];
  let diceImageBottomList = [];
  let diceShowTopHilite = [];
  let diceShowBottomHilite = [];

  // initialize 
  for (let cc = 0; cc < ggc.maxConnections; cc++) {
    diceImageTopList[cc] = [];
    diceImageBottomList[cc] = [];
    diceShowTopHilite[cc] = [];
    diceShowBottomHilite[cc] = [];
    for (let i = 0; i < 5; i++) {
      diceImageTopList[cc][i] = null;
      diceImageBottomList[cc][i] = null;
      diceShowTopHilite[cc][i] = false;
      diceShowBottomHilite[cc][i] = false;
    }
  }
  
  // fill in the values
  if (ggc.bGameInProgress) {
    if (ggc.allConnectionStatus[cc] == CONN_PLAYER_IN) {
      let x, y, w, h;
      for (let i = 0; i < 5; i++) {
        const value = ggc.dice[cc][i];
        if (ggc.bDiceHidden[cc][i]) {
          // hidden dice in upper box
          if (cc == myIndex) {
            // if me, show the die
              diceImageTopList[cc][i] = diceImagesRef.current[value];
            if (ggc.bDiceHilite[cc][i]) {
              diceShowTopHilite[cc][i] = true;
            }
          } else {
            // other player
            if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.doubtDidLiftCup[cc]) {
              // cup lifted, show dice
              diceImageTopList[cc][i] = diceImagesRef.current[value];
              if (ggc.bDiceHilite[cc][i]) {
                diceShowTopHilite[cc][i] = true;
              }
            } else {
              // cup not lifted, show the empty box
              diceImageTopList[cc][i] = diceHiddenImageRef.current;
            }
          }
        } else {
          // shown dice in bottom box
          diceImageBottomList[cc][i] = diceImagesRef.current[value];
          if (ggc.bDiceHilite[cc][i]) {
              diceShowBottomHilite[cc][i] = true;
          }
        }
      }
    }
  }

  //--------------------------------------------------------
  // which background colors to use
  //--------------------------------------------------------
	const softGreen = 'rgb(204,255,204)';

  // default color
  let bgColor = (ggc.allConnectionStatus[cc] === CONN_PLAYER_OUT ? 'gray' : 'white');
  let lineColor = 'lightgray';

  // Palo fijo?
  if (ggc.IsPaloFijo(cc)) {
    bgColor = 'pink';
  }

  // ask in or out dlg
  if (ggc.bAskInOut) {
    if (ggc.inOutMustSay[cc] && !ggc.inOutDidSay[cc]) {
      bgColor = softGreen;
    }
    if (ggc.inOutMustSay[cc] && ggc.inOutDidSay[cc])  {
      bgColor = 'white';
    }
  }

  // lift cup dlg
  if (ggc.bDoubtInProgress && !ggc.bShowDoubtResult) {
    if (ggc.doubtMustLiftCup[cc] && !ggc.doubtDidLiftCup[cc]) {
      bgColor = softGreen;
    }
    if (ggc.doubtMustLiftCup[cc] && ggc.doubtDidLiftCup[cc])  {
      bgColor = 'white';
    }
  }

  // show doubt dlg
  if (ggc.bShowDoubtResult) {
    if (ggc.nextRoundMustSay[cc] && !ggc.nextRoundDidSay[cc]) {
      bgColor =softGreen;
    }
    if (ggc.nextRoundMustSay[cc] && ggc.nextRoundDidSay[cc])  {
      bgColor = 'white';
    }
  }
  // line color in background color
  switch (bgColor) {
    case 'white':
    case 'gray':
      lineColor = 'lightgray';
      break;
    case softGreen:
    case 'pink':
      lineColor = 'gray';
      break;
    default:
      lineColor = 'lightgray';
  }

  //--------------------------------------------------------
  // reactive font size based on length of name
  //--------------------------------------------------------
//  for debugging
//  const name = ggc.allParticipantNames[0];
//  if (name.length == 2) {
//    adjustedFontSize = Number(name) / 10;
//  }

  const nameLen = ggc.allParticipantNames[cc].length;
  let adjustedFontSize = 0.9;
  if (nameLen <= 18) {adjustedFontSize = 1.0}
  if (nameLen <= 5) {adjustedFontSize = 1.2}
    

  //--------------------------------------------------------
  //  set up dice that were just shown to blink
  //--------------------------------------------------------
  let diceBlinkList = Array(5).fill(false);
  if (ggc.bGameInProgress && ggc.numBids > 0) {
    const lastBid = ggc.allBids[ggc.numBids - 1];
    if (lastBid.playerIndex === cc && lastBid.bShowShake) {
      for (let i = 0; i < 5; i++) {
        diceBlinkList[i] = lastBid.bWhichShown[i];
      }
    }
  }
  
  //********************************************************
  //  function to shake cup
  //********************************************************
  function triggerCupShaking() {
    setCupShaking(true);
    setTimeout(() => setCupShaking(false), SHAKE_CUPS_TIME); // match animation duration
  }

  //********************************************************
  //  function to shake sticks
  //********************************************************
  function triggerSticksBlinking() {
    setSticksBlinking(true);
    setTimeout(() => setSticksBlinking(false), STICKS_BLINK_TIME); 
  }

  //*****************************************************************
  //  render
  //*****************************************************************
  return (
    <div className="player-grid"
      ref={gridRef}
    >
      {/*--------------------------------------------------------
        Border box around rows 1 and 2 (cols 1–7)
      --------------------------------------------------------*/}
      <div
        style={{
          gridRow: '1 / span 2',
          gridColumn: '1 / span 7',
          padding: '4px',
          boxSizing: 'border-box',          
          border: ggc.bGameInProgress && cc === ggc.whosTurn ? '3px solid red' : '1px solid black',
          zIndex: 3,
        }}
      />

      {/*--------------------------------------------------------
        Cup (2x2)
      --------------------------------------------------------*/}
      <div style={{ gridRow: '1 / span 2', gridColumn: '1 / span 2', backgroundColor: bgColor }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: `1px solid ${lineColor}`,
          }}
        >
          <img
            src={(cupShaking ? cupUpImageRef.current : cupImageToShow).src}
            alt="Cup"
            className={cupShaking ? 'cup-shake' : ''}
            style={{
              width: '100%',  // don't stretch to 100%
              height: 'auto',
              objectFit: 'contain',
              padding: '2px',
              boxSizing: 'border-box',
              zIndex: 1,
            }}
          />
        </div>
      </div>

      {/*--------------------------------------------------------
        Player name (row 1, cols 3-7)
      --------------------------------------------------------*/}
      <div
        style={{
          gridRow: '1 / span 1',
          gridColumn: '3 / span 5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          boxSizing: 'border-box',
          border: `1px solid ${lineColor}`,
          backgroundColor: bgColor,
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
            fontWeight: 'bold',
            fontSize: `${adjustedFontSize}em`,
            lineHeight: '1.1',
            width: '100%', // force wrapping within the parent box
          }}
        >
          {ggc.allParticipantNames[cc]}
        </div>
      </div>

      {/*--------------------------------------------------------
        Hidden dice in cells (2,3) to (2,7)
      --------------------------------------------------------*/}
      <div
        style={{
          gridRow: 2,
          gridColumn: '3 / span 5',
          backgroundColor: bgColor,
          padding: '4px',
          boxSizing: 'border-box',          
          zIndex: 1,
        }}
      />
      {/* Border-only overlay (higher z-index) */}
      <div
        style={{
          gridRow: 2,
          gridColumn: '3 / span 5',
          backgroundColor: 'transparent',
          border: `1px solid ${lineColor}`,
          padding: '4px',
          boxSizing: 'border-box',
          zIndex: 2,
          position: 'relative',
          pointerEvents: 'none', // ensures it doesn’t block clicks
        }}
      />
      {diceImageTopList[cc].map((imgRef, index) => {
        if (!imgRef || cupShaking) return null;

        return (
        <div
          key={`dice-top-${index}`}
          style={{
            gridRow: 2,
            gridColumn: index + 3,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: bgColor,
            zIndex: 1,
          }}
        >
          <img
            src={imgRef.src}
            alt={`Die ${index + 1}`}
            style={{
              width: '80%',
              height: 'auto', // <<< key fix: height is based on aspect ratio
              aspectRatio: '1 / 1',
              objectFit: 'contain',
              display: 'block',
              border: diceShowTopHilite[cc][index] ? '2px solid red' : 'none',
              borderRadius: '4px',
            }}
          />
        </div>
        );
      })}

      {/*--------------------------------------------------------
        Row 3, where shown dice go
      --------------------------------------------------------*/}
      <div
        style={{
          gridRow: 3,
          gridColumn: '1 / span 7',
          backgroundColor: 'transparent',
          zIndex: 0,
        }}
      />

      {/*--------------------------------------------------------
        Shown dice in cells (3,3) to (3,7)
      --------------------------------------------------------*/}
      {diceImageBottomList[cc].map((imgRef, index) => {
        if (!imgRef) return null; // skip nulls

        return (
        <div
          key={`dice-top-${index}`}
          style={{
            gridRow: 3,
            gridColumn: index + 3,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'transparent',
            zIndex: 0
          }}
        >
          <img
            src={imgRef.src}
            alt={`Die ${index + 1}`}
            className={`${diceBlinking && diceBlinkList[index] ? 'img-pulse slide-down' : ''}`}
            style={{
              width: '80%',
              height: 'auto', // <<< key fix: height is based on aspect ratio
              aspectRatio: '1 / 1',
              objectFit: 'contain',
              display: 'block',
              border: diceShowBottomHilite[cc][index] ? '2px solid red' : 'none',
              borderRadius: '4px',
            }}
          />
        </div>
        );
      })}

      {/*--------------------------------------------------------
        Stick image(s) in (3,1) and (3,2) if the player has them
      --------------------------------------------------------*/}
      {ggc.allSticks[cc] > 0 && (
        <div
          key="stick-1"
          style={{
            gridRow: 3,
            gridColumn: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'transparent',
            zIndex: 0,

          }}
        >
          <img
            src={stickImageRef.current.src}
            alt="Stick 1"
            className={sticksBlinking ? 'img-pulse' : ''}
            style={{
              width: '80%',
              height: 'auto',
              aspectRatio: '1 / 1',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      )}

      {ggc.allSticks[cc] > 1 && (
        <div
          key="stick-2"
          className={sticksBlinking ? 'img-pulse' : ''}
          style={{
            gridRow: 3,
            gridColumn: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'transparent',
            zIndex: 0,
          }}
        >
          <img
            src={stickImageRef.current.src}
            alt="Stick 2"
            style={{
              width: '80%',
              height: 'auto',
              aspectRatio: '1 / 1',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      )}
    </div>
  );  
}

export default PlayerGrid;
