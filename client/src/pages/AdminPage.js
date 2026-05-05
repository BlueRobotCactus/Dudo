import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import "./AdminPage.css";

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
  const [guidModal, setGuidModal] = useState(null);
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
      if (!res.ok) { throw new Error('Network error'); }
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
  const handleDelete = async (guid, username) => {
    const ok = window.confirm(`Delete player "${username}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/players/${guid}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.ok) {
        setPlayers(prev => prev.filter(p => p.guid !== guid));
        setStatusMsg(`Deleted player "${username}"`);
        setTimeout(() => setStatusMsg(''), 3000);
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

    const username = newUsername.trim();
    const password = newPassword.trim();

    if (!username || !password) {
      alert("Username and password are required");
      return;
    }

    if (username.length > 30) {
      alert("Username cannot exceed 30 characters");
      return;
    }

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.ok) {
      setNewUsername("");
      setNewPassword("");
      loadPlayers();
    } else {
      alert(data.error || "Failed to add player");
    }
  };

  //-----------------------------------
  // reset a password
  //-----------------------------------
  const handleResetPassword = async (guid, username) => {
    const newPassword = window.prompt(`Enter new password for "${username}"`);

    if (newPassword === null) return; // user cancelled

    if (!newPassword.trim()) {
      alert('Password cannot be blank.');
      return;
    }

    try {
      const res = await fetch(`/api/players/${guid}/password`, {
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
        setTimeout(() => setStatusMsg(''), 3000);
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

  //************************************************************
  // rendering
  //************************************************************
  return (
    <div className="admin-container">
      <nav className="navbar navbar-expand bg-primary text-white rounded mb-3">
        <div className="container-fluid">

          <span className="text-white mb-0 h5">
            Admin Page
          </span>

          <button
            onClick={handleClose}
            className="btn btn-primary border border-white btn-sm"
          >
            Close
          </button>

        </div>
      </nav>


      <h2>Add Player</h2>

      <form onSubmit={handleAddPlayer} autoComplete="off">

        <div className="admin-form-row">
          <label className="admin-form-label">Username:</label>
          <input
            className="admin-input"
            type="text"
            value={newUsername}
            maxLength={30}
            autoComplete="off"
            onChange={(e) => setNewUsername(e.target.value)}
          />
        </div>

        <div className="admin-form-row">
          <label className="admin-form-label">Password:</label>
          <input
            className="admin-input"
            type="password"
            value={newPassword}
            autoComplete="new-password"
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" type="submit">
          Add Player
        </button>

      </form>
      {statusMsg && (
        <p style={{ fontWeight: 'bold' }}>
          {statusMsg}
        </p>
      )}

      <h2>Players</h2>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>When created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {players.map((p) => (
              <tr key={p.guid}>
                <td>{p.username}</td>
                <td>{p.created_at ? formatDateTimeLocal(p.created_at) : ''}</td>
                <td>
                  <button
                    className="btn btn-primary btn-sm me-2"
                    onClick={() => handleResetPassword(p.guid, p.username)}
                  >
                    Reset Password
                  </button>
                  <button
                    className="btn btn-primary btn-sm me-2"
                    onClick={() => setGuidModal({ guid: p.guid, username: p.username })}
                  >
                    GUID
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(p.guid, p.username)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {guidModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              minWidth: "400px"
            }}
          >
            <h3>GUID for {guidModal.username}</h3>

            <input
              type="text"
              value={guidModal.guid}
              readOnly
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <button
              className="btn btn-primary btn-sm me-2"
              onClick={() => navigator.clipboard.writeText(guidModal.guid)}
            >
              Copy
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setGuidModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}