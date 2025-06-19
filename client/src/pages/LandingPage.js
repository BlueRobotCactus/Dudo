import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { SocketContext } from '../SocketContext.js';
import { OkDlg } from '../Dialogs.js';


//************************************************************
// LandingPage function
//************************************************************
function LandingPage({ playerName, setPlayerName }) {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState([]);

  const { socket, connected } = useContext(SocketContext);

  // OkDlg
  const [showOkDlg, setShowOkDlg] = useState(false);
  const [okPosition, setOkPosition] = useState({ top: 200, left: 200 });
  const [okTitle, setOkTitle] = useState('');
  const [okMessage, setOkMessage] = useState('');
  const [onOkHandler, setOnOkHandler] = useState(() => () => {});

  // for input name
  //const [askName, setAskName] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef(null); // Reference to input field
  const isAskingName = (playerName === '');

//************************************************************
// useEffect:  put focus on input, if as need to ask name
//             Trigger:  playerName
//************************************************************
useEffect(() => {
  if (playerName === '' && inputRef.current) {
    inputRef.current.focus();
    inputRef.current.select();
  }
}, [playerName]);


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

  // set focus to name input if name is blank
  if (playerName == '') {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  //-------------------------------------------
  // Fetch the lobbies once the component mounts
  //-------------------------------------------
  fetch('/api/lobbies')
      .then((res) => res.json())
      .then((data) => setLobbies(data))
      .catch((err) => console.error(err));
  
    socket.on('lobbiesList', (updatedList) => {

      console.log ("RECEIVED LOBBIESLIST FROM SERVER");

      setLobbies(updatedList);
    });
  
    return () => {
      socket.off('lobbiesList');
    };
  }, [connected, socket]);
  
  //-------------------------------------------
  // Create lobby
  //-------------------------------------------
  const onCreateLobby = () => {
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
  const onJoinLobby = (lobbyId) => {
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
  // Change name button handler
  //-------------------------------------------
  const onChangeName = () => {
    setName(playerName);  // pre-fill for the UI
    setPlayerName('');
    localStorage.removeItem('playerName');
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  //-------------------------------------------
  // Change name: Process keystroke
  //-------------------------------------------
  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleChangeName(); // Trigger submit on Enter key
    }
  };

  //-------------------------------------------
  // Change name 
  //-------------------------------------------
  const handleChangeName = () => {

    if (name.trim() !== '') {
      socket.emit('checkNameExists', name.trim(), (exists) => {

      if (exists) {
        // somebody with this name already in some lobby
        setOkMessage("This name is already taken.\nPress OK then choose another one.");
        setOkTitle("Change Name");
        setOnOkHandler(() => () => {
          setShowOkDlg(false);
        });
        setShowOkDlg(true);
      } else {
        setPlayerName(name.trim());
        localStorage.setItem('playerName', name.trim());
      }
    });
   }
  };

  //************************************************************
  //  functions to handle Options menu
  //************************************************************
  const onOptHowToPlay = () => {
    navigate('/how-to-play');
  }

  const onOptAbout = () => {
    navigate('/about');
  }

  const onOptHelp = () => {
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
              disabled={true}
            >
              Bid History</button></li> 
            <li><button className="dropdown-item" 
              disabled={true}
            >
              Observers</button></li>          
            <li><button className="dropdown-item" 
              disabled={true}
            >
              Game Settings</button></li>          
            <li><button className="dropdown-item" 
              onClick={onOptHowToPlay}
              disabled={isAskingName}
            >
              How To Play</button></li>          
            <li><button className="dropdown-item" 
              disabled={isAskingName}
              onClick={onOptAbout}
            >
              About</button></li>          
            <li><button className="dropdown-item" 
              disabled={isAskingName}
              onClick={onOptHelp}
            >
              Help</button></li>          
          </ul>
        </div>

        {/* Other buttons */}
        <>
        <button
          onClick={onCreateLobby}
          disabled={isAskingName }
          className="btn btn-primary btn-outline-light btn-sm"
        >
          Create Lobby
        </button>
        <button
          onClick={onChangeName}
          disabled={isAskingName}
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

        {isAskingName ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <input
              ref={inputRef} // Attach ref to input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKeyDown} // Listen for Enter key
              placeholder="Enter your name"
              maxLength={30}
              style={{ marginTop: '10px', padding: '5px', fontSize: '16px' }}
            />
            <br />
            <button 
              className="btn btn-primary btn-sm mt-3"
              onClick={handleChangeName}>
              Continue
            </button>
          </div>
        ) : (
          <>
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
                      onClick={() => onJoinLobby(lobby.id)}>
                      Join
                    </button>
                  </li>
                ))}
              </ul>
          </>
        )}
      </div>

    {/*-------------------------------------------------------------------
      DIALOGS
    --------------------------------------------------------------------*/}
      {showOkDlg && (
        <OkDlg
          open={showOkDlg}
          position={okPosition}
          setPosition={setOkPosition}          
          title={okTitle}
          message={okMessage}
          onOk={onOkHandler}
        />
      )}
    </div>
  );
}

export default LandingPage;
