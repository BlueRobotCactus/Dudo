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

  for (let cc = 0; cc < ggc.maxConnections; cc++) {
      if (ggc.allConnectionStatus[cc] == CONN_PLAYER_IN ||
          ggc.allConnectionStatus[cc] == CONN_PLAYER_OUT) {
          ccList.push(cc);
      }
  }

    // for debugging
//  for (let i=0; i<8; i++) {
//    ccList.push(0);
//  }

  // -----------------------------------------------
  // Where to put PlayerGrids, depending on how many
  // the list is one-based
  // the coords in the list are zero-based
  // -----------------------------------------------
  const positionsList = [
    [], // index 0 unused
    [[3, 3]],
    [[3, 2], [3, 4]],
    [[2, 3], [5, 1], [5, 5]],
    [[2, 3], [4, 1], [4, 5], [6, 3]],
    [[2, 3], [4, 1], [4, 5], [6, 2], [6, 4]],
    [[2, 2], [2, 4], [4, 1], [4, 5], [6, 2], [6, 4]],
    [[1, 3], [3, 1], [3, 5], [5, 1], [5, 5], [7, 2], [7, 4]],
    [[1, 2], [1, 4], [3, 1], [3, 5], [5, 1], [5, 5], [7, 2], [7, 4]],
  ];

  const positions = positionsList[ccList.length];

  let playerIndex = 0;

  // -----------------------------------------------
  // rendering
  // -----------------------------------------------
  return (
    <div className="fullscreen-grid">
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

export default TableGrid;
