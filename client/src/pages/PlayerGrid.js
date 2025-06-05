import React, { useState, useEffect, useRef, } from 'react';
import { useContext } from 'react';

import './PlayerGrid.css';
import './GamePage.js'
import { ImageRefsContext } from '../ImageRefsContext.js';
import { CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';

//************************************************************
// PlayerGrid (placed inside TableGrid)
// ggc = DudoGame object
// cc = connection number of this player
//************************************************************
export function PlayerGrid({ggc, myIndex, cc}) {
  const {
    cupDownImageRef,
    cupUpImageRef,
    diceImagesRef,
    diceHiddenImageRef,
    stickImageRef,
    imagesReady
  } = useContext(ImageRefsContext);

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
  //  render
  //--------------------------------------------------------
  return (
    <div className="aspect-ratio-box">
      <div
        className="aspect-ratio-content"
        style={{
          border: ggc.bGameInProgress && cc === ggc.whosTurn ? '3px solid red' : '1px solid black',
        }}
      >
        {/* Top two rows: cup and name/dice */}
        <div className="playergrid-top" style={{ backgroundColor: 'white' }}>        
          <div className="cup-container">
            <img
              src={cupImageToShow.src}
              alt="Cup"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
          <div className="name-and-dice">
            <div className="name-row fw-bold">{ggc.allParticipantNames[cc]}</div>
            <div className="dice-row">
              {[0, 1, 2, 3, 4].map((i) => (
                <div className="dice-cell" key={`r2c${i}`}>
                  {diceImageTopList[cc]?.[i] ? (
                    <img
                      src={diceImageTopList[cc][i].src}
                      alt={`Dice ${i}`}
                      style={{
                        border: diceShowTopHilite[cc][i] ? '2px solid red' : 'none',
                        borderRadius: '4px',
                        maxHeight: '90%',
                        maxWidth: '90%',
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: 2 stick images + 5 dice */}
        <div className="playergrid-bottom">
          {[1, 2].map((i) => (
            <div className="stick-cell" key={`stick-${i}`}>
              {ggc.allSticks[cc] >= i && stickImageRef.current ? (
                <img
                  src={stickImageRef.current.src}
                  alt="Stick"
                  style={{ maxHeight: '90%', maxWidth: '90%' }}
                />
              ) : null}
            </div>
          ))}

          {[0, 1, 2, 3, 4].map((i) => (
            <div className="dice-cell" key={`r3c${i}`}>
              {diceImageBottomList[cc]?.[i] ? (
                <img
                  src={diceImageBottomList[cc][i].src}
                  alt={`Dice ${i}`}
                  style={{
                    border: diceShowBottomHilite[cc]?.[i] ? '2px solid red' : 'none',
                    borderRadius: '4px',
                    maxHeight: '90%',
                    maxWidth: '90%',
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PlayerGrid;
