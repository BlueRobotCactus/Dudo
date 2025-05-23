'use strict';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';                       // your own custom styles
import 'bootstrap/dist/css/bootstrap.min.css';  // Bootstrap styles

import { SocketProvider } from './SocketContext';   // ① import it
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <SocketProvider>        {/* ② wrap everything */}
      <App />
    </SocketProvider>
  </React.StrictMode>
);

reportWebVitals();
