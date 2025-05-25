import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../services/api';

export function HomePage() {
  const [sessionName, setSessionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleCreateSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await createSession(sessionName.trim() || null);
      navigate(`/session/${newSession.sessionId}`);
    } catch (err) {
      setError(err.message || 'Failed to create session. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>🎬 Film Night Decider 🎬</h1>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ fontSize: '1.1rem', color: '#e0e0e0' }}>
          Tired of endless "What should we watch?" debates? <br />
          Let's make choosing a movie fun and democratic!
        </p>
      </div>

      <div style={{ backgroundColor: '#424750', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2>How It Works:</h2>
        <ol style={{ paddingLeft: '20px', color: '#d0d0d0' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong>Start a Session:</strong> Give your film night a name (optional) and hit "Start New Film Night!".</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>Share the Link:</strong> Copy the unique session link and send it to your friends.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>Suggest Movies:</strong> Everyone can add movie suggestions by pasting a URL (we'll try to grab the details!) or entering them manually.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>Rank 'Em Up:</strong> Compare movies side-by-side and pick your preference. Each person votes on their own pairs.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>See the Winner:</strong> A ranked list appears, updated in real-time, showing which movies are most popular based on everyone's votes.</li>
        </ol>
      </div>

      <h2>Create a New Film Night</h2>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
        <input
          type="text"
          placeholder="Optional: Name your session (e.g., Horror Movie Night)"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          disabled={isLoading}
          style={{ width: '100%', maxWidth: '500px' }}
        />
        <button onClick={handleCreateSession} disabled={isLoading}>
          {isLoading ? 'Creating Session...' : '✨ Start New Film Night! ✨'}
        </button>
        {error && <p className="error-message" style={{ marginTop: '1rem' }}>Error: {error}</p>}
      </div>

      <footer style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.9rem', color: '#aaa' }}>
        <p>Happy Watching!</p>
      </footer>
    </div>
  );
} 