// client/src/socket.js
import { io } from 'socket.io-client';

// Create ONE socket instance
const socket = io(process.env.REACT_APP_SERVER_URL);

export default socket;
