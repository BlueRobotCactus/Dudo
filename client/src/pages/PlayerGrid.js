import React, { useState, useEffect, useRef } from 'react';
import './PlayerGrid.css';

function PlayerGrid() {
  const [cellSize, setCellSize] = useState(getCellSize());

  function getCellSize() {
    const margin = 40;
    return Math.floor((window.innerWidth - margin) / 12);
  }

  useEffect(() => {
    const handleResize = () => setCellSize(getCellSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const borderedPairs = [
    [2, 4], [2, 7],
    [4, 2], [4, 9],
    [6, 2], [6, 9],
    [8, 4], [8, 7],
  ];

  const isPairStart = new Set(borderedPairs.map(([r, c]) => `${r},${c}`));
  const pairMap = new Set(borderedPairs.flatMap(([r, c]) => [`${r},${c}`, `${r},${c + 1}`]));

  // Helper to draw inside a canvas
const PairCanvas = ({ width, height }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'lightblue';
    ctx.fillRect(0, 0, width, height); // Fill the background

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20); // Draw a rectangle inside the canvas
  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};

  const cells = [];
  for (let row = 1; row <= 12; row++) {
    for (let col = 1; col <= 12; col++) {
      const key = `${row},${col}`;

      if (isPairStart.has(key)) {
        cells.push(
          <div
            key={key}
            className="grid-cell pair-canvas"
            style={{
              width: `${2 * cellSize}px`,
              height: `${cellSize}px`,
              padding: 0,
              margin: 0,
            }}
          >
            <PairCanvas width={2 * cellSize} height={cellSize} />
          </div>
        );
        col++; // Skip the next cell in this row
      } else if (!pairMap.has(key)) {
        cells.push(
          <div
            key={key}
            className="grid-cell"
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
            }}
          ></div>
        );
      }
    }
  }

  return (
    <div
      className="grid-wrapper mt-5"
      style={{
        width: `${cellSize * 12}px`,
        height: `${cellSize * 12}px`,
      }}
    >
      <div className="grid-container">{cells}</div>
    </div>
  );
}

export default PlayerGrid;
