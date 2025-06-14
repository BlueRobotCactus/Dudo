'use strict';

import React, { useState, useRef, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

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
// OkDlg (reuseable)
//************************************************************
export function OkDlg({
  open,
  onOk = () => {},
  title = "Information",
  message = "",
  xShowButton = false,
}) {
  return (
    <Modal
      show={open}
      onHide={onOk} // close when OK is clicked
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal" // keep size consistent
    >
      <Modal.Header
        closeButton={xShowButton}
        closeVariant="white"
        className="bg-primary text-white py-2 px-3"
        style={{ fontSize: '14px' }}
      >
        <Modal.Title style={{ fontSize: '16px' }}>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="container">
          <div className="row">
            <div className="col text-center" style={{ whiteSpace: 'pre-line' }}>
              {message}
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-center gap-2 py-2">
        <Button variant="primary" size="sm" onClick={onOk}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}


//************************************************************
// YesNoDlg (reuseable)
//************************************************************
export function YesNoDlg({
  open,
  title = "",
  message = "",
  yesText = "Yes",
  noText = "No",
  onYes = () => {},
  onNo = () => {},
  onClose = () => {},
  yesShowButton = true,
  noShowButton = true,
  xShowButton = true,
}) {
  return (
    <Modal
      show={open}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal"
    >
      <Modal.Header
        closeButton={xShowButton}
        closeVariant="white"
        className="bg-primary text-white py-2 px-3"
        style={{ fontSize: '14px' }}
      >
        <Modal.Title style={{ fontSize: '16px' }}>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="container">
          <div className="row">
            <div className="col text-center" style={{ whiteSpace: 'pre-line' }}>
              {message}
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-center gap-2 py-2">
        {yesShowButton && (
          <Button variant="primary" size="sm" onClick={onYes}>
            {yesText}
          </Button>
        )}
        {noShowButton && (
          <Button variant="secondary" size="sm" onClick={onNo}>
            {noText}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}


//************************************************************
// InOutDlg
//************************************************************
export function InOutDlg({
  open,
  onIn = () => {},
  onOut = () => {},
  onClose = () => {},
  yesShowButton = true,
  noShowButton = true,
  xShowButton = false,
  inOutSticks,
  inOutPaso,
  inOutPaloFijo,
}) {
  return (
    <Modal
      show={open}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal" // custom class for size
    >
      <Modal.Header
        closeButton={xShowButton}
        closeVariant="white"
        className="bg-primary text-white py-2 px-3"
        style={{ fontSize: '14px' }}
      >
        <Modal.Title style={{ fontSize: '16px' }}>Starting a game</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="container">
          <div className="row mb-3">
            <div className="col text-center fw-bold" style={{ whiteSpace: 'pre-line' }}>
              Starting a game{'\n'}Are you in?
            </div>
          </div>

          <div className="row mb-2">
            <div className="col-6 text-end">Number of sticks:</div>
            <div className="col-6 text-start">{inOutSticks}</div>
          </div>

          <div className="row mb-2">
            <div className="col-6 text-end">Paso Allowed</div>
            <div className="col-6 text-start">{inOutPaso}</div>
          </div>

          <div className="row">
            <div className="col-6 text-end">Palo Fijo allowed</div>
            <div className="col-6 text-start">{inOutPaloFijo}</div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-center gap-2 py-2">
        {yesShowButton && (
          <Button variant="primary" size="sm" onClick={onIn}>
            Yes, I'm in
          </Button>
        )}
        {noShowButton && (
          <Button variant="secondary" size="sm" onClick={onOut}>
            No, I'll watch
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}