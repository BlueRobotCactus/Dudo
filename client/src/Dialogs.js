'use strict';

import React, { useState, useEffect } from 'react';

//************************************************************
// BidDlg
//************************************************************
export function BidDlg({ open, onClose, onSubmit, bids, defaultBid, makeBidString, yourTurnString, specialPasoString, style }) {
  const [selectedBid, setSelectedBid] = useState(defaultBid || bids[0] || '');

  // Update selected bid if bids array changes
  useEffect(() => {
    setSelectedBid(defaultBid || bids[0] || '');
  }, [bids, defaultBid, open]);

  if (!open) return null;

  return (
    <div style={style} className="fixed inset-0 flex justify-center items-center px-4">
      <div className="bg-white p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-2 sm:mb-4">{yourTurnString}</h2>
        <p className="mb-2 sm:mb-4 text-sm sm:text-base md:text-lg">{specialPasoString}</p>
        <p className="mb-2 sm:mb-4 text-sm sm:text-base md:text-lg">{makeBidString}</p>
        <select
          value={selectedBid}
          onChange={(e) => setSelectedBid(e.target.value)}
          className="w-full p-2 sm:p-3 md:p-4 text-base sm:text-lg md:text-xl border rounded mb-8"
        >
          {bids.map((bid) => (
            <option key={bid} value={bid}>
              {bid}
            </option>
          ))}
        </select>
        <div style={{ height: '20px', pointerEvents: 'none' }} />
        <div className="mt-8">
          <div className="flex justify-end gap-2 sm:gap-4">
            <button
              onClick={() => onSubmit(selectedBid)}
              className="px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg bg-blue-500 text-white rounded"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

//************************************************************
// ConfirmBidDlg
//************************************************************
export function ConfirmBidDlg({ open, message, onYes, onNo, style }) {
  if (!open) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '40%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      border: '2px solid black',
      borderRadius: '10px',
      padding: '20px',
      zIndex: 1000,
      textAlign: 'center',
      ...style,
    }}>
        <div style={{ marginBottom: '20px', fontSize: '18px', whiteSpace: 'pre-line' }}>{message}</div>
        <div>
            <button onClick={onYes} style={{ marginRight: '20px', padding: '10px 20px' }}>Yes</button>
            <button onClick={onNo} style={{ padding: '10px 20px' }}>No</button>
        </div>
        </div>
  );
}

//************************************************************
// ShowShakeDlg
//************************************************************
export function ShowShakeDlg({ open, message, onYes, onNo, style }) {
  if (!open) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '40%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      border: '2px solid black',
      borderRadius: '10px',
      padding: '20px',
      zIndex: 1000,
      textAlign: 'center',
      ...style,
    }}>
      <div style={{ marginBottom: '20px', fontSize: '18px' }}>{message}</div>
      <div>
        <button onClick={onYes} style={{ marginRight: '20px', padding: '10px 20px' }}>Yes</button>
        <button onClick={onNo} style={{ padding: '10px 20px' }}>No</button>
      </div>
    </div>
  );
}

const styles = {
    backdrop: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(54, 13, 13, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    },
    dialog: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      minWidth: '300px',
      maxWidth: '80%',
      textAlign: 'center',
      boxShadow: '0 0 10px rgba(0,0,0,0.25)',
    },
    button: {
      marginTop: '20px',
      padding: '10px 20px',
      fontSize: '16px',
      cursor: 'pointer',
    }
};
  

//************************************************************
// DoubtDlg
//************************************************************
export function DoubtDlg({ open, message, onClose, x, y, doubtButtonText, doubtShowButton = true }) {
    if (!open) return null;

    const dialogStyle = {
        ...styles.dialog,
        position: 'absolute',
        left: x,
        top: y,
    };

    return (
        <div style={styles.backdrop}>
        <div style={dialogStyle}>
            {message.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
            ))}
            {doubtShowButton && (
            <button style={styles.button} onClick={onClose}>
                {doubtButtonText}
            </button>
            )}
        </div>
        </div>
    );
};

//************************************************************
// OkDlg (reuseable)
//************************************************************
export function OkDlg({ open, message, onOk, style = {} }) {
  if (!open) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '40%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      border: '2px solid black',
      borderRadius: '10px',
      padding: '20px',
      zIndex: 1000,
      textAlign: 'center',
      width: '300px',
      ...style,
    }}>
      <div style={{ marginBottom: '20px', fontSize: '18px', whiteSpace: 'pre-line' }}>
        {message}
      </div>
      <button onClick={onOk} style={{ padding: '10px 20px', fontSize: '16px' }}>
        OK
      </button>
    </div>
  );
}

//************************************************************
// YesNoDlg (reuseable)
//************************************************************
export function YesNoDlg({ open, message, yesText, noText, onYes, onNo, yesShowButton, noShowButton, style = {} }) {
  if (!open) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '40%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      border: '2px solid black',
      borderRadius: '10px',
      padding: '20px',
      zIndex: 1000,
      textAlign: 'center',
      width: '300px',
      ...style,
    }}>
      <div style={{ marginBottom: '20px', fontSize: '18px', whiteSpace: 'pre-line' }}>
        {message}
      </div>

      {yesShowButton && (
      <button onClick={onYes} style={{ padding: '10px 20px', fontSize: '16px' }}>
        {yesText}
      </button>
      )}

      {noShowButton && (
      <button onClick={onNo} style={{ padding: '10px 20px', fontSize: '16px' }}>
        {noText}
      </button>
      )}

    </div>
  );
}
