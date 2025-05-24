'use strict';

import React, { useState, useRef, useEffect } from 'react';

//************************************************************
// Shared Hook: useDraggableDialog
//************************************************************
function useDraggableDialog(open, position, setPosition) {
  const dialogRef = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const startDrag = (clientX, clientY) => {
    dragging.current = true;
    offset.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const updatePosition = (clientX, clientY) => {
    if (!dragging.current || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const dialogWidth = dialog.offsetWidth;
    const dialogHeight = dialog.offsetHeight;

    let newX = clientX - offset.current.x;
    let newY = clientY - offset.current.y;

    newX = Math.max(0, Math.min(screenWidth - dialogWidth, newX));
    newY = Math.max(0, Math.min(screenHeight - dialogHeight, newY));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseMove = (e) => updatePosition(e.clientX, e.clientY);
  const handleMouseUp = () => { dragging.current = false; };

  const handleTouchMove = (e) => updatePosition(e.touches[0].clientX, e.touches[0].clientY);
  const handleTouchEnd = () => { dragging.current = false; };

  useEffect(() => {
    if (!open) return;

    const handleResize = () => {
      if (!dialogRef.current) return;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const dialogWidth = dialogRef.current.offsetWidth;
      const dialogHeight = dialogRef.current.offsetHeight;

      let newX = Math.max(0, Math.min(screenWidth - dialogWidth, position.x));
      let newY = Math.max(0, Math.min(screenHeight - dialogHeight, position.y));

      setPosition({ x: newX, y: newY });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open, position]);

  return { dialogRef, startDrag };
}

//************************************************************
// BidDlg
//************************************************************
export function BidDlg({
  open,
  onSubmit,
  bids,
  defaultBid,
  yourTurnString,
  specialPasoString,
  position,
  setPosition,
  title,
  CanShowShake,
  style = {},
}) {
  const [selectedBid, setSelectedBid] = useState(defaultBid || bids[0] || '');
  const [canShowShake, setCanShowShake] = useState(() => CanShowShake(selectedBid));
  const [bidShowShake, setBidShowShake] = useState(false);

  const dialogRef = useRef(null);
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDraggableDialog(dialogRef, position, setPosition);


  useEffect(() => {
    setSelectedBid(defaultBid || bids[0] || '');
    setBidShowShake(false);
  }, [bids, defaultBid, open]);

  useEffect(() => {
    const result = CanShowShake(selectedBid);
    setCanShowShake(result);
    if (!result) setBidShowShake(false);
  }, [selectedBid, CanShowShake]);

  const handleDoubt = () => {
    setSelectedBid('DOUBT');
    onSubmit('DOUBT', bidShowShake);
  };

  const handlePaso = () => {
    setSelectedBid('PASO');
    onSubmit('PASO', bidShowShake);
  };

  if (!open) return null;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(54, 13, 13, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        userSelect: 'none',
      }}
    >
      <div
        ref={dialogRef}
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          backgroundColor: 'white',
          borderRadius: '10px',
          minWidth: '300px',
          maxWidth: '80%',
          textAlign: 'center',
          boxShadow: '0 0 10px rgba(0,0,0,0.25)',
          ...style,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            backgroundColor: 'darkblue',
            color: 'white',
            padding: '10px 12px',
            fontWeight: 'bold',
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <span>{title}</span>
        </div>

        {/* Content */}
        <div className="p-4">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl fw-semibold mb-3">
            {yourTurnString}
          </h2>
          <p className="mb-4 text-sm sm:text-base md:text-lg">{specialPasoString}</p>

          <div className="row align-items-center mb-3">
            <div className="col-auto">
              <select
                value={selectedBid}
                onChange={(e) => setSelectedBid(e.target.value)}
                className="form-select w-auto"
                style={{ minWidth: '120px' }}
              >
                {bids.map((bid) => (
                  <option key={bid} value={bid}>
                    {bid}
                  </option>
                ))}
              </select>
            </div>
            <div className="col text-start">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showShakeCheckbox"
                  disabled={!canShowShake}
                  checked={bidShowShake}
                  onChange={(e) => setBidShowShake(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="showShakeCheckbox">
                  Show/shake
                </label>
              </div>
            </div>
          </div>

          <div className="row align-items-center">
            <div className="col-8">
              <button
                className="ff-style-button"
                onClick={() => onSubmit(selectedBid, bidShowShake)}
              >
                OK
              </button>
            </div>
            <div className="col-4 d-flex justify-content-end gap-2">
              <button className="btn btn-danger btn-sm text-white" onClick={handleDoubt}>
                Doubt
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={handlePaso}>
                Paso
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

//************************************************************
// ConfirmBidDlg
//************************************************************
export function ConfirmBidDlg({
  open,
  message,
  onYes,
  onNo,
  position,
  setPosition,
  style = {},
}) {
  const { handleMouseDown, handleMouseMove, handleMouseUp, dialogRef } =
    useDraggableDialog({ open, position, setPosition });

  if (!open) return null;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        userSelect: 'none',
      }}
    >
      <div
        ref={dialogRef}
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          backgroundColor: 'white',
          border: '2px solid darkblue',
          borderRadius: '10px',
          overflow: 'hidden',
          paddingBottom: '20px',
          textAlign: 'center',
          minWidth: '280px',
          maxWidth: '90vw',
          boxShadow: '0 0 10px rgba(0,0,0,0.25)',
          ...style,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            backgroundColor: 'darkblue',
            color: 'white',
            padding: '10px 12px',
            fontWeight: 'bold',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Confirm Bid</span>
        </div>

        {/* Message */}
        <div
          style={{
            margin: '20px 10px',
            fontSize: '18px',
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </div>

        {/* Buttons */}
        <div className="d-flex justify-content-center gap-3 mt-3">
          <button className="ff-style-button" onClick={onYes}>
            Yes
          </button>
          <button className="ff-style-button" onClick={onNo}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

//************************************************************
// ShowShakeDlg
//************************************************************
export function ShowShakeDlg({
  open,
  title = "",
  message,
  onYes,
  onNo,
  position,
  setPosition,
  style = {},
}) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };

  const handleMouseUp = () => {
    dragging.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    dragging.current = true;
    offset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e) => {
    if (!dragging.current) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - offset.current.x,
      y: touch.clientY - offset.current.y,
    });
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  };


  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(54, 13, 13, 0.5)', // same as backdrop
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          backgroundColor: 'white',
          paddingBottom: '20px',
          borderRadius: '10px',
          minWidth: '300px',
          maxWidth: '80%',
          textAlign: 'center',
          boxShadow: '0 0 10px rgba(0,0,0,0.25)',
          ...style,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            backgroundColor: 'darkblue',
            color: 'white',
            padding: '10px 12px',
            fontWeight: 'bold',
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <span>{title}</span>
        </div>

        {/* Message */}
        <div style={{ padding: '20px', fontSize: '18px' }}>{message}</div>

        {/* Buttons */}
        <div>
          <button onClick={onYes} style={{ marginRight: '20px', padding: '10px 20px', fontSize: '16px' }}>
            Yes
          </button>
          <button onClick={onNo} style={{ padding: '10px 20px', fontSize: '16px' }}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

//************************************************************
// DoubtDlg
//************************************************************
export function DoubtDlg({
  open,
  title = "",
  message,
  onClose,
  doubtButtonText,
  doubtShowButton = true,
  position,
  setPosition,
  style = {},
}) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  if (!open) return null;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(54, 13, 13, 0.5)', // same as backdrop
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          backgroundColor: 'white',
          paddingBottom: '20px',
          borderRadius: '10px',
          minWidth: '300px',
          maxWidth: '80%',
          textAlign: 'center',
          boxShadow: '0 0 10px rgba(0,0,0,0.25)',
          ...style,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            backgroundColor: 'darkblue',
            color: 'white',
            padding: '10px 12px',
            fontWeight: 'bold',
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <span>{title}</span>
        </div>

        {/* Message */}
        <div style={{ padding: '20px' }}>
          {message.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}

          {doubtShowButton && (
            <button
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
              onClick={onClose}
            >
              {doubtButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

//************************************************************
// OkDlg (reuseable)
//************************************************************
export function OkDlg({
  open,
  title = "",
  message,
  onOk,
  position,
  setPosition,
  style = {},
}) {
  const dialogRef = useRef(null);
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDraggableDialog(dialogRef, position, setPosition);

  if (!open) return null;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        userSelect: 'none',
      }}
    >
      <div
        ref={dialogRef}
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          backgroundColor: 'white',
          border: '2px solid darkblue',
          borderRadius: '10px',
          overflow: 'hidden',
          paddingBottom: '20px',
          textAlign: 'center',
          width: '300px',
          maxWidth: '90vw',
          boxShadow: '0 0 10px rgba(0,0,0,0.25)',
          ...style,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            backgroundColor: 'darkblue',
            color: 'white',
            padding: '10px 12px',
            fontWeight: 'bold',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{title}</span>
        </div>

        {/* Message */}
        <div style={{ margin: '20px 10px', fontSize: '18px', whiteSpace: 'pre-line' }}>
          {message}
        </div>

        {/* OK Button */}
        <button onClick={onOk} style={{ padding: '10px 20px', fontSize: '16px' }}>
          OK
        </button>
      </div>
    </div>
  );
}

//************************************************************
// YesNoDlg (reuseable)
//************************************************************
export function YesNoDlg({
  open,
  position,
  setPosition,
  title = "",
  message,
  yesText,
  noText,
  onYes,
  onNo,
  onClose,
  yesShowButton,
  noShowButton,
  xShowButton,
  style = {},
}) {
  const { dialogRef, startDrag } = useDraggableDialog(open, position, setPosition);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        userSelect: 'none',
      }}
    >
      <div
        ref={dialogRef}
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          backgroundColor: 'white',
          border: '2px solid darkblue',
          borderRadius: '10px',
          overflow: 'hidden',
          paddingBottom: '20px',
          textAlign: 'center',
          minWidth: '280px',
          maxWidth: '90vw',
          boxShadow: '0 0 10px rgba(0,0,0,0.25)',
          ...style,
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          style={{
            backgroundColor: 'darkblue',
            color: 'white',
            padding: '10px 12px',
            fontWeight: 'bold',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{title}</span>

          {xShowButton && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
              }}
              title="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Message */}
        <div style={{ margin: '20px 10px', fontSize: '18px', whiteSpace: 'pre-line' }}>
          {message}
        </div>

        {/* Buttons */}
        <div className="d-flex justify-content-center gap-3 mt-3">
          {yesShowButton && (
            <button className="ff-style-button" onClick={onYes}>
              {yesText}
            </button>
          )}
          {noShowButton && (
            <button className="ff-style-button" onClick={onNo}>
              {noText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
