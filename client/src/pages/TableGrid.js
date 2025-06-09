import './TableGrid.css';
import PlayerGrid from './PlayerGrid';
import PlayerCard from './PlayerCard.js';

import { CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';

//************************************************************
// TableGrid (PlayerCards placed within it)
// ggc = DudoGame object
//************************************************************
export function TableGrid({ggc, myIndex, backgroundColor}) {
  console.log("TableGrid: entering TableGrid ()");

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
    for (let i = 0; i < ggc.maxConnections; i++) {
      if (ggc.allConnectionStatus[cc] === CONN_PLAYER_IN ||
          ggc.allConnectionStatus[cc] === CONN_PLAYER_OUT) {
        ccList.push(cc);
      }
      cc++;
      if (cc == ggc.maxConnections) {
        cc = 0;
      }
    }


/*
    for (let cc = 0; cc < ggc.maxConnections; cc++) {
        if (ggc.allConnectionStatus[cc] == CONN_PLAYER_IN ||
            ggc.allConnectionStatus[cc] == CONN_PLAYER_OUT) {
            ccList.push(cc);
        }
    }
*/

    }

  // -----------------------------------------------
  // Where to put PlayerGrids, depending on how many
  // the list is one-based
  // the coords in the list are zero-based
  // -----------------------------------------------
  /*
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

  const positions = List.length]positionsList[cc || [];
*/

  // -----------------------------------------------
  //  Where to put PlayerGrids, depending on how many
  //  the list is one-based
  //  the coords in the list are zero-based
  //
  //  [
  //    [number of TableGrid rows, number of TableGrid cols],
  //    [span of PlayerGrid rows, span of PlayerGrid cols],
  //    [PlayerGrid topleft row coord, PlayerGrid topleft col coord],
  //      ...
  //    [PlayerGrid topleft row coord, PlayerGrid topleft col coord],
  //  ]
  // -----------------------------------------------

  const newPositionList = [
    [], // index 0 unused
    [[12, 12], [3, 4],   [3, 4]],   // 1
    [[12, 12], [3, 4],   [6, 4], [1, 4]],   //2
    [[12, 12], [3, 4],   [6, 4], [1, 1], [1, 7]],   //3
    [[13, 12], [3, 4],   [9, 4], [5, 1], [1, 4], [5, 7]],   //4
    [[13, 14], [3, 4],   [9, 5], [5, 1], [1, 2], [1, 8], [5, 9]],   //5
    [[13, 11], [2, 3],   [10, 4], [7, 1], [4, 1], [1, 4], [4, 7], [7, 7]],  //6
    [[13, 11], [2, 3],   [10, 4], [7, 1], [4, 1], [1, 2], [1, 6], [4, 7], [7, 7]],   //7
    [[13, 11], [2, 3],   [10, 2], [7, 1], [4, 1], [1, 2], [1, 6], [4, 7], [7, 7], [10, 6]] //8
  ];

  const numPlayers = ccList.length;

  console.log("numPlayers: " + numPlayers);


  const layout = newPositionList[numPlayers];
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
        gridTemplateRows: `repeat(${numRows}, 1fr)`,
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
          {/* <PlayerGrid ggc={ggc} myIndex={myIndex} cc={ccList[index]} /> */}
          <PlayerCard ggc={ggc} cc={ccList[index]} myIndex={myIndex} />
        </div>
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
