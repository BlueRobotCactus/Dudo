import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { SocketContext } from '../SocketContext.js';

function LandingPage({ playerName }) {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState([]);

  const { socket, connected } = useContext(SocketContext);
  
//************************************************************
// useEffect:  handle landing page stuff
//             Trigger:  <none>
//************************************************************
useEffect(() => {
    if (!connected) {
      console.log("LandingPage: socket not connected yet");
      return;
    }
  
    console.log("LandingPage: socket is connected, setting up lobbies");
  
  //-------------------------------------------
  // Fetch the lobbies once the component mounts
  //-------------------------------------------
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
  
  //-------------------------------------------
  // Create lobby
  //-------------------------------------------
  const handleCreateLobby = () => {
    if (!connected) return;
    
    if (!playerName) {
      alert('No player name found.');
      return;
    }
    socket.emit('createLobby', playerName, ({ lobbyId, hostName }) => {
      // If successful, navigate to the new lobby
      navigate(`/game/${lobbyId}`, {
        state: { isHost: true, hostName, playerName },
      });
    });
  };

  //-------------------------------------------
  // Join lobby
  //-------------------------------------------
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
        navigate(`/game/${lobbyId}`, {
          state: { isHost: false, hostName: lobbyData.host, playerName },
        });
      }
    });
  };

  //-------------------------------------------
  // Change name
  //-------------------------------------------
  const handleChangeName = () => {
    // Clear out the saved name
    localStorage.removeItem('playerName');
    // Optionally, if you track playerName in state in App.js,
    // you can also call setPlayerName('') there.
    // Then navigate the user to the EnterName page to pick a new name.
    navigate('/enter-name');
  };

  //************************************************************
  //  functions to handle Options menu
  //************************************************************
  const handleOptBidHistory = () => {

  }
  const handleOptObservers = () => {

  }
  const handleOptHowToPlay = () => {

  }
  const handleOptAbout = () => {

  }
  const handleOptHelp = () => {

  }

  //************************************************************
  //  Render
  //************************************************************
  return (
    <div
      className="container mx-auto"
      style={{
        maxWidth: '100%',
        position: 'relative',
        padding: '10px',
        backgroundColor: 'white',
      }}
    >
    
    {/*-------------------------------------------------------------------
      Navigation bar
    --------------------------------------------------------------------*/}
      <nav className="navbar navbar-expand bg-primary text-white rounded px-0 py-1">
        <div className="container-fluid">

        {/* Dropdown Menu */}
        <div className="dropdown me-3">
          <button
            className="btn btn-primary dropdown-toggle"
            type="button"
            id="optionsMenu"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            Options
          </button>
          <ul className="dropdown-menu" aria-labelledby="optionsMenu">
            <li><button className="dropdown-item" 
              onClick={handleOptHowToPlay}
            >
              How To Play</button></li>          
            <li><button className="dropdown-item" 
              onClick={handleOptAbout}
            >
              About</button></li>          
            <li><button className="dropdown-item" 
              onClick={handleOptHelp}
            >
              Help</button></li>          
          </ul>
        </div>

        {/* Other buttons */}
        <>
        <button
          onClick={handleCreateLobby}
          className="btn btn-primary btn-outline-light btn-sm"
        >
          Create Lobby
        </button>
        <button
          onClick={handleChangeName}
          className="btn btn-primary btn-outline-light btn-sm"
        >
          Change Name
        </button>
        </>
        </div>
      </nav>

      {/*-------------------------------------------------------------------
        Row 1: Player name
      --------------------------------------------------------------------*/}
      <div className="row mb-2 my-2">
        <div className="col">
        <div className="border border-primary rounded p-1 d-flex justify-content-center align-items-center"> 
            <div className="fw-bold text-center">
              Your Name: {playerName}
            </div>
          </div>
        </div>
      </div>



      {/* Existing Page Content */}
      <div style={{ padding: '20px' }}>
        <h1>
          <span id="landing-page-welcome">Welcome to Dudo!</span>
        </h1>
        <p>Join a lobby, or create your own</p>

        <h2>Available Lobbies</h2>
        {lobbies.length === 0 && <p>No lobbies yet</p>}

        <ul>
          {lobbies.map((lobby) => (
            <li key={lobby.id}>
              <strong>{lobby.host}</strong>'s lobby ({lobby.playerCount} players)
              &nbsp;
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => handleJoinLobby(lobby.id)}>
                Join
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default LandingPage;
