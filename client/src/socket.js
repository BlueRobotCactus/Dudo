// client/src/socket.js
import { io } from 'socket.io-client';

// Create ONE socket instance
const socket = io('http://localhost:5000');

export default socket;
