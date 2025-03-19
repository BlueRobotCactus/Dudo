import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function EnterNamePage({ onNameSubmitted }) {
  const [name, setName] = useState('');
  const canvasRef = useRef(null);
  const inputRef = useRef(null); // Reference to input field
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-focus on input field when the component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    //ctx.fillStyle = 'black';
    //ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    //ctx.fillStyle = 'white';
    //ctx.font = '20px Arial';
    //ctx.fillText('Enter Name:', 20, 50);
    //ctx.fillText(name, 20, 80);
  }, [name]); // Redraw when name changes

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Please enter a valid name.');
      return;
    }
    onNameSubmitted(name);
    navigate('/'); // Navigate to home page
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSubmit(); // Trigger submit on Enter key
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <canvas ref={canvasRef} width={400} height={200} style={{ border: '1px solid white' }} />
      <br />
      <input
        ref={inputRef} // Attach ref to input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown} // Listen for Enter key
        placeholder="Enter your name"
        style={{ marginTop: '10px', padding: '5px', fontSize: '16px' }}
      />
      <br />
      <button onClick={handleSubmit} style={{ marginTop: '10px', padding: '10px', fontSize: '16px' }}>
        Continue
      </button>
    </div>
  );
}

export default EnterNamePage;
