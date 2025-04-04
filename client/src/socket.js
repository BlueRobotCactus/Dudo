// client/src/socket.js
import { io } from 'socket.io-client';

// Create ONE socket instance
const socket = io();

// Global listener for yourSocketId
socket.on("yourSocketId", (id) => {
    console.log("socket.js: received socket ID from server:", id);
  
    // Optional: store it somewhere accessible
    window.mySocketId = id; // not ideal, but works in a pinch
  });

export default socket;
