import './TableGrid.css';
import PlayerGrid from './PlayerGrid'; 

import { CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';

//************************************************************
// TableGrid (PlayerGrids placed within it
// ggc = DudoGame object
//************************************************************
export function TableGrid({ggc, myIndex}) {

  // -----------------------------------------------
  // Get list of players (cc's) and how many
  // each one in the list will have its PlayerGrid
  // -----------------------------------------------
  const ccList = [];

  const debugging = 0;   // 0 means no debugging
  if (debugging > 0 ) {
    for (let i=0; i<debugging; i++) {
      ccList.push(0);
    }
  } else {
    for (let cc = 0; cc < ggc.maxConnections; cc++) {
        if (ggc.allConnectionStatus[cc] == CONN_PLAYER_IN ||
            ggc.allConnectionStatus[cc] == CONN_PLAYER_OUT) {
            ccList.push(cc);
        }
    }
  }

  // -----------------------------------------------
  // Where to put PlayerGrids, depending on how many
  // the list is one-based
  // the coords in the list are zero-based
  // -----------------------------------------------
  const positionsList = [
    [], // index 0 unused
    [[3, 3]],
    [[3, 2], [3, 4]],
    [[2, 3], [5, 2], [5, 4]],
    [[2, 3], [4, 1], [4, 5], [6, 3]],
    [[2, 3], [4, 1], [4, 5], [6, 2], [6, 4]],
    [[2, 2], [2, 4], [4, 1], [4, 5], [6, 2], [6, 4]],
    [[1, 3], [3, 1], [3, 5], [5, 1], [5, 5], [7, 2], [7, 4]],
    [[1, 2], [1, 4], [3, 1], [3, 5], [5, 1], [5, 5], [7, 2], [7, 4]],
  ];

  const positions = positionsList[ccList.length];

  const rowFrs = computeFrArray(9, positions, true); // for 9 rows
  const colFrs = computeFrArray(7, positions, false); // for 7 cols

  // -----------------------------------------------
  // rendering
  // -----------------------------------------------
  return (
    <div
      className="fullscreen-grid"
      style={{
        display: 'grid',
        width: '100vw',
        height: '100vh',
        gridTemplateRows: rowFrs,
        gridTemplateColumns: colFrs,
        gap: '4px',
        padding: '4px',
        boxSizing: 'border-box',
      }}
    >
      {[...Array(9)].map((_, row) =>
        [...Array(7)].map((_, col) => {
          const posIndex = positions.findIndex(([r, c]) => r === row && c === col);
          const shouldRenderPlayer = posIndex !== -1;
          return (
            <div key={`cell-${row}-${col}`} className="fullscreen-cell">
              {shouldRenderPlayer && ccList[posIndex] !== undefined ? (
                <PlayerGrid ggc={ggc} myIndex={myIndex} cc={ccList[posIndex]} />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );

}

// -----------------------------------------------
// function to computer relative sizes (frs)
// of rows and cols.
//    if cell has a PlayerGrid, 3fr
//    otherwise, 1fr
// axisIndex = 0 means rows
// axisIndex = 1 means cols
// -----------------------------------------------
function computeFrArray(size, positions, isRow) {
  if (isRow) {
    // All rows fixed at 1fr
    return Array(size).fill('1fr').join(' ');
  }

  // Columns: 3fr if any PlayerGrid is in that column
  const frs = Array(size).fill(1);
  positions.forEach(([_row, col]) => {
    frs[col] = 3;
  });
  return frs.map((fr) => `${fr}fr`).join(' ');
}

/*
function computeFrArray(size, positions, axisIndex) {
  const frs = Array(size).fill(1);
  positions.forEach(([row, col]) => {
    const index = axisIndex === 0 ? row : col;
    frs[index] = 4;
  });
  return frs.map((fr) => `${fr}fr`).join(' ');
}
*/
export default TableGrid;
