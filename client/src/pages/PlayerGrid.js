import React, { useState, useEffect, useRef, } from 'react';
import { useContext } from 'react';

import './PlayerGrid.css';
import './GamePage.js'
import { ImageRefsContext } from '../ImageRefsContext.js';

//************************************************************
// PlayerGrid (placed inside TableGrid)
// ggc = DudoGame object
// cc = connection number of this player
//************************************************************
export function PlayerGrid({ggc, cc}) {
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

alert(", cc: " + cc);

console.log("cupDownImageRef.current:", cupDownImageRef.current);

  return (
    <div className="aspect-ratio-box">
      <div className="aspect-ratio-content">
        {/* Top two rows: cup and name/dice */}
        <div className="playergrid-top">
          <div className="cup-container">
            {cupDownImageRef.current ? (
              <img src={cupDownImageRef.current.src} alt="Cup" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            ) : 'Loading...'}
          </div>
          <div className="name-and-dice">
            <div className="name-row fw-bold">{ggc.allParticipantNames[cc]}</div>
            <div className="dice-row">
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="dice-cell" key={`r2c${i}`}>
                  {diceImagesRef.current[1] && (
                    <img
                      src={diceImagesRef.current[1].src}
                      alt={`Dice ${i}`}
                      style={{ maxHeight: '90%', maxWidth: '90%' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: 2 stick images + 5 dice */}
        <div className="playergrid-bottom">
          {[1, 2].map((i) => (
            <div className="stick-cell" key={`stick-${i}`}>
              {stickImageRef.current ? (
                <img
                  src={stickImageRef.current.src}
                  alt="Stick"
                  style={{ maxHeight: '90%', maxWidth: '90%' }}
                />
              ) : 'Loading...'}
            </div>
          ))}
          {[1, 2, 3, 4, 5].map((i) => (
            <div className="dice-cell" key={`r3c${i}`}>
              {diceImagesRef.current[1] && (
                <img
                  src={diceImagesRef.current[1].src}
                  alt={`Dice ${i}`}
                  style={{ maxHeight: '90%', maxWidth: '90%' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>

  );
}

export default PlayerGrid;
