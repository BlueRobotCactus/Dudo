import React, { useState, useContext } from 'react';
import { ImageRefsContext } from '../ImageRefsContext';

export function BidGrid({ validBids, onBidSelect }) {
  const { diceImagesRef, imagesReady } = useContext(ImageRefsContext);
  const numRows = validBids.length;
  const numCols = validBids[0]?.length || 0;

  const [selectedBid, setSelectedBid] = useState(null);

  if (!imagesReady) {
    return <div>Loading images...</div>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `auto repeat(${numCols}, 1fr)`, // +1 for row labels
        gridAutoRows: '2.5rem',
        maxWidth: '100%',
        border: '1px solid #666', // outer border
        textAlign: 'center',
      }}
    >
      {/* Top-left empty cell */}
      <div style={{ ...cellBorderStyle, backgroundColor: '#f8f8f8' }}></div>

      {/* Top row: dice images */}
      {Array.from({ length: numCols }).map((_, colIndex) => {
        const dieFace = colIndex < 5 ? colIndex + 2 : 1;
        return (
          <div key={`header-${colIndex}`} style={{ ...cellBorderStyle, backgroundColor: '#f8f8f8' }}>
            <img
              src={diceImagesRef.current[dieFace]?.src}
              alt={`Die ${dieFace}`}
              style={{ height: '1.5rem' }}
            />
          </div>
        );
      })}

      {/* Rows with label and bids */}
      {validBids.map((rowArray, rowIndex) => (
        <React.Fragment key={`row-${rowIndex}`}>
          <div style={{ ...cellBorderStyle, fontWeight: 'bold', backgroundColor: '#f8f8f8' }}>
            {rowIndex + 1}
          </div>
          {rowArray.map((isValid, colIndex) => {
            const dieFace = colIndex === 5 ? 1 : colIndex + 2;
            const isSelected = selectedBid?.[0] === rowIndex && selectedBid?.[1] === colIndex;
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  ...cellBorderStyle,
                  backgroundColor: '#f8f8f8', // light gray for invalid
                }}
              >
                {isValid && (
                  <button
                    className={`btn btn-sm ${isSelected ? '' : 'btn-primary'}`}
                    style={{
                      backgroundColor: isSelected ? '#0a50b8' : undefined,
                      color: isSelected ? 'white' : undefined,
                      border: isSelected ? '1px solid #0a50b8' : undefined,
                      width: '90%',
                      height: '90%',
                      padding: 0,
                      fontSize: '0.9rem',
                    }}
                    onClick={() => {
                      setSelectedBid([rowIndex, colIndex]);
                      onBidSelect(rowIndex, dieFace - 1);
                    }}
                  >
                  </button>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// Border style for every cell
const cellBorderStyle = {
  border: '1px solid #666',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
};

export default BidGrid;
