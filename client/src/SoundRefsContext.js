import React, { createContext, useRef, useEffect, useState } from 'react';

export const SoundRefsContext = createContext();

export function SoundRefsProvider({ children }) {
  // Create refs for each sound
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

  const [soundsReady, setSoundsReady] = useState(false);

  useEffect(() => {
    console.log("SoundRefsContext: useEffect: waiting for all audio to load");

    const audioRefs = [
      Shake10Ref, Shake01Ref, Shake02Ref, Shake03Ref, Shake04Ref,
      Roll10Ref, Roll01Ref, Roll02Ref, Roll03Ref, Roll04Ref, 
    ];

    let loaded = 0;

    const onLoad = () => {
      loaded++;
      if (loaded === audioRefs.length) {
        setSoundsReady(true);
        console.log("SoundRefsContext: All sounds loaded");
      }
    };

    audioRefs.forEach(ref => {
      const audio = ref.current;
      if (audio) {
        audio.addEventListener('canplaythrough', onLoad, { once: true });
        audio.load(); // force load in some browsers
      }
    });

    return () => {
      audioRefs.forEach(ref => {
        ref.current?.removeEventListener('canplaythrough', onLoad);
      });
    };
  }, []);

  // Grouped arrays for easy use
  const ShakeRefs = [Shake10Ref, Shake01Ref, Shake02Ref, Shake03Ref, Shake04Ref];
  const RollRefs = [Roll10Ref, Roll01Ref, Roll02Ref, Roll03Ref, Roll04Ref];

  return (
    <SoundRefsContext.Provider value={{ ShakeRefs, RollRefs, soundsReady }}>
      <>
        {/* Preload all audio elements */}
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

        {children}
      </>
    </SoundRefsContext.Provider>
  );
}
