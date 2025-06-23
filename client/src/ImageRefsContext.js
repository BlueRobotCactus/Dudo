import React, { createContext, useRef, useEffect, useState } from 'react';

export const ImageRefsContext = createContext(null);

export function ImageRefsProvider({ children }) {
  const cupDownImageRef = useRef(null);
  const cupUpImageRef = useRef(null);
  const diceImagesRef = useRef({});
  const diceHiddenImageRef = useRef({});
  const stickImageRef = useRef({});
  const directionLeftImageRef = useRef(null);
  const directionRightImageRef = useRef(null);
  
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    console.log("ImageRefsContext: useEffect: LOAD IMAGES");

    let loaded = 0;
    const totalToLoad = 12;
    const diceImgs = {};

    const checkIfDone = () => {
      loaded++;
      console.log(`Image loaded: ${loaded}/${totalToLoad}`);
      if (loaded === totalToLoad) {
        diceImagesRef.current = diceImgs;
        setImagesReady(true);
        console.log("ImageRefsContext: All images loaded");
      }
    };

    const imgCupDown = new Image();
    imgCupDown.src = '/images/CupDown.png';
    imgCupDown.onload = () => { cupDownImageRef.current = imgCupDown; checkIfDone(); };
    imgCupDown.onerror = (e) => console.error("Failed to load CupDown.png", e);

    const imgCupUp = new Image();
    imgCupUp.src = '/images/CupUp.png';
    imgCupUp.onload = () => { cupUpImageRef.current = imgCupUp; checkIfDone(); };
    imgCupUp.onerror = (e) => console.error("Failed to load CupUp.png", e);

    for (let i = 1; i <= 6; i++) {
      const imgDice = new Image();
      imgDice.src = `/images/Dice${i}.jpg`;
      imgDice.onload = () => { diceImgs[i] = imgDice; checkIfDone(); };
      imgDice.onerror = (e) => console.error(`Failed to load Dice${i}.jpg`, e);
    }

    const imgDiceHidden = new Image();
    imgDiceHidden.src = '/images/DiceHidden.jpg';
    imgDiceHidden.onload = () => { diceHiddenImageRef.current = imgDiceHidden; checkIfDone(); };
    imgDiceHidden.onerror = (e) => console.error("Failed to load DiceHidden.jpg", e);

    const imgStick = new Image();
    imgStick.src = '/images/Stick.jpg';
    imgStick.onload = () => { stickImageRef.current = imgStick; checkIfDone(); };
    imgStick.onerror = (e) => console.error("Failed to load Stick.jpg", e);

    const imgDirectionLeft = new Image();
    imgDirectionLeft.src = '/images/DirectionLeft.png';
    imgDirectionLeft.onload = () => { directionLeftImageRef.current = imgDirectionLeft; checkIfDone(); };
    imgDirectionLeft.onerror = (e) => console.error("Failed to load DirectionLeft.jpg", e);

    const imgDirectionRight = new Image();
    imgDirectionRight.src = '/images/DirectionRight.png';
    imgDirectionRight.onload = () => { directionRightImageRef.current = imgDirectionRight; checkIfDone(); };
    imgDirectionRight.onerror = (e) => console.error("Failed to load DirectionRight.jpg", e);

  }, []);

  return (
    <ImageRefsContext.Provider value={{
      cupDownImageRef,
      cupUpImageRef,
      diceImagesRef,
      diceHiddenImageRef,
      stickImageRef,
      directionLeftImageRef,
      directionRightImageRef,
      imagesReady,
    }}>
      {children}
    </ImageRefsContext.Provider>
  );
}
