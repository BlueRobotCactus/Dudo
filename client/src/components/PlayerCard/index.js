'use strict';

import React, { useContext } from 'react';
import { ImageRefsContext } from '../../ImageRefsContext.js';
import { CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../../DudoGameC.js';

/**
 * PlayerCard – Bootstrap‑based replacement for PlayerGrid.
 * Uses a responsive flex‑wrap layout so dice/sticks never spill outside
 * the card, even on narrow screens.
 */
function PlayerCard({ ggc, myIndex, cc }) {
  /* ───────────────────────── Context */
  const {
    cupDownImageRef,
    cupUpImageRef,
    diceImagesRef,
    diceHiddenImageRef,
    stickImageRef,
    imagesReady,
  } = useContext(ImageRefsContext);
  if (!imagesReady) return null;

  /* ───────────────────────── Cup image */
  let cupImage;
  if (ggc.allConnectionStatus[cc] === CONN_PLAYER_OUT || !ggc.bGameInProgress) {
    cupImage = cupUpImageRef.current;
  } else if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.result.doubtDidLiftCup[cc]) {
    cupImage = cupUpImageRef.current;
  } else {
    cupImage = cupDownImageRef.current;
  }

  /* ───────────────────────── Dice + hilites */
  const diceTop = Array(5).fill(null);
  const diceBottom = Array(5).fill(null);
  const hiliteTop = Array(5).fill(false);
  const hiliteBottom = Array(5).fill(false);

  if (ggc.bGameInProgress && ggc.allConnectionStatus[cc] === CONN_PLAYER_IN) {
    for (let i = 0; i < 5; i++) {
      const val = ggc.dice[cc][i];
      const isHidden = ggc.bDiceHidden[cc][i];
      const imgRef = diceImagesRef.current[val];
      if (isHidden) {
        if (
          cc === myIndex ||
          ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.result.doubtDidLiftCup[cc])
        ) {
          diceTop[i] = imgRef;
          hiliteTop[i] = !!ggc.bDiceHilite[cc][i];
        } else {
          diceTop[i] = diceHiddenImageRef.current;
        }
      } else {
        diceBottom[i] = imgRef;
        hiliteBottom[i] = !!ggc.bDiceHilite[cc][i];
      }
    }
  }

  /* ───────────────────────── Turn footer */
  const isTurn = ggc.bGameInProgress && cc === ggc.whosTurn;
  const footerLabel = isTurn
    ? cc === myIndex
      ? 'Your Turn'
      : `${ggc.allParticipantNames[cc] || '—'}'s Turn`
    : null;

  /* ───────────────────────── Shared item style */
  const smallImg = { width: 18, height: 18 };

  /* ───────────────────────── Render */
  return (
    <div
      className={`card d-flex flex-column ${isTurn ? 'border-danger' : ''}`}
      style={{ minWidth: 140 }}
    >
      {/* Header */}
      <div className="card-header text-center p-1 fw-bold">
        {ggc.allParticipantNames[cc] || '—'}
      </div>

      {/* Body */}
      <div className="card-body p-1 d-flex flex-column align-items-center flex-grow-0">
        {/* Cup */}
        <img src={cupImage?.src} alt="cup" style={{ width: 40, height: 56 }} />

        {/* Top (hidden) dice row */}
        <div
          className="d-flex flex-wrap justify-content-center mt-1"
          style={{ gap: 4 }}
        >
          {diceTop.map((img, i) =>
            img ? (
              <img
                key={`top-${i}`}
                src={img.src}
                alt="die"
                style={{ ...smallImg, borderRadius: 4, border: hiliteTop[i] ? '2px solid red' : 'none' }}
              />
            ) : (
              <span key={`top-empty-${i}`} style={{ ...smallImg }} />
            )
          )}
        </div>

        {/* Sticks + bottom dice row */}
        <div
          className="d-flex flex-wrap justify-content-center align-items-center mt-1"
          style={{ gap: 4 }}
        >
          {[1, 2].map((n) =>
            ggc.allSticks[cc] >= n && stickImageRef.current ? (
              <img key={`stick-${n}`} src={stickImageRef.current.src} alt="stick" style={smallImg} />
            ) : (
              <span key={`nostick-${n}`} style={{ ...smallImg }} />
            )
          )}

          {diceBottom.map((img, i) =>
            img ? (
              <img
                key={`bot-${i}`}
                src={img.src}
                alt="die"
                style={{ ...smallImg, borderRadius: 4, border: hiliteBottom[i] ? '2px solid red' : 'none' }}
              />
            ) : (
              <span key={`bot-empty-${i}`} style={{ ...smallImg }} />
            )
          )}
        </div>
      </div>

      {/* Footer */}
      {isTurn && (
        <div className="card-footer text-center p-1 bg-danger text-white">{footerLabel}</div>
      )}
    </div>
  );
}

export default PlayerCard;
