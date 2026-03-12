import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

//-----------------------------------
// format date and time
//-----------------------------------
function formatDateTimeLocal(ts) {
  const d = new Date(ts);

  const date = d.toLocaleDateString('sv-SE');   // YYYY-MM-DD format
  const time = d.toLocaleTimeString('en-GB', { hour12: false });

  return `${date} / ${time}`;
}

//-----------------------------------
// show GUID
//-----------------------------------
const handleShowGuid = (guid, username) => {
  window.prompt(`GUID for ${username}:`, guid);
};

//************************************************************
// AdminPage function
//************************************************************
export default function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const lobbyId = location.state?.lobbyId;

  const [players, setPlayers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const loadPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      const data = await res.json();

      if (data.ok) {
        setPlayers(data.players);
      } else {
        console.error('Failed to load players:', data.error);
      }
    } catch (err) {
      console.error('Failed to load players:', err);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  //-----------------------------------
  // delete a player
  //-----------------------------------
  const handleDelete = async (id, username) => {
    const ok = window.confirm(`Delete player "${username}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/players/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.ok) {
        setPlayers(prev => prev.filter(p => p.id !== id));
        setStatusMsg(`Deleted player "${username}"`);
      } else {
        alert(`Delete failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed.');
    }
  };

  //-----------------------------------
  // add a player
  //-----------------------------------
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setStatusMsg('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setStatusMsg('Username and password are required.');
      return;
    }

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setNewUsername('');
        setNewPassword('');
        setStatusMsg(`Added player "${data.player.username}"`);
        loadPlayers();
      } else {
        setStatusMsg(`Add failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Add player failed:', err);
      setStatusMsg('Add failed.');
    }
  };

  //-----------------------------------
  // reset a password
  //-----------------------------------
  const handleResetPassword = async (id, username) => {
    const newPassword = window.prompt(`Enter new password for "${username}"`);

    if (newPassword === null) return; // user cancelled

    if (!newPassword.trim()) {
      alert('Password cannot be blank.');
      return;
    }

    try {
      const res = await fetch(`/api/players/${id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setStatusMsg(`Password reset for "${username}"`);
      } else {
        alert(`Reset password failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Reset password failed:', err);
      alert('Reset password failed.');
    }
  };

  const handleClose = () => {
    if (lobbyId) {
      navigate(`/game/${lobbyId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ position: 'relative', padding: '20px' }}>
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
        aria-label="Close"
      >
        ×
      </button>

      <h1>Admin Page</h1>

      <h2>Add Player</h2>

      <form onSubmit={handleAddPlayer} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Username:{' '}
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Password:{' '}
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        </div>

        <button type="submit">Add Player</button>
      </form>

      {statusMsg && (
        <p style={{ fontWeight: 'bold' }}>
          {statusMsg}
        </p>
      )}

      <h2>Players</h2>

      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>When created</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.username}</td>
              <td>{formatDateTimeLocal(p.created_at)}</td>
              <td>
                <button onClick={() => handleResetPassword(p.id, p.username)}>
                  Reset PW
                </button>{' '}
                <button onClick={() => handleShowGuid(p.guid, p.username)}>
                  GUID
                </button>
                <button onClick={() => handleDelete(p.id, p.username)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}