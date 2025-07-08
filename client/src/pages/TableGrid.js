import React, { useContext } from 'react';

import './TableGrid.css';
import { ImageRefsContext } from '../ImageRefsContext.js';
import PlayerGrid from './PlayerGrid';
import PlayerCard from './PlayerCard.js';

import { MAX_CONNECTIONS, CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';

//************************************************************
// TableGrid (PlayerCards placed within it)
// ggc = DudoGame object
//************************************************************
export function TableGrid({ggc, myIndex, backgroundColor}) {
  console.log("TableGrid: entering TableGrid ()");

  // -----------------------------------------------
  // Images 
  // -----------------------------------------------
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
  
  // -----------------------------------------------
  // Get list of players (cc's) and how many
  // each one in the list will have its PlayerGrid
  // -----------------------------------------------
  const ccList = [];

  let debugging = 0;   // 0 means no debugging
  if (debugging) {
    const name = localStorage.getItem('playerName');
    let numPlayers = 1;
    if (name.length == 1) {
      numPlayers = Number(name);
    }
    for (let i=0; i<numPlayers; i++) {
      ccList.push(0);
    }
  } else {
    // the normal thing (not debugging)
    let cc = myIndex;
    for (let i = 0; i < MAX_CONNECTIONS; i++) {
      if (ggc.allConnectionStatus[cc] === CONN_PLAYER_IN ||
          ggc.allConnectionStatus[cc] === CONN_PLAYER_OUT) {
        ccList.push(cc);
      }
      cc++;
      if (cc == MAX_CONNECTIONS) {
        cc = 0;
      }
    }
  }

  // -----------------------------------------------
  //  Where to put PlayerGrids, depending on how many
  //  the list is one-based
  //  the coords in the list are zero-based
  //
  //  [
  //    [number of TableGrid cols, number of TableGrid rows],
  //    [span of PlayerGrid cols, span of PlayerGrid rows],
  //    [PlayerGrid topleft col coord, PlayerGrid topleft row coord],
  //      ...
  //    [PlayerGrid topleft col coord, PlayerGrid topleft row coord],
  //  ]
  // -----------------------------------------------

  const PlayerGridList = [
    [], // index 0 unused
  // cols,rows     span      coords
    [[12, 12],    [3, 4],   [3, 4]],   // 1
    [[12, 12],    [3, 4],   [6, 4], [1, 4]],   //2
    [[12, 12],    [3, 4],   [5, 4], [1, 1], [1, 7]],   //3
    [[13, 12],    [3, 4],   [9, 4], [5, 1], [1, 4], [5, 7]],   //4
    [[13, 14],    [3, 4],   [9, 5], [5, 1], [1, 2], [1, 8], [5, 9]],   //5
    [[13, 11],    [2, 3],   [10, 4], [7, 1], [4, 1], [1, 4], [4, 7], [7, 7]],  //6
    [[13, 11],    [2, 3],   [10, 4], [7, 1], [4, 1], [1, 2], [1, 6], [4, 7], [7, 7]],   //7
    [[13, 11],    [2, 3],   [10, 2], [7, 1], [4, 1], [1, 2], [1, 6], [4, 7], [7, 7], [10, 6]] //8
  ];

  const DirectionArrowList = [
    [], // index 0 unused
    [], // index 1 no arrow
    [], // index 2 no arrow
    [[3, 5],    [2, 2]], // 3
    [[5, 5],    [2, 2]], // 4
    [[5, 5],    [3, 4]], // 5
    [[5, 4],    [3, 3]], // 6
    [[5, 4],    [3, 3]], // 7
    [[5, 4],    [3, 3]], // 8
  ];

  const numPlayers = ccList.length;

  const layout = PlayerGridList[numPlayers];
  if (!layout || layout.length < 3) return null;

  const [gridSize, playerSize, ...positions] = layout;
  const [numRows, numCols] = gridSize;
  const [rowSpan, colSpan] = playerSize;

  // -----------------------------------------------
  // rendering
  // -----------------------------------------------
  return (
    <div
      className="table-grid"
      style={{
        display: 'grid',
        gridTemplateRows: `2fr ${'1fr '.repeat(numRows - 1).trim()}`,
        gridTemplateColumns: `repeat(${numCols}, 1fr)`,
        width: '100%',
        height: '100%',
        backgroundColor: backgroundColor || 'lightblue'
      }}
    >
      {positions.map(([row, col], index) => (
        <div
          key={`pg-${index}`}
          style={{
            gridRow: `${row + 1} / span ${rowSpan}`,
            gridColumn: `${col + 1} / span ${colSpan}`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            overflow: 'visible',            
          }}
        >
        <div style={{ maxWidth: '300px', width: '100%', height: '100%' }}>
          {/* <PlayerCard ggc={ggc} myIndex={myIndex} cc={ccList[index]} /> */}
          <PlayerGrid ggc={ggc} cc={ccList[index]} myIndex={myIndex} />
        </div>
        </div>
      ))}

      {DirectionArrowList[numPlayers] &&
        DirectionArrowList[numPlayers].length > 0 &&
        (ggc.curRound?.whichDirection === 1 || ggc.curRound?.whichDirection === 2) &&
        (() => {
          const arrowEntries = DirectionArrowList[numPlayers];
          const arrows = [];

          const directionRef =
            ggc.curRound?.whichDirection === 1 ? directionLeftImageRef :
            ggc.curRound?.whichDirection === 2 ? directionRightImageRef :
            null;

          if (!directionRef?.current) return null;

          for (let i = 0; i < arrowEntries.length; i += 2) {
            const [startRow, startCol] = arrowEntries[i];
            const [rowSpan, colSpan] = arrowEntries[i + 1];

            arrows.push(
              <div
                key={`arrow-${i}`}
                style={{
                  gridRow: `${startRow + 1} / span ${rowSpan}`,
                  gridColumn: `${startCol + 1} / span ${colSpan}`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 2,
                }}
              >
                <img
                  src={directionRef.current.src}
                  alt="arrow"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            );
          }

          return arrows;
        })()
      }
    </div>
  );
}

export default TableGrid;
