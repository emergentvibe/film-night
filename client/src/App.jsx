import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SessionPage } from './pages/SessionPage';

function App() {
  return (
    <div>
      <nav style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <Link to="/">Home</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>
    </div>
  );
}

export default App;
