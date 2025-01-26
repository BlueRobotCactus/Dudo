import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function EnterNamePage({ onNameSubmitted }) {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a valid name.');
      return;
    }

    onNameSubmitted(name);
    navigate('/'); // Return to home once name is set
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Enter Your Name</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="e.g. Alice"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">Continue</button>
      </form>
    </div>
  );
}

export default EnterNamePage;
