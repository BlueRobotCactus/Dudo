import React, { useState, useEffect, useRef, } from 'react';
import { useContext } from 'react';

import './PlayerGrid.css';
import './GamePage.js'
import { ImageRefsContext } from '../ImageRefsContext.js';


export function PlayerGrid() {
  const {
  cupDownImageRef,
  cupUpImageRef,
  diceImagesRef,
  diceHiddenImageRef,
  stickImageRef,
  imagesReady
} = useContext(ImageRefsContext);

  if (!imagesReady) {
    return <div>Loading images...</div>;
  }

console.log("cupDownImageRef.current:", cupDownImageRef.current);

  return (
    <div>
      <div>
        Hello, world
      </div>
      <div>
        <img src={cupDownImageRef.current.src} width="100" />        
      </div>
    </div>
  )
}

export default PlayerGrid;
