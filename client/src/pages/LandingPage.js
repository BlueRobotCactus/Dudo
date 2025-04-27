import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { SocketContext } from '../SocketContext.js';

function LandingPage({ playerName }) {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState([]);

  // get our socket id
  const { socket, connected } = useContext(SocketContext);
  
  // Fetch the lobbies once the component mounts
  useEffect(() => {
    if (!connected) {
      console.log("LandingPage: socket not connected yet");
      return;
    }
  
    console.log("LandingPage: socket is connected, setting up lobbies");
  
    fetch('/api/lobbies')
      .then((res) => res.json())
      .then((data) => setLobbies(data))
      .catch((err) => console.error(err));
  
    socket.on('lobbiesList', (updatedList) => {
      setLobbies(updatedList);
    });
  
    return () => {
      socket.off('lobbiesList');
    };
  }, [connected, socket]);
  
  const handleCreateLobby = () => {
    if (!connected) return;
    
    if (!playerName) {
      alert('No player name found.');
      return;
    }
    socket.emit('createLobby', playerName, ({ lobbyId, hostName }) => {
      // If successful, navigate to the new lobby
      navigate(`/lobby/${lobbyId}`, {
        state: { isHost: true, hostName, playerName },
      });
    });
  };

  const handleJoinLobby = (lobbyId) => {
    if (!playerName) {
      alert('No player name found.');
      return;
    }
    socket.emit('joinLobby', { lobbyId, playerName }, (lobbyData) => {
      if (lobbyData.error) {
        alert(lobbyData.error);
      } else {
        // Navigate to the joined lobby
        navigate(`/lobby/${lobbyId}`, {
          state: { isHost: false, hostName: lobbyData.host, playerName },
        });
      }
    });
  };

  const handleChangeName = () => {
    // Clear out the saved name
    localStorage.removeItem('playerName');
    // Optionally, if you track playerName in state in App.js,
    // you can also call setPlayerName('') there.
    // Then navigate the user to the EnterName page to pick a new name.
    navigate('/enter-name');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>
        <span id="landing-page-welcome">Welcome, {playerName}!</span>
        <button onClick={handleChangeName}>Change Name</button>
      </h1>

      <button onClick={handleCreateLobby} disabled={!connected}>
        Create Lobby
      </button>

      <h2>Available Lobbies (v2)</h2>
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
