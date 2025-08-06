import React, { useState, useEffect, useRef, useContext } from 'react';

import './PlayerGrid.css';
import { SocketContext } from '../SocketContext.js';
import { ImageRefsContext } from '../ImageRefsContext.js';
import { DudoGame, DudoRound } from '../DudoGameC.js';
import { MAX_CONNECTIONS, CONN_PLAYER_IN, CONN_PLAYER_OUT } from '../DudoGameC.js';
import { STICKS_BLINK_TIME, SHOWN_DICE_BLINK_TIME, SHAKE_CUPS_TIME } from '../DudoGameC.js';

//************************************************************
// PlayerGrid (placed inside TableGrid)
// ggc = DudoGame object
// cc = connection number of this player
//************************************************************
export function PlayerGrid({ lobbyId, ggc, myIndex, cc }) {
  const gridRef = useRef();
  const [cupShaking, setCupShaking] = useState(false);
  const [sticksBlinking, setSticksBlinking] = useState(false);
  const [diceBlinking, setDiceBlinking] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleLines, setBubbleLines] = useState(1);

  const BUBBLE_SHOW_TIME = 3000;

  // get our socket so we can emit
  const { socket, socketId, connected } = useContext(SocketContext);

  // images
  const {
    cupDownImageRef,
    cupUpImageRef,
    diceImagesRef,
    diceHiddenImageRef,
    stickImageRef,
    directionLeftImageRef,
    directionRightImageRef,
    imagesReady,
  } = useContext(ImageRefsContext);

  // sounds
  const Shake10Ref = useRef(null);
    const Shake01Ref = useRef(null);
    const Shake02Ref = useRef(null);
    const Shake03Ref = useRef(null);
    const Shake04Ref = useRef(null);
    const Roll10Ref = useRef(null);
    const Roll01Ref = useRef(null);
    const Roll02Ref = useRef(null);
    const Roll03Ref = useRef(null);
    const Roll04Ref = useRef(null);
    
    const ShakeSoundArray = [Shake10Ref.current,
                        Shake01Ref.current,
                        Shake02Ref.current,
                        Shake03Ref.current,
                        Shake04Ref.current]
    const RollSoundArray = [Roll10Ref.current, 
                      Roll01Ref.current,
                      Roll02Ref.current,
                      Roll03Ref.current,
                      Roll04Ref.current]

  //*****************************************************************
  // useEffect:  END OF ROUND
  //             [ggc.bGameInProgress, ggc.curRound.numBids, ggc.firstRound]
  //*****************************************************************
  useEffect(() => {
    if (ggc.SomebodyGotStick()) {


      console.log ("DEBUGGGG somebodyGotStick()");


      //-------------------------------------------------
      // somebody got a stick
      //-------------------------------------------------
      const numRounds = ggc.Rounds.length;
      if (ggc.Rounds[numRounds - 1].doubtLoser === cc) {
        // it was this player

      console.log ("DEBUGGGG this player got stick, about to trigger SticksBlinkig()");


        triggerSticksBlinking();
      }
      // wait for sticks, then shake cup
      setTimeout(() => {
        if (ggc.ShouldAllRollDice()) {
          if (ggc.allConnectionStatus[cc] === CONN_PLAYER_IN) {
            triggerCupShaking(0);
          }
        }
      }, STICKS_BLINK_TIME);
    } else {
      //-------------------------------------------------
      // all shake to start round
      //-------------------------------------------------
      if (ggc.ShouldAllRollDice()) {
        if (ggc.allConnectionStatus[cc] === CONN_PLAYER_IN) {
          triggerCupShaking(0);
        }
      }
    }
  }, [ggc.bGameInProgress, ggc.curRound?.numBids, ggc.firstRound]);

  //*****************************************************************
  // useEffect:  THIS PLAYER SHOW/SHAKE:  blink shown dice, shake cup 
  //             [ggc.curRound.numBids, ggc.bGameInProgress, ggc.curRound.Bids, cc]
  //*****************************************************************
  useEffect(() => {
    if (ggc.bGameInProgress && ggc.curRound.numBids > 0) {
      const lastBid = ggc.curRound?.Bids[ggc.curRound?.numBids - 1];

      if (lastBid.didUIShake) { return; }

      if (lastBid.playerIndex === cc && lastBid.bShowShake) {
        // Enable blinking
        setDiceBlinking(true);
        setTimeout(() => {
          setDiceBlinking(false); // Stop blinking after SHOWN_DICE_BLINK_TIME
          if (!ggc.PlayerShowingAllDice(cc)) {
            // get how many shaken and re-rolled
            triggerCupShaking(lastBid.howManyShaken);      // Start cup shake after that
   					socket.emit('UIShaking', lobbyId);
          }
        }, SHOWN_DICE_BLINK_TIME);
      }
    }
  }, [ggc.curRound?.numBids, ggc.bGameInProgress, ggc.curRound?.Bids, cc]);

  //--------------------------------------------------------
  // bail out if images are not ready
  //--------------------------------------------------------
  if (!imagesReady) {
    return <div>Loading images...</div>;
  }

  //--------------------------------------------------------
  // which cup image to show
  //--------------------------------------------------------
  let cupImageToShow;

  if (ggc.allConnectionStatus[cc] == CONN_PLAYER_OUT || !ggc.bGameInProgress) {
    cupImageToShow = cupUpImageRef.current;
  } else if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.doubtDidLiftCup[cc]) {
    cupImageToShow = cupUpImageRef.current;
  } else {
    cupImageToShow = cupDownImageRef.current;
  }
  // special case of pulsating the shown dice
  if (diceBlinking) {
    cupImageToShow = cupUpImageRef.current;
  }
  // special case of all 5 dice shown
  if (ggc.PlayerShowingAllDice(cc)) {
    cupImageToShow = cupUpImageRef.current;
  }

  //--------------------------------------------------------
  // which dice to show in each place, either:
  // - a dice image (1-6)
  // - the dice hidden image
  // - nothing at all (null)
  //--------------------------------------------------------

  // list of which dice images to use 
  let diceImageTopList = [];
  let diceImageBottomList = [];
  let diceShowTopHilite = [];
  let diceShowBottomHilite = [];

  // initialize 
  for (let cc = 0; cc < MAX_CONNECTIONS; cc++) {
    diceImageTopList[cc] = [];
    diceImageBottomList[cc] = [];
    diceShowTopHilite[cc] = [];
    diceShowBottomHilite[cc] = [];
    for (let i = 0; i < 5; i++) {
      diceImageTopList[cc][i] = null;
      diceImageBottomList[cc][i] = null;
      diceShowTopHilite[cc][i] = false;
      diceShowBottomHilite[cc][i] = false;
    }
  }

  // fill in the values
  if (ggc.bGameInProgress) {
    if (ggc.allConnectionStatus[cc] == CONN_PLAYER_IN) {
      let x, y, w, h;
      for (let i = 0; i < 5; i++) {
        const value = ggc.dice[cc][i];
        if (ggc.bDiceHidden[cc][i]) {
          // hidden dice in upper box
          if (cc == myIndex) {
            // if me, show the die
            diceImageTopList[cc][i] = diceImagesRef.current[value];
            if (ggc.bDiceHilite[cc][i]) {
              diceShowTopHilite[cc][i] = true;
            }
          } else {
            // other player
            if ((ggc.bDoubtInProgress || ggc.bShowDoubtResult) && ggc.doubtDidLiftCup[cc]) {
              // cup lifted, show dice
              diceImageTopList[cc][i] = diceImagesRef.current[value];
              if (ggc.bDiceHilite[cc][i]) {
                diceShowTopHilite[cc][i] = true;
              }
            } else {
              // cup not lifted, show the empty box
              diceImageTopList[cc][i] = diceHiddenImageRef.current;
            }
          }
        } else {
          // shown dice in bottom box
          diceImageBottomList[cc][i] = diceImagesRef.current[value];
          if (ggc.bDiceHilite[cc][i]) {
            diceShowBottomHilite[cc][i] = true;
          }
        }
      }
    }
  }

  //--------------------------------------------------------
  // which background colors to use
  //--------------------------------------------------------
  const softGreen = 'rgb(204,255,204)';

  // default color
  let bgColor = (ggc.allConnectionStatus[cc] === CONN_PLAYER_OUT ? 'gray' : 'white');
  let lineColor = 'lightgray';

  // Palo fijo?
  if (ggc.IsPaloFijo(cc)) {
    bgColor = 'pink';
  }

  // ask in or out dlg
  if (ggc.bAskInOut) {
    if (ggc.inOutMustSay[cc] && !ggc.inOutDidSay[cc]) {
      bgColor = softGreen;
    }
    if (ggc.inOutMustSay[cc] && ggc.inOutDidSay[cc]) {
      bgColor = 'white';
    }
  }

  // lift cup dlg
  if (ggc.bDoubtInProgress && !ggc.bShowDoubtResult) {
    if (ggc.doubtMustLiftCup[cc] && !ggc.doubtDidLiftCup[cc]) {
      bgColor = softGreen;
    }
    if (ggc.doubtMustLiftCup[cc] && ggc.doubtDidLiftCup[cc]) {
      bgColor = 'white';
    }
  }

  // show doubt dlg
  if (ggc.bShowDoubtResult) {
    if (ggc.nextRoundMustSay[cc] && !ggc.nextRoundDidSay[cc]) {
      bgColor = softGreen;
    }
    if (ggc.nextRoundMustSay[cc] && ggc.nextRoundDidSay[cc]) {
      bgColor = 'white';
    }
  }
  // line color in background color
  switch (bgColor) {
    case 'white':
    case 'gray':
      lineColor = 'lightgray';
      break;
    case softGreen:
    case 'pink':
      lineColor = 'gray';
      break;
    default:
      lineColor = 'lightgray';
  }

  //--------------------------------------------------------
  // reactive font size based on length of name
  //--------------------------------------------------------
  //  for debugging
  //  const name = ggc.allParticipantNames[0];
  //  if (name.length == 2) {
  //    adjustedFontSize = Number(name) / 10;
  //  }

  const nameLen = ggc.allParticipantNames[cc].length;
  let adjustedFontSize = 0.9;
  if (nameLen <= 18) { adjustedFontSize = 1.0 }
  if (nameLen <= 5) { adjustedFontSize = 1.2 }


  //--------------------------------------------------------
  //  set up dice that were just shown to blink
  //--------------------------------------------------------
  let diceBlinkList = Array(5).fill(false);
  if (ggc.curRound !== null) {
    if (ggc.bGameInProgress && ggc.curRound.numBids > 0) {
      const lastBid = ggc.curRound.Bids[ggc.curRound.numBids - 1];
      if (lastBid.playerIndex === cc && lastBid.bShowShake) {
        for (let i = 0; i < 5; i++) {
          diceBlinkList[i] = lastBid.bWhichShown[i];
        }
      }
    }
  }

  //********************************************************
  //  function to shake cup (animation and sounds)
  //  howMany = 0 means all players roll dice
  //                    but only one player makes the sound
  //********************************************************
  function triggerCupShaking(howMany) {
    // start animation
    setCupShaking(true);

    // play the shake sound
    if (howMany === 0) {
      // if all players are shaking, only one plays the sound
      if (ggc.GetIndexFirstPlayerStillIn() === cc) {
        if (ShakeSoundArray[howMany]) {
          ShakeSoundArray[howMany].currentTime = 0;
          ShakeSoundArray[howMany].play();
          console.log(`triggerCupShaking: player sound of howMany=${howMany}`);
        }
      }
    } else {
      // if only this player is shaking, play the sound
      if (ShakeSoundArray[howMany]) { 
        ShakeSoundArray[howMany].currentTime = 0;
        ShakeSoundArray[howMany].play();
      }
    }

    setTimeout(() => {
      // stop the animation
      setCupShaking(false)

      if (howMany === 0) {
        if (ggc.GetIndexFirstPlayerStillIn() === cc) {
          // stop shake sound
          if (ShakeSoundArray[howMany]) { 
            ShakeSoundArray[howMany].pause();
            ShakeSoundArray[howMany].currentTime = 0;
          }
          // play the roll sound
          if (RollSoundArray[howMany]) {
            RollSoundArray[howMany].currentTime = 0;
            RollSoundArray[howMany].play();
          }
        }
      } else {
        // stop shake sound
        if (ShakeSoundArray[howMany]) {
          ShakeSoundArray[howMany].pause();
          ShakeSoundArray[howMany].currentTime = 0;
        }
        // play the roll sound
        if (RollSoundArray[howMany]) {
          RollSoundArray[howMany].currentTime = 0;
          RollSoundArray[howMany].play();
        }
      }
    }, SHAKE_CUPS_TIME);
  }
  //********************************************************
  //  function to shake sticks
  //********************************************************
  function triggerSticksBlinking() {
    console.log("triggerSticksBlinking - starting animation");
    setSticksBlinking(true);
    setTimeout(() => setSticksBlinking(false), STICKS_BLINK_TIME);
  }

  //********************************************************
  //  function to handle click - show bubble
  //********************************************************
  function handleClick() {
    // bail out if nothing to show
    if (!ggc.bGameInProgress || ggc.curRound === null) {
      setBubbleText('');
      setBubbleLines(1);
      setShowBubble(false);
      return;
    }

    let showText = '';
    setBubbleLines(1);
    if (ggc.allConnectionStatus[cc] === CONN_PLAYER_OUT) {
      showText = "I'm out.";
    }
    if (ggc.allConnectionStatus[cc] == CONN_PLAYER_IN) {
      // look for this player's last bid
      let bidText = '';
      for (let i = ggc.curRound.numBids - 1; i >= 0; i--) {
        let thisBid = ggc.curRound.Bids[i];
        if (thisBid.playerIndex === cc) {
          bidText = thisBid.text;
          if (thisBid.bShowShake) {
            bidText += (", showed " + thisBid.howManyShown);
          }
          if (thisBid.lookingFor !== undefined) {
            bidText += ("\n(looking for " + thisBid.lookingFor + ")");
            setBubbleLines(2);
          }
          break;
        }
      }
      if (bidText === '') {
        showText = "I have not bid yet this round.";
      } else {
        showText = "My last bid was: " + bidText;
      }
    }
    setBubbleText(showText);

    setShowBubble(!showBubble); // toggle on and off
    setTimeout(() => setShowBubble(false), BUBBLE_SHOW_TIME);   // disappear if left alone
  };


  //*****************************************************************
  //*****************************************************************
  //  render
  //*****************************************************************
  //*****************************************************************
  return (
    <div
      onClick={handleClick}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
  {showBubble && (
    <div
      style={{
        position: 'absolute',
        top: bubbleLines === 1 ? '-2.9rem' : '-4.3rem', 
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '0.375rem 0.75rem',
        backgroundColor: 'white',
        border: '1px solid gray',
        borderRadius: '0.75rem',
        fontSize: '1rem',
        whiteSpace: 'pre',
        display: 'inline-block',
        width: 'auto',
        maxWidth: 'none',
        minWidth: '0',
        textAlign: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        zIndex: 10,
      }}
    >
      {bubbleText}
      <div
        style={{
          position: 'absolute',
          bottom: '-0.50rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '0.375rem solid transparent',
          borderRight: '0.375rem solid transparent',
          borderTop: '0.50rem solid white',
        }}
      />
    </div>
      )}

      <div className="player-grid" ref={gridRef}>
        {/*--------------------------------------------------------
        Border box around rows 1 and 2 (cols 1–7)
      --------------------------------------------------------*/}
        <div
          style={{
            gridRow: '1 / span 2',
            gridColumn: '1 / span 7',
            padding: '0.25rem',
            boxSizing: 'border-box',
            border: ggc.bGameInProgress && cc === ggc.whosTurn ? '3px solid red' : '1px solid black',
            zIndex: 3,
          }}
        />

        {/*--------------------------------------------------------
        Cup (2x2)
      --------------------------------------------------------*/}
        <div style={{ gridRow: '1 / span 2', gridColumn: '1 / span 2', backgroundColor: bgColor }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: `1px solid ${lineColor}`,
            }}
          >
            <img
              src={(cupShaking ? cupUpImageRef.current : cupImageToShow).src}
              alt="Cup"
              className={cupShaking ? 'cup-shake' : ''}
              style={{
                width: '100%',  // don't stretch to 100%
                height: 'auto',
                objectFit: 'contain',
                padding: '2px',
                boxSizing: 'border-box',
                zIndex: 1,
              }}
            />
          </div>
        </div>

        {/*--------------------------------------------------------
        Player name (row 1, cols 3-7)
      --------------------------------------------------------*/}
        <div
          style={{
            gridRow: '1 / span 1',
            gridColumn: '3 / span 5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.25rem',
            boxSizing: 'border-box',
            border: `1px solid ${lineColor}`,
            backgroundColor: bgColor,
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              wordWrap: 'break-word',
              whiteSpace: 'normal',
              fontWeight: 'bold',
              fontSize: `${adjustedFontSize}em`,
              lineHeight: '1.1',
              width: '100%', // force wrapping within the parent box
            }}
          >
            {ggc.allParticipantNames[cc]}
          </div>
        </div>

        {/*--------------------------------------------------------
        Hidden dice in cells (2,3) to (2,7)
      --------------------------------------------------------*/}
        <div
          style={{
            gridRow: 2,
            gridColumn: '3 / span 5',
            backgroundColor: bgColor,
            padding: '0.25rem',
            boxSizing: 'border-box',
            zIndex: 1,
          }}
        />
        {/* Border-only overlay (higher z-index) */}
        <div
          style={{
            gridRow: 2,
            gridColumn: '3 / span 5',
            backgroundColor: 'transparent',
            border: `1px solid ${lineColor}`,
            padding: '0.25rem',
            boxSizing: 'border-box',
            zIndex: 2,
            position: 'relative',
            pointerEvents: 'none', // ensures it doesn’t block clicks
          }}
        />
        {diceImageTopList[cc].map((imgRef, index) => {
          if (!imgRef || cupShaking) return null;

          if ((diceBlinking || cupShaking) && !diceBlinkList[index]) return null;

          return (
            <div
              key={`dice-top-${index}`}
              style={{
                gridRow: 2,
                gridColumn: index + 3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: bgColor,
                zIndex: 1,
              }}
            >
              <img
                src={imgRef.src}
                alt={`Die ${index + 1}`}
                style={{
                  width: '80%',
                  height: 'auto', // <<< key fix: height is based on aspect ratio
                  aspectRatio: '1 / 1',
                  objectFit: 'contain',
                  display: 'block',
                  border: diceShowTopHilite[cc][index] ? '2px solid red' : 'none',
                  borderRadius: '0.25rem',
                }}
              />
            </div>
          );
        })}

        {/*--------------------------------------------------------
        Row 3, where shown dice go
      --------------------------------------------------------*/}
        <div
          style={{
            gridRow: 3,
            gridColumn: '1 / span 7',
            backgroundColor: 'transparent',
            zIndex: 0,
          }}
        />

        {/*--------------------------------------------------------
        Shown dice in cells (3,3) to (3,7)
      --------------------------------------------------------*/}
        {diceImageBottomList[cc].map((imgRef, index) => {
          if (!imgRef) return null; // skip nulls

          return (
            <div
              key={`dice-top-${index}`}
              style={{
                gridRow: 3,
                gridColumn: index + 3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'transparent',
                zIndex: 0
              }}
            >
              <img
                src={imgRef.src}
                alt={`Die ${index + 1}`}
                className={`${diceBlinking && diceBlinkList[index] ? 'show-dice' : ''}`}
                style={{
                  width: '80%',
                  height: 'auto', // <<< key fix: height is based on aspect ratio
                  aspectRatio: '1 / 1',
                  objectFit: 'contain',
                  display: 'block',
                  border: diceShowBottomHilite[cc][index] ? '2px solid red' : 'none',
                  borderRadius: '0.25rem',
                }}
              />
            </div>
          );
        })}

        {/*--------------------------------------------------------
        Stick image(s) in (3,1) and (3,2) if the player has them
      --------------------------------------------------------*/}
        {ggc.allSticks[cc] > 0 && (
          <div
            key="stick-1"
            style={{
              gridRow: 3,
              gridColumn: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'transparent',
              zIndex: 0,

            }}
          >
            <img
              src={stickImageRef.current.src}
              alt="Stick 1"
              className={sticksBlinking ? 'img-pulse' : ''}
              style={{
                width: '80%',
                height: 'auto',
                aspectRatio: '1 / 1',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        )}

        {ggc.allSticks[cc] > 1 && (
          <div
            key="stick-2"
            className={sticksBlinking ? 'img-pulse' : ''}
            style={{
              gridRow: 3,
              gridColumn: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'transparent',
              zIndex: 0,
            }}
          >
            <img
              src={stickImageRef.current.src}
              alt="Stick 2"
              style={{
                width: '80%',
                height: 'auto',
                aspectRatio: '1 / 1',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        )}
      </div>
      <audio ref={Shake10Ref} src="/sounds/Shake10.mp3" preload="auto" />
      <audio ref={Shake01Ref} src="/sounds/Shake01.mp3" preload="auto" />
      <audio ref={Shake02Ref} src="/sounds/Shake02.mp3" preload="auto" />
      <audio ref={Shake03Ref} src="/sounds/Shake03.mp3" preload="auto" />
      <audio ref={Shake04Ref} src="/sounds/Shake04.mp3" preload="auto" />

      <audio ref={Roll10Ref} src="/sounds/Roll10.mp3" preload="auto" />
      <audio ref={Roll01Ref} src="/sounds/Roll01.mp3" preload="auto" />
      <audio ref={Roll02Ref} src="/sounds/Roll02.mp3" preload="auto" />
      <audio ref={Roll03Ref} src="/sounds/Roll03.mp3" preload="auto" />
      <audio ref={Roll04Ref} src="/sounds/Roll04.mp3" preload="auto" />
    </div>

  );
}

export default PlayerGrid;
