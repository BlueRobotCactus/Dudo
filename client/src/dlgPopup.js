import React from 'react';

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

function DoubtDlg({ open, message, onClose, x, y, doubtButtonText, doubtShowButton = true }) {
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
}

export default DoubtDlg;
