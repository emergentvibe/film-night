import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../services/api';
import './HomePage.css';

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
    <div className="home-page-container">
      <h2>Create a New Film Night</h2>
      <div className="create-session-section">
        <input
          type="text"
          placeholder="Optional: Name your session (e.g., Horror Movie Night)"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          disabled={isLoading}
        />
        <button onClick={handleCreateSession} disabled={isLoading}>
          {isLoading ? 'Creating Session...' : '✨ Start New Film Night! ✨'}
        </button>
        {error && <p className="error-message" style={{ marginTop: '1rem' }}>Error: {error}</p>}
      </div>
      
      <h2 style={{marginTop: '3rem'}}>How It Works</h2>
      <div className="how-it-works">
        <ol>
          <li><strong>Start a Session:</strong> Give your film night a name (optional) and hit "Start New Film Night!".</li>
          <li><strong>Share the Link:</strong> Copy the unique session link and send it to your friends.</li>
          <li><strong>Suggest Movies:</strong> Everyone can add movie suggestions by pasting a URL or entering them manually.</li>
          <li><strong>Rank 'Em Up:</strong> Compare movies side-by-side and vote for your favorites.</li>
          <li><strong>See the Winner:</strong> A ranked list appears, updated in real-time, showing the group's top picks.</li>
        </ol>
      </div>

      <footer className="home-footer">
        <h3>🍿 Happy Watching! 🍿</h3>
      </footer>
    </div>
  );
} 