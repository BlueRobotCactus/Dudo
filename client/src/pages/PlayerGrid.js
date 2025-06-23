import React, { useState, useEffect, useRef, } from 'react';
import { useContext } from 'react';

import './PlayerGrid.css';
//import './GamePage.js'
import { ImageRefsContext } from '../ImageRefsContext.js';
import { CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';

//************************************************************
// PlayerGrid (placed inside TableGrid)
// ggc = DudoGame object
// cc = connection number of this player
//************************************************************
export function PlayerGrid({ggc, myIndex, cc }) {

  const gridRef = useRef();
  const [colSize, setColSize] = useState('1fr');

  const {
    cupDownImageRef,
    cupUpImageRef,
    diceImagesRef,
    diceHiddenImageRef,
    stickImageRef,
    imagesReady
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
  } else if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.result.doubtDidLiftCup[cc]) {
      cupImageToShow = cupUpImageRef.current;
  } else {
      cupImageToShow = cupDownImageRef.current;
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
            if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.result.doubtDidLiftCup[cc]) {
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
  // default color
  let bgColor = (ggc.allConnectionStatus[cc] === CONN_PLAYER_OUT ? 'gray' : 'white');
  let lineColor = 'lightgray';

  // ask in or out dlg
  if (ggc.bAskInOut) {
    if (ggc.inOutMustSay[cc] && !ggc.inOutDidSay[cc]) {
      bgColor = 'lightblue';
    }
    if (ggc.inOutMustSay[cc] && ggc.inOutDidSay[cc])  {
      bgColor = 'white';
    }
  }

  // lift cup dlg
  if (ggc.bDoubtInProgress && !ggc.bShowDoubtResult) {
    if (ggc.result.doubtMustLiftCup[cc] && !ggc.result.doubtDidLiftCup[cc]) {
      bgColor = 'lightblue';
    }
    if (ggc.result.doubtMustLiftCup[cc] && ggc.result.doubtDidLiftCup[cc])  {
      bgColor = 'white';
    }
  }

  // show doubt dlg
  if (ggc.bShowDoubtResult) {
    if (ggc.nextRoundMustSay[cc] && !ggc.nextRoundDidSay[cc]) {
      bgColor = 'lightblue';
    }
    if (ggc.nextRoundMustSay[cc] && ggc.nextRoundDidSay[cc])  {
      bgColor = 'white';
    }
  }
  // line color in background color
  if (bgColor === 'white') {
    lineColor = 'lightgray';
  }
  if (bgColor === 'lightblue') {
    lineColor = 'gray';
  }
  if (bgColor === 'gray') {
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
      <div style={{ gridRow: '1 / span 2', gridColumn: '1 / span 2', backgroundColor: bgColor, }}>
        <img
          src={cupImageToShow.src}
          alt="Cup"
          style={{
            width: '100%', 
            height: '100%', 
            objectFit: 'contain', 
            border: `1px solid ${lineColor}`,
            padding: '4px',
            boxSizing: 'border-box',
            zIndex: 1,
           }}
        />
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
        if (!imgRef) return null; // skip nulls

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
