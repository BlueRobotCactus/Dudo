import React, { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../SocketContext.js';
import { OkDlg } from '../Dialogs.js';

//************************************************************
// LandingPage function
//************************************************************
function LandingPage({ playerName, setPlayerName }) {
  const navigate = useNavigate();
  const { socket, connected } = useContext(SocketContext);

  const [lobbies, setLobbies] = useState([]);

  // auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState(''); // '', 'signin', 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // OkDlg
  const [showOkDlg, setShowOkDlg] = useState(false);
  const [okPosition, setOkPosition] = useState({ top: 200, left: 200 });
  const [okTitle, setOkTitle] = useState('');
  const [okMessage, setOkMessage] = useState('');
  const [onOkHandler, setOnOkHandler] = useState(() => () => {});

// *** ADDED ***
  // Join choice dialog state
  const [showJoinChoiceDlg, setShowJoinChoiceDlg] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState(null);

  const usernameRef = useRef(null);

  const showMessage = (title, message, onOk = null) => {
    setOkTitle(title);
    setOkMessage(message);
    setOnOkHandler(() => () => {
      setShowOkDlg(false);
      if (onOk) onOk();
    });
    setShowOkDlg(true);
  };

  //************************************************************
  // helper: reconnect socket after successful login/logout so
  // server-side socket session picks up the latest HTTP session
  //************************************************************
  const refreshSocketSession = () => {
    if (!socket) return;

    try {
      console.log('LandingPage: refreshing socket session');

      // disconnect old unauthenticated socket
      if (socket.connected) {
        socket.disconnect();
      }

      // reconnect so Socket.IO middleware re-reads session cookie
      socket.connect();
    } catch (err) {
      console.error('LandingPage: socket refresh failed:', err);
    }
  };

  //************************************************************
  // useEffect: check whether already logged in
  //************************************************************
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data.ok && data.player) {
          setLoggedIn(true);
          setPlayerName(data.player.username || '');

          // If page loads and user is already logged in, refresh socket too,
          // so socket session and HTTP session stay aligned.
          refreshSocketSession();
        } else {
          setLoggedIn(false);
          setPlayerName('');
        }
      } catch (err) {
        console.error('LandingPage: auth check failed:', err);
        if (!cancelled) {
          setLoggedIn(false);
          setPlayerName('');
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
    // *** CHANGED ***
    // include socket so helper uses current socket instance
  }, [setPlayerName, socket]);

  //************************************************************
  // useEffect: focus auth username box when auth mode opens
  //************************************************************
  useEffect(() => {
    if ((authMode === 'signin' || authMode === 'signup') && usernameRef.current) {
      usernameRef.current.focus();
      usernameRef.current.select();
    }
  }, [authMode]);

  //************************************************************
  // useEffect: load lobby list when socket connected
  //************************************************************
  useEffect(() => {
    if (!connected || !socket) {
      console.log('LandingPage: socket not connected yet');
      return;
    }

    console.log('LandingPage: socket is connected, setting up lobbies');

    fetch('/api/lobbies', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setLobbies(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    const handleLobbiesList = (updatedList) => {
      setLobbies(updatedList);
    };

    socket.on('lobbiesList', handleLobbiesList);

    return () => {
      socket.off('lobbiesList', handleLobbiesList);
    };
  }, [connected, socket]);

  //************************************************************
  // auth helpers
  //************************************************************
  const resetAuthForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSignIn = async () => {
    if (!username.trim() || !password) {
      showMessage('Sign In', 'Please enter both username and password.');
      return;
    }

    setAuthBusy(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        showMessage('Sign In', data.error || 'Sign in failed.');
        return;
      }

      setLoggedIn(true);
      setPlayerName(data.player.username);

      // *** CHANGED ***
      // Reconnect socket after successful login so server-side
      // createLobby/joinLobby sees socket.request.session.player
      refreshSocketSession();

      setAuthMode('');
      resetAuthForm();
    } catch (err) {
      console.error('LandingPage: sign in failed:', err);
      showMessage('Sign In', 'Unable to sign in right now.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (!username.trim() || !password || !confirmPassword) {
      showMessage('Sign Up', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Sign Up', 'Passwords do not match.');
      return;
    }

    setAuthBusy(true);

    try {
      const createRes = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok || !createData.ok) {
        showMessage('Sign Up', createData.error || 'Unable to create account.');
        return;
      }

      // auto-login after successful signup
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok || !loginData.ok) {
        showMessage(
          'Sign Up',
          'Account created, but auto sign-in failed. Please sign in manually.'
        );
        setAuthMode('signin');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      setLoggedIn(true);
      setPlayerName(loginData.player.username);

      // Reconnect socket after auto-login too
      refreshSocketSession();

      setAuthMode('');
      resetAuthForm();
    } catch (err) {
      console.error('LandingPage: sign up failed:', err);
      showMessage('Sign Up', 'Unable to create account right now.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        showMessage('Log Out', data.error || 'Logout failed.');
        return;
      }

      sessionStorage.removeItem('lobbyId');
      sessionStorage.removeItem('playerName');

      setLoggedIn(false);
      setPlayerName('');
      setAuthMode('');
      resetAuthForm();

      // Refresh socket after logout so server no longer sees
      // authenticated player on socket session
      refreshSocketSession();
    } catch (err) {
      console.error('LandingPage: logout failed:', err);
      showMessage('Log Out', 'Unable to log out right now.');
    }
  };

  const onAuthKeyDown = (event) => {
    if (event.key !== 'Enter') return;

    if (authMode === 'signin') {
      handleSignIn();
    } else if (authMode === 'signup') {
      handleSignUp();
    }
  };

  //************************************************************
  // Create lobby
  //************************************************************
  const onCreateLobby = () => {
    if (!connected || !socket) return;

    if (!loggedIn || !playerName) {
      showMessage('Create Lobby', 'Please sign in first.');
      return;
    }

    socket.emit('createLobby', playerName, (resp) => {
      if (!resp || resp.error) {
        showMessage('Create Lobby', resp?.error || 'Unable to create lobby.');
        return;
      }

      navigate(`/game/${resp.lobbyId}`, {
        state: { isHost: true, hostName: resp.hostName, playerName },
      });
    });
  };

  //************************************************************
  // On Join Lobby click
  //************************************************************
  // *** ADDED ***
  // open dialog instead of joining immediately
  const onJoinLobbyClick = (lobby) => {
    if (!connected || !socket) return;

    if (!loggedIn || !playerName) {
      showMessage('Join Lobby', 'Please sign in first.');
      return;
    }

    setSelectedLobby(lobby);
    setShowJoinChoiceDlg(true);
  };

  //************************************************************
  // Close JoinChoiceDlg
  //************************************************************
  // *** ADDED ***
  const closeJoinChoiceDlg = () => {
    setShowJoinChoiceDlg(false);
    setSelectedLobby(null);
  };

  //************************************************************
  // Join lobby
  //************************************************************
  // *** CHANGED ***
  // joinLobby now accepts observer/player mode

  const onJoinLobby = (lobbyId, joinAsObserver = false) => {
    if (!connected || !socket) return;

    if (!loggedIn || !playerName) {
      showMessage('Join Lobby', 'Please sign in first.');
      return;
    }

    socket.emit('joinLobby', { lobbyId, playerName, joinAsObserver }, (lobbyData) => {
      if (!lobbyData || lobbyData.error) {
        showMessage('Join Lobby', lobbyData?.error || 'Unable to join lobby.');
        return;
      }

      closeJoinChoiceDlg();

      navigate(`/game/${lobbyId}`, {
        state: { isHost: false, hostName: lobbyData.host, playerName, isObserver: joinAsObserver },
      });
    });
  };

  //************************************************************
  //  functions to handle Options menu
  //************************************************************
  const onOptHowToPlay = () => {
    navigate('/how-to-play');
  };

  const onOptAbout = () => {
    navigate('/about');
  };

  const onOptAdmin = () => {
    navigate('/admin');
  };

  const onOptHelp = () => {
  };

  // *** ADDED ***
  const selectedLobbyGameInProgress = !!selectedLobby?.gameInProgress;

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
      <nav className="navbar navbar-expand bg-primary text-white rounded px-0 py-1">
        <div className="container-fluid">
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
              <li>
                <button className="dropdown-item" disabled={true}>
                  Bid History
                </button>
              </li>
              <li>
                <button className="dropdown-item" disabled={true}>
                  Observers
                </button>
              </li>
              <li>
                <button className="dropdown-item" disabled={true}>
                  Game Settings
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={onOptHowToPlay}
                  disabled={!authChecked}
                >
                  How To Play
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={onOptAbout}
                  disabled={!authChecked}
                >
                  About
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={onOptAdmin}
                  disabled={!authChecked}
                >
                  Admin
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={onOptHelp}
                  disabled={true}
                >
                  Help
                </button>
              </li>
            </ul>
          </div>

          <div className="ms-auto d-flex align-items-center gap-2">
            {loggedIn ? (
              <>
                <span className="me-2">Signed in as <strong>{playerName}</strong></span>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </>
            ) : (
              <span>{connected ? 'Socket Connected' : 'Socket Not Connected'}</span>
            )}
          </div>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <h1>
          <span id="landing-page-welcome">Welcome to Dudo!</span>
        </h1>

        {!authChecked ? (
          <p>Checking sign-in status...</p>
        ) : !loggedIn ? (
          <div style={{ maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
            <p>Please sign in to play, or create a new account.</p>

            {authMode === '' && (
              <div className="d-flex justify-content-center gap-3 mt-3">
                <button
                  className="btn btn-primary"
                  onClick={() => setAuthMode('signin')}
                >
                  Sign In
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setAuthMode('signup')}
                >
                  Sign Up
                </button>
              </div>
            )}

            {(authMode === 'signin' || authMode === 'signup') && (
              <div className="mt-4 text-start">
                <label className="form-label">Username</label>
                <input
                  ref={usernameRef}
                  type="text"
                  className="form-control mb-3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onAuthKeyDown}
                  maxLength={30}
                  disabled={authBusy}
                />

                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control mb-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onAuthKeyDown}
                  disabled={authBusy}
                />

                {authMode === 'signup' && (
                  <>
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-control mb-3"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={onAuthKeyDown}
                      disabled={authBusy}
                    />
                  </>
                )}

                <div className="d-flex gap-2 justify-content-center mt-3">
                  <button
                    className="btn btn-primary"
                    onClick={authMode === 'signin' ? handleSignIn : handleSignUp}
                    disabled={authBusy}
                  >
                    {authBusy
                      ? 'Please wait...'
                      : authMode === 'signin'
                        ? 'Sign In'
                        : 'Create Account'}
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setAuthMode('');
                      resetAuthForm();
                    }}
                    disabled={authBusy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <p>Join a lobby, or create your own.</p>

            <div className="mb-3">
              <button
                className="btn btn-primary"
                onClick={onCreateLobby}
                disabled={!connected}
              >
                Create Lobby
              </button>
            </div>

            <h2>Available Lobbies</h2>
            {lobbies.length === 0 && <p>No lobbies yet</p>}
            <ul>
              {lobbies.map((lobby) => (
                <li key={lobby.id}>
                  <strong>{lobby.host}</strong>'s lobby ({lobby.playerCount} players)
                  &nbsp;
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onJoinLobbyClick(lobby)}
                    disabled={!connected}
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

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

      {/* *** ADDED *** Join choice dialog */}
      {showJoinChoiceDlg && selectedLobby && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4000,
          }}
          onClick={closeJoinChoiceDlg}
        >
          <div
            style={{
              position: 'relative',
              width: '360px',
              maxWidth: '90vw',
              backgroundColor: 'white',
              border: '1px solid #888',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              padding: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeJoinChoiceDlg}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '8px',
                right: '10px',
                border: 'none',
                background: 'transparent',
                fontSize: '22px',
                lineHeight: '22px',
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <h4 style={{ marginBottom: '12px' }}>Join Lobby</h4>

            <p style={{ marginBottom: '18px' }}>
              How would you like to join <strong>{selectedLobby.host}</strong>'s lobby?
            </p>

            <div className="d-grid gap-2">
              <button
                className="btn btn-primary"
                onClick={() => onJoinLobby(selectedLobby.id, false)}
                disabled={!connected || selectedLobbyGameInProgress}
                title={
                  selectedLobbyGameInProgress
                    ? 'Cannot join as player once the game has started.'
                    : ''
                }
              >
                Join as player
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => onJoinLobby(selectedLobby.id, true)}
                disabled={!connected}
              >
                Join as observer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;