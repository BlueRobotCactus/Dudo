import './TableGrid.css';
import PlayerGrid from './PlayerGrid'; 

import { CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';

//************************************************************
// TableGrid (PlayerGrids placed within it
// ggc = DudoGame object
//************************************************************
export function TableGrid({ggc, myIndex, backgroundColor}) {

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
    [],
    [[3, 4]],
    [[3, 2], [3, 6]],
    [[1, 4], [5, 1], [5, 7]],
    [[1, 4], [4, 1], [4, 7], [7, 4]],
    [[1, 4], [4, 1], [4, 7], [7, 2], [7, 6]],
    [[1, 4], [4, 1], [4, 7], [7, 1], [7, 7], [10, 4]],
    [[1, 4], [4, 1], [4, 7], [7, 1], [7, 7], [10, 2], [10, 6]],
    [[1, 2], [1, 6], [4, 1], [4, 7], [7, 1], [7, 7], [10, 2], [10, 6]]
  ];

  const positions = positionsList[ccList.length] || [];

  // -----------------------------------------------
  // rendering
  // -----------------------------------------------
  return (
    <div
      className="table-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(11, 1fr)',
        gridTemplateRows: 'repeat(12, 1fr)',
        width: '100vw',
        height: '100vh',
        gap: '2px',
        backgroundColor
      }}
    >
      {positions.map(([row, col], index) => (
        <div
          key={`player-${index}`}
          style={{
            gridRow: `${row + 1} / span 2`,
            gridColumn: `${col + 1} / span 3`
          }}
        >
          <PlayerGrid ggc={ggc} cc={ccList[index]} myIndex={myIndex} />
        </div>
      ))}
    </div>
  );

}
/*
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
*/
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
