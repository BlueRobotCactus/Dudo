'use strict';

import React, { useState, useRef, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import BidGrid from './pages/BidGrid.js';

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
// (obsolete)
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
  if (open) return null;      // TURNS THIS OFF
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
          <button className="btn btn-primary" onClick={onYes}>
            Yes
          </button>
          <button className="btn btn-primary" onClick={onNo}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

//************************************************************
// DirectionDlg
//************************************************************
export function DirectionDlg({
  open,
  title,
  message = "You start the bidding.\nWhich way?",
  leftText = leftText,
  rightText = rightText,
  onLeft = () => {},
  onRight = () => {},
}) {
  return (
    <Modal
      show={open}
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal"
    >
      <Modal.Header
        closeVariant="white"
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>{title}</Modal.Title>
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

      <Modal.Footer className="d-flex justify-content-center gap-2 py-1">
          <Button variant="primary" size="sm" onClick={onLeft}>
            {leftText}
          </Button>
          <Button variant="primary" size="sm" onClick={onRight}>
            {rightText}
          </Button>
      </Modal.Footer>
    </Modal>
  );
}

// begin &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

export function BidDlg({ 
  open, 
  onHide, 
  bidMatrix,
  yourTurnString,
  specialPasoString,
  ggc,
  myIndex,
  onSubmit,
}) {
  const [selectedBid, setSelectedBid] = useState('');
  const [canShowShake, setCanShowShake] = useState(false);
  const [bidShowShake, setBidShowShake] = useState(false);

  const [minimized, setMinimized] = useState(false);
  const bidGridRows = bidMatrix.length;

  //----------------------------------------------------
  // UseEffect CHECKBOX [selectedBid, CanShowShake]
  //           track changes in checkbox
  //----------------------------------------------------
  useEffect(() => {
    if (ggc.allConnectionID.length === 0) { 
      return;
    }
    console.log("GamePage: useEffect: CHECKBOX");
    const result = CanShowShake(selectedBid);
    setCanShowShake(result);
    if (!result) setBidShowShake(false);
  }, [selectedBid, canShowShake]);

  //----------------------------------------------------
  // helper functions
  //----------------------------------------------------
    const handleToggle = () => setMinimized(!minimized);

  //----------------------------------------------------
  // function to say whether they can show/shake 
  // based on currently selected bid
  //----------------------------------------------------
  const CanShowShake = (bid) => {
    // no, if special strings
    if (bid === "PASO" || bid === "DOUBT" || bid === "--Select--" || bid === "") {
      return false;
    }

    // does player have any of hidden dice of what they bid?
    ggc.parseBid(bid);
    for (let i = 0; i < 5; i++) {
        if (ggc.bDiceHidden[myIndex][i]) {
            if (ggc.dice[myIndex][i] == ggc.parsedOfWhat) {
                return true;
            }
            if (!ggc.bPaloFijoRound) {
                // aces wild if not palofijo
                if (ggc.dice[myIndex][i] == 1) {
                  return true;
                }
            }
        }
    }
    return (false);
  }

  //----------------------------------------------------
  // function called when they submit the bid 
  // (Bid / Doubt / Paso buttons)
  //----------------------------------------------------
  const handleSubmit = (bidText, bShowShake) => {
    onSubmit(bidText, bShowShake);   // ✅ call the passed function
    onHide();                          // optional: close dialog
  };

  //----------------------------------------------------
  // RENDER 
  //----------------------------------------------------
  return (
    open && (
      <div
        className={`floating-dialog border border-primary rounded-3 bg-white shadow ${minimized ? 'minimized' : ''}`}
style={{
  position: 'fixed',
  top: '10vh',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 2000,
  width: '80vw',
  maxWidth: '600px',
  height: minimized ? 'auto' : 'fit-content',
  overflow: 'hidden',
  borderRadius: '0.5rem',
  padding: 0,
  whiteSpace: 'nowrap',
}}
      >
        <div
          className="bg-primary text-white py-2 px-3 d-flex justify-content-between align-items-center"
          style={{ cursor: 'pointer', borderTopLeftRadius: '0.4rem', borderTopRightRadius: '0.4rem' }}
          onClick={handleToggle}
        >
          <div style={{ fontSize: '1rem' }}>
            {minimized ? 'Tap/Click to bid' : 'Make a Bid  (Tap/Click to see table)'}
          </div>
        </div>

        {!minimized && (
          <div className="p-3">
            <div className="border border-primary rounded p-2">
              {/* Row 1: header message (span all 8 cols) */}
              <div style={{ marginBottom: '0.5rem' }}>
                <p className="fw-bold mb-1">{yourTurnString}</p>
                <p className="fw-bold mb-0">{specialPasoString}</p>
              </div>

              <div
                className="d-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, auto) auto',
                  gridTemplateRows: `repeat(${bidGridRows}, auto)`,
                  columnGap: '0.75rem',
                  rowGap: '0.25rem',
                }}
              >
                {/* BidGrid: spans 7 columns and all rows */}
                <div style={{ 
                  gridColumn: '1 / span 7', 
                  gridRow: `1 / span ${bidGridRows}`,
                  maxHeight: '70vh',
                  overflowY: 'auto',  // enables vertical scroll
                  paddingRight: '.50rem',
                  }}>
                  <BidGrid
                    validBids={bidMatrix}
                    onBidSelect={(row, col) => {
                      console.log(`You selected: ${row + 1} x ${col + 1}`);
                      setSelectedBid(`${row + 1} - ${col + 1}`);
                    }}
                  />
                </div>

                {/* Right-side controls aligned with rows 1–4 */}
                <div style={{ gridColumn: 8, gridRow: 1 }}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="showShakeCheckbox"
                      disabled={!canShowShake}
                      checked={bidShowShake}
                      onChange={(e) => setBidShowShake(e.target.checked)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="showShakeCheckbox"
                      style={{ color: canShowShake ? 'black' : 'gray' }}
                    >
                      Show
                    </label>
                  </div>
                </div>

                <div style={{ gridColumn: 8, gridRow: 2 }}>
                  <button
                    className="btn btn-primary btn-sm w-100"
                    disabled={selectedBid === '--Select--' || selectedBid === ''}
                    onClick={() => handleSubmit(selectedBid, bidShowShake)}
                  >
                    Bid
                  </button>
                </div>

                <div style={{ gridColumn: 8, gridRow: 3 }}>
                  <button
                    className="btn btn-danger btn-sm text-white w-100"
                    disabled={!ggc.curRound.numBids > 0}
                    onClick={() => handleSubmit('DOUBT', bidShowShake)}
                  >
                    Doubt
                  </button>
                </div>

                {ggc.bPasoAllowed && (
                  <div style={{ gridColumn: 8, gridRow: 4 }}>
                    <button
                      className="btn btn-outline-secondary btn-sm w-100"
                      disabled={!ggc.CanPaso()}
                      onClick={() => handleSubmit('PASO', bidShowShake)}
                    >
                      Paso
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  );
}

// end &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

//************************************************************
// OkDlg (reuseable)
//************************************************************
export function OkDlg({
  open,
  onOk = () => {},
  title = "",
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
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>{title}</Modal.Title>
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

      <Modal.Footer className="d-flex justify-content-center gap-2 py-1">
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
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>{title}</Modal.Title>
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

      <Modal.Footer className="d-flex justify-content-center gap-2 py-1">
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
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal" // custom class for size
    >
      <Modal.Header
        closeButton={xShowButton}
        closeVariant="white"
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>Starting a game</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="container">
          <div className="row mb-2">
            <div className="col text-center fw-bold" style={{ whiteSpace: 'pre-line' }}>
              Starting a game. Are you in?
            </div>
          </div>

          <div className="row mb-0">
            <div className="col-6 text-end">Number of sticks:</div>
            <div className="col-6 text-start">{inOutSticks}</div>
          </div>

          <div className="row mb-0">
            <div className="col-6 text-end">Paso Allowed:</div>
            <div className="col-6 text-start">{inOutPaso}</div>
          </div>

          <div className="row mb-0">
            <div className="col-6 text-end">Palo Fijo allowed:</div>
            <div className="col-6 text-start">{inOutPaloFijo}</div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-center gap-2 py-1">
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

//************************************************************
// BidHistoryDlg
//************************************************************
export function BidHistoryDlg({ 
  open, 
  bids,
  onOk = () => {},
  onHide={onOk}
}) {
  return (
    <Modal
      show={open}
      onHide={onOk}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal" // custom class for size
    >

      <Modal.Header
        closeButton
        closeVariant="white"
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>Bid History (most recent first)</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div
          style={{
            maxHeight: '50vh',
            overflowY: 'auto',
          }}
        >
          <table className="table table-sm table-bordered text-center align-middle mb-0">
            <thead className="table-secondary">
              <tr>
                <th>Player</th>
                <th>Bid</th>
                <th style={{ borderRight: '1px solid lightgray' }}>Show?</th>
                <th>Table Showing</th>
                <th>Looking For</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid, i) => (
                <tr key={i}>
                  <td>{bid.playerName}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{bid.text}</td>
                  <td style={{ borderRight: '1px solid lightgray' }}>
                    {bid.bShowShake ? bid.howManyShown : '-'}
                  </td>
                  <td>{bid.showing === undefined ? '-' : bid.showing}</td>
                  <td>{bid.lookingFor === undefined ? '-' : bid.lookingFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal.Body>

      <Modal.Footer className="py-1">
        <Button variant="primary" size="sm" onClick={onOk}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

//************************************************************
// ObserverDlg
//************************************************************
export function ObserversDlg({ 
  open, 
  observers,
  onOk = () => {},
  onHide={onOk}
}) {
  return (
    <Modal
      show={open}
      onHide={onOk}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal" // custom class for size
    >

      <Modal.Header
        closeButton
        closeVariant="white"
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>Observers</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div
          style={{
            maxHeight: '50vh',
            overflowY: 'auto',
            padding: '0.25rem 0.5rem',
          }}
        >
          {observers.length === 0 ? (
            <div className="text-muted">There are no observers in this lobby.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1rem' }}>
              {observers.map((obs, index) => (
                <li
                  key={index}
                  style={{
                    padding: '0.25rem 0',
                    listStyleType: 'disc',
                  }}
                >
                  {obs.playerName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="py-1">
        <Button variant="primary" size="sm" onClick={onOk}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

//************************************************************
// SetGameParametersDlg
//************************************************************

export function SetGameParametersDlg({ 
  open, 
  sticks,
  paso,
  palofijo,
  onSave = () => {},
  onCancel = () => {},
  onHide={onCancel},
  mode = 'navbar',  // default value
}) {
  const [localSticks, setLocalSticks] = useState(sticks);
  const [localPaso, setLocalPaso] = useState(paso);
  const [localPalofijo, setLocalPalofijo] = useState(palofijo);

  return (
    <Modal
      show={open}
      onHide={onCancel}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal" // custom class for size
    >
      <Modal.Header
        closeButton
        closeVariant="white"
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>Set Game Parameters</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="border border-primary rounded p-3 mb-1">
          <div className="row align-items-center mb-1">
            {/* number of sticks (dropbox) */}
            <div className="col-6 text-end">
              Number of sticks:
            </div>
            <div className="col-3">
              <select
                className="form-select form-select-sm w-auto"
                value={localSticks}
                onChange={(e) => setLocalSticks(parseInt(e.target.value))}                
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          </div>

          {/* paso allowed? (checkbox) */}
          <div className="row align-items-center mb-1">
            <div className="col-6 text-end">
              Paso allowed:
            </div>
            <div className="col-3">
              {/* paso checkbox */}
              <input
                type="checkbox"
                className="form-check-input"
                id="pasoAllowedCheckbox"
                checked={localPaso}
                onChange={(e) => setLocalPaso(e.target.checked)}                
              />
            </div>
          </div>

          {/* palofijo allowed? (checkbox) */}
          <div className="row align-items-center">
            <div className="col-6 text-end">
              Palo Fijo allowed:
            </div>
            <div className="col-3">
              {/* palo fijo checkbox */}
              <input
                type="checkbox"
                className="form-check-input"
                id="palofijoAllowedCheckbox"
                checked={localPalofijo}
                onChange={(e) => setLocalPalofijo(e.target.checked)}                
              />
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="py-1">
        <div className="col-3 d-flex justify-content-end">
          {/* Save button */}
          <button
            onClick={() => onSave(localSticks, localPaso, localPalofijo)}
            className="btn btn-primary btn-sm me-2"
          >
          {mode === 'navbar' ? 'Save' : 'Start Game'} 
          </button>
        </div>
        <div className="col-3 d-flex justify-content-end">
          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="btn btn-secondary btn-sm me-2"
          >
            Cancel
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

//************************************************************
// GameSettingsDlg
//************************************************************
export function GameSettingsDlg({ 
  open, 
  sticks,
  paso,
  palofijo,
  onOk = () => {},
  onHide={onOk}
}) {
  return (
    <Modal
      show={open}
      onHide={onOk}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="yesno-sm-modal" // custom class for size
    >

      <Modal.Header
        closeButton
        closeVariant="white"
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>Game Settings</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div
          style={{
            maxHeight: '50vh',
            overflowY: 'auto',
            padding: '0.25rem 0.50rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.50rem',
          }}
        >
          {/* Row 1 */}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, textAlign: 'right', paddingRight: '0.75rem' }}>Number of sticks:</div>
            <div style={{ flex: 1, textAlign: 'left' }}>{sticks}</div>
          </div>

          {/* Row 2 */}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, textAlign: 'right', paddingRight: '0.75rem' }}>Paso allowed:</div>
            <div style={{ flex: 1, textAlign: 'left' }}>{paso ? 'Yes' : 'No'}</div>
          </div>

          {/* Row 3 */}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, textAlign: 'right', paddingRight: '0.75rem' }}>Palofijo allowed:</div>
            <div style={{ flex: 1, textAlign: 'left' }}>{palofijo ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="py-1">
        <Button variant="primary" size="sm" onClick={onOk}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

//************************************************************
// LiftCupDlg
//************************************************************
export function LiftCupDlg({ 
  open,
  doubtWhoDoubtedWhom,
  doubtDoubtedBid,
  liftCupShowButton,
  liftCupShowButtonX,
  onOk = () => {},
  onHide={onOk}
}) {
  return (
    <Modal
      show={open}
      onHide={onOk}
      backdrop="static"
      keyboard={false}
      dialogClassName="dialog-top yesno-sm-modal"
    >
      <Modal.Header
        {...(liftCupShowButtonX ? { closeButton: true } : {})} 
        closeVariant="white"
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>DOUBT!</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div
          style={{
            maxHeight: '50vh',
            overflowY: 'auto',
            padding: '0.25rem 0.50rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.50rem',
          }}
        >
        </div>
            <div className="col text-center" style={{ whiteSpace: 'pre-line' }}>
              {doubtWhoDoubtedWhom}
            </div>
            <div className="col text-center" style={{ whiteSpace: 'pre-line' }}>
              {doubtDoubtedBid}
            </div>
      </Modal.Body>

      {liftCupShowButton ? (
        <Modal.Footer className="py-1">
          <Button variant="primary" size="sm" onClick={onOk}>
            Lift Cup
          </Button>
        </Modal.Footer>
      ) : null}
    </Modal>
  );
}

//************************************************************
// ShowDoubtDlg
//************************************************************
export function ShowDoubtDlg({ 
  open,
  doubtWhoDoubtedWhom,
  doubtDoubtedBid,
  doubtThereAre,
  doubtWhoGotStick,
  doubtWhoWon,
  showDoubtShowButton,
  showDoubtShowButtonX,
  onOk = () => {},
  onHide={onOk}
}) {
  return (
    <Modal
      show={open}
      onHide={onOk}
      backdrop="static"
      keyboard={false}
      dialogClassName="dialog-top yesno-sm-modal"
    >
      <Modal.Header
        {...(showDoubtShowButtonX ? { closeButton: true } : {})} 
        closeVariant="white"
        className="bg-primary text-white py-1 px-3"
        style={{ fontSize: '.875rem' }}
      >
        <Modal.Title style={{ fontSize: '1rem' }}>DOUBT!</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div
          style={{
            maxHeight: '50vh',
            overflowY: 'auto',
            padding: '0.25rem 0.50rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.50rem',
          }}
        >
        </div>
            <div className="col text-center" style={{ whiteSpace: 'pre-line' }}>
              {doubtWhoDoubtedWhom}
            </div>
            <div className="col text-center" style={{ whiteSpace: 'pre-line' }}>
              {doubtDoubtedBid + doubtThereAre}
            </div>
            <div className="col text-center" style={{ whiteSpace: 'pre-line' }}>
              {doubtWhoGotStick}
            </div>

            {doubtWhoWon !== '' ? (
              <div className="col text-center fw-bold" style={{ whiteSpace: 'pre-line' }}>
                {doubtWhoWon}
              </div>
            ) : null }
      </Modal.Body>

      {showDoubtShowButton ? (
        <Modal.Footer className="py-1">
          <Button variant="primary" size="sm" onClick={onOk}>
            OK
          </Button>
        </Modal.Footer>
      ) : null}
    </Modal>
  );
}
