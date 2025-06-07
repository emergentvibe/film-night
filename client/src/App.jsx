import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SessionPage } from './pages/SessionPage';
import BackgroundGrid from './components/BackgroundGrid';
import './App.css';

function App() {
  const appTitle = "Voteflix";

  return (
    <>
      <BackgroundGrid />
      <div className="app-content-container">
        <nav className="app-nav">
          <Link to="/" className="app-title-link">
            <span className="app-title">
              {appTitle}
            </span>
            <div className="app-subtitle">
              The democratic way to choose a movie.
            </div>
          </Link>
        </nav>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
