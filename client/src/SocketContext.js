'use strict';

import { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext({
  socket: null,
  socketId: null,
  connected: false,
});

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('connect', () => {
      setSocketId(s.id);
      setConnected(true);
      console.log('SocketContext: socket connected:', s.id);
    });

    s.on('yourSocketId', (id) => {
      setSocketId(id);
    });

    s.on('disconnect', () => {
      setConnected(false);
      setSocketId(null);
      console.log('SocketContext: socket disconnected');
    });

    return () => {
      s.off('connect');
      s.off('yourSocketId');
      s.off('disconnect');
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, socketId, connected }}>
      {children}
    </SocketContext.Provider>
  );
}