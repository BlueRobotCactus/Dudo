// client/src/SocketContext.js
'use strict';

import { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext({
  socket:    null,
  socketId:  null,
  connected: false,
});

export function SocketProvider({ children }) {
  const [socket,     setSocket]     = useState(null);
  const [socketId,   setSocketId]   = useState(null);
  const [connected,  setConnected]  = useState(false);

  useEffect(() => {
    const s = io();          // ① create the connection
    setSocket(s);            //    store reference immediately

    s.on('connect', () => {  // ② when handshake completes
      setSocketId(s.id);
      setConnected(true);    //    flip the boolean → re-render!
      console.log('SocketContext: socket connected:', s.id);
    });

    s.on('yourSocketId', (id) => {   // optional;
      setSocketId(id);               // keep in sync with server
    });

    s.on('disconnect', () => {
      setConnected(false);           // ③ re-render on disconnect
      console.log('SocketContext: socket disconnected');
    });

    return () => s.disconnect();     // cleanup
  }, []);

  return (
    <SocketContext.Provider value={{ socket, socketId, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
