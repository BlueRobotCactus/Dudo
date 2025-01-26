import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket'; // the shared socket instance

function LandingPage() {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    // On mount, fetch list of lobbies
    fetch('http://localhost:5000/api/lobbies')
      .then(res => res.json())
      .then(data => {
        setLobbies(data);
      })
      .catch(err => console.error(err));

    // Listen for updated lobbiesList from server
    socket.on('lobbiesList', (updatedList) => {
      setLobbies(updatedList);
    });

    return () => {
      socket.off('lobbiesList');
    };
  }, []);

  const handleCreateLobby = () => {
    if (!name) {
      alert('Please enter a name first.');
      return;
    }
    socket.emit('createLobby', name, ({ lobbyId, hostName }) => {
      // Navigate to that lobby
      navigate(`/lobby/${lobbyId}`, { state: { isHost: true, hostName } });
    });
  };

  const handleJoinLobby = (lobbyId) => {
    if (!name) {
      alert('Please enter a name first.');
      return;
    }
    socket.emit('joinLobby', { lobbyId, playerName: name }, (lobbyData) => {
      if (lobbyData.error) {
        alert(lobbyData.error);
      } else {
        // Move user to that lobby page
        navigate(`/lobby/${lobbyId}`, { state: { isHost: false, hostName: lobbyData.host } });
      }
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Landing Page</h1>
      <div>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <button onClick={handleCreateLobby}>Create Lobby</button>

      <h2>Available Lobbies</h2>
      {lobbies.length === 0 && <p>No lobbies yet</p>}
      <ul>
        {lobbies.map((lobby) => (
          <li key={lobby.id}>
            <strong>{lobby.host}</strong>'s lobby ({lobby.playerCount} players)
            &nbsp;
            <button onClick={() => handleJoinLobby(lobby.id)}>Join</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LandingPage;
