import React from 'react';
import PlayerGrid from './PlayerGrid'; 
import { CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';

//************************************************************
// TableGrid (PlayerGrids placed within it
// ggc = DudoGame object
//************************************************************
export function TableGrid({ggc}) {

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

  // -----------------------------------------------
  // Render 5x5 grid with PlayerGrids in (2,2), (2,4), etc.
  // -----------------------------------------------
  const positions = [
    [2, 2],
    [2, 4],
    [4, 2],
    [4, 4],
  ];

  let playerIndex = 0;

  // -----------------------------------------------
  // rendering
  // -----------------------------------------------
  return (
    <div className="container">
      {[1, 2, 3, 4, 5].map((rowNum) => (
        <div className="row" key={`row-${rowNum}`}>
          {[1, 2, 3, 4, 5].map((colNum) => {
            const shouldRenderPlayer =
              playerIndex < ccList.length &&
              positions.some(
                ([r, c], i) => r === rowNum && c === colNum && i === playerIndex
              );

            const content = shouldRenderPlayer ? (
              <PlayerGrid ggc={ggc} cc={ccList[playerIndex++]} />
            ) : null;

            return (
              <div
                className="col p-1 border border-light"
                key={`col-${rowNum}-${colNum}`}
              >
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default TableGrid;
