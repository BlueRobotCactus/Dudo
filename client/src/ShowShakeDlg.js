import React from 'react';

function ShowShakeDlg({ open, message, onYes, onNo, style }) {
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

export default ShowShakeDlg;
