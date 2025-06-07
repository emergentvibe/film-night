import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionDetails, addMovieToSession, deleteMovieFromSession, recordVote, getSessionRankings } from '../services/api';
import MovieSubmissionForm from '../components/MovieSubmissionForm';
import Modal from '../components/Modal';
import { v4 as uuidv4 } from 'uuid';
import './SessionPage.css';

// MovieItem component (can be moved to components/ later)
function MovieItem({ movie, onDelete }) {
  const handleTrailerClick = (e) => {
    e.stopPropagation(); // Prevents any parent onClick events
  };

  return (
    <li className="movie-item">
      <div className="poster-column">
        <div className="image-container">
          {movie.poster_url && <img src={movie.poster_url} alt={`${movie.title} poster`} />}
        </div>
        <div className="wins-badge">
          {movie.wins} Win{movie.wins === 1 ? '' : 's'}
        </div>
      </div>
      <div className="movie-details">
        <div className="movie-title-bar">
          <h4>{movie.title} ({movie.year || 'N/A'})</h4>
          {movie.trailer_url && (
            <a 
              href={movie.trailer_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="trailer-link-btn"
              onClick={handleTrailerClick}
            >
              Watch Trailer
            </a>
          )}
        </div>
        <p><strong>Director:</strong> {movie.director || 'N/A'}</p>
        <p>
          <strong>Runtime:</strong> {movie.runtime || 'N/A'}
          <span style={{margin: '0 10px'}}>|</span>
          <strong>Rating:</strong> {movie.rating || 'N/A'}
        </p>
        <p><strong>Genres:</strong> {movie.genres && movie.genres.length > 0 ? movie.genres.join(', ') : 'N/A'}</p>
        
        {movie.synopsis && <p className="synopsis">{movie.synopsis}</p>}
      </div>
      <button 
        onClick={() => onDelete(movie.id)}
        className="delete-movie-btn"
        title="Remove movie"
      >
        &times;
      </button>
    </li>
  );
}

export function SessionPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPair, setCurrentPair] = useState([]);
  const [voteError, setVoteError] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [currentUserVotedPairs, setCurrentUserVotedPairs] = useState(new Set());
  const [allPairsVotedForCurrentUser, setAllPairsVotedForCurrentUser] = useState(false);
  const [voterIdentifier, setVoterIdentifier] = useState(null);
  const [rankedMovies, setRankedMovies] = useState([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Get or create a unique voter identifier for this browser session
    let currentVoterId = localStorage.getItem(`filmNightVoterId_${sessionId}`);
    if (!currentVoterId) {
      currentVoterId = uuidv4();
      localStorage.setItem(`filmNightVoterId_${sessionId}`, currentVoterId);
    }
    setVoterIdentifier(currentVoterId);
  }, [sessionId]);

  const fetchRankings = useCallback(async () => {
    if (!sessionId) return;
    setIsRankingLoading(true);
    setRankingError(null);
    try {
      const rankings = await getSessionRankings(sessionId);
      setRankedMovies(rankings);
    } catch (err) {
      console.error('Error fetching rankings:', err);
      setRankingError(err.response?.data?.error || err.message || 'Could not fetch rankings.');
      setRankedMovies([]); // Clear rankings on error
    }
    setIsRankingLoading(false);
  }, [sessionId]);

  const fetchDetails = useCallback(async (selectPair = true) => {
    setIsLoading(true);
    setError(null);
    setCurrentUserVotedPairs(new Set());
    setAllPairsVotedForCurrentUser(false);

    try {
      const data = await getSessionDetails(sessionId, voterIdentifier);
      setSession(data);
      const initialUserVotedPairs = data.user_voted_pairs ? new Set(data.user_voted_pairs) : new Set();
      setCurrentUserVotedPairs(initialUserVotedPairs);

      if (selectPair && data && data.movies && data.movies.length >= 2) {
        selectNewPair(data.movies, initialUserVotedPairs);
      } else if (selectPair) {
        setCurrentPair([]);
        if (data && data.movies && data.movies.length < 2) setAllPairsVotedForCurrentUser(true);
      }

      if (data && data.movies && data.movies.length > 0) {
        fetchRankings();
      } else {
        setRankedMovies([]); // No movies, no rankings
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
      setError(err.response?.data?.error || err.message || 'Could not fetch session details.');
      setRankedMovies([]); // Clear rankings on session fetch error
    }
    setIsLoading(false);
  }, [sessionId, fetchRankings, voterIdentifier]);

  const selectNewPair = useCallback((movies, currentUserVotedPairsSet) => {
    if (!movies || movies.length < 2) {
      setCurrentPair([]);
      setAllPairsVotedForCurrentUser(movies && movies.length < 2);
      return;
    }

    const allPossiblePairs = [];
    for (let i = 0; i < movies.length; i++) {
      for (let j = i + 1; j < movies.length; j++) {
        allPossiblePairs.push([movies[i], movies[j]]);
      }
    }

    const unvotedPairsForCurrentUser = allPossiblePairs.filter(pair => {
      const pairId1 = [pair[0].id, pair[1].id].sort().join('_');
      return !currentUserVotedPairsSet.has(pairId1);
    });

    if (unvotedPairsForCurrentUser.length > 0) {
      const randomIndex = Math.floor(Math.random() * unvotedPairsForCurrentUser.length);
      setCurrentPair(unvotedPairsForCurrentUser[randomIndex]);
      setAllPairsVotedForCurrentUser(false);
    } else {
      setCurrentPair([]);
      setAllPairsVotedForCurrentUser(true);
      console.log("All unique pairs have been voted by current user.");
    }
  }, []);

  useEffect(() => {
    if (voterIdentifier) {
      fetchDetails(true);
    }
  }, [voterIdentifier, fetchDetails]);

  // Effect to select a new pair and potentially fetch rankings if all pairs are voted
  useEffect(() => {
    if (session && session.movies && session.movies.length >= 2) {
      if (allPairsVotedForCurrentUser) {
        if (currentPair.length > 0) setCurrentPair([]);
        fetchRankings(); // Fetch rankings when all pairs are voted
        return;
      }

      const isCurrentPairStale = currentPair.length > 0 && 
                                 !currentPair.every(pairMovie => session.movies.find(m => m.id === pairMovie.id));
      
      if (currentPair.length !== 2 || isCurrentPairStale) {
          selectNewPair(session.movies, currentUserVotedPairs);
      }
    } else {
      if (currentPair.length !== 0) {
        setCurrentPair([]);
      }
      if (session && session.movies && session.movies.length < 2) {
        if (!allPairsVotedForCurrentUser) {
          setAllPairsVotedForCurrentUser(true);
        }
      }
    }
  }, [session, currentPair, allPairsVotedForCurrentUser, currentUserVotedPairs, selectNewPair, fetchRankings]);

  const handleMovieAdded = async (movieData) => {
    try {
      await addMovieToSession(sessionId, movieData);
      fetchDetails(true);
    } catch (err) {
      console.error('Error in handleMovieAdded:', err);
      throw err;
    }
  };

  const handleDeleteMovie = async (movieId) => {
    if (window.confirm('Are you sure you want to remove this movie?')) {
      setIsDeleting(true);
      setDeleteError(null);
      try {
        await deleteMovieFromSession(sessionId, movieId);
        fetchDetails(true);
      } catch (err) {
        console.error('Error deleting movie:', err);
        setDeleteError(err.response?.data?.error || err.message || 'Could not delete movie.');
      }
      setIsDeleting(false);
    }
  };

  const handleVote = async (clickedMovieId) => {
    if (currentPair.length !== 2 || isVoting) {
      return;
    }

    setIsVoting(true);
    setIsFading(true);

    // Short delay to allow fade-out animation to be visible
    setTimeout(async () => {
      const movieAId = currentPair[0].id;
      const movieBId = currentPair[1].id;

      try {
        await recordVote(sessionId, movieAId, movieBId, clickedMovieId, voterIdentifier);
        
        const newCurrentUserVotedPairs = new Set(currentUserVotedPairs);
        const pairKey = [movieAId, movieBId].sort().join('_');
        newCurrentUserVotedPairs.add(pairKey);
        setCurrentUserVotedPairs(newCurrentUserVotedPairs);

        if (session && session.movies && session.movies.length >= 2) {
          selectNewPair(session.movies, newCurrentUserVotedPairs);
        } else {
          setCurrentPair([]);
          setAllPairsVotedForCurrentUser(true);
        }
        fetchRankings();
      } catch (err) {
        console.error('Error recording vote:', err);
        setVoteError(err.response?.data?.error || err.message || 'Could not record vote.');
      } finally {
        setIsFading(false);
        setTimeout(() => setIsVoting(false), 50);
      }
    }, 300); // This duration should match the CSS transition
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy link.');
    }
  };

  const handleMovieAddedAndCloseModal = async (movieData) => {
    try {
      await handleMovieAdded(movieData);
      setIsModalOpen(false);
    } catch (error) {
      console.log("Error adding movie, modal will stay open.");
    }
  };

  // Corrected Loading and Error State Handling
  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>🌀 Loading session...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  // Fallback if session is still null after loading and no error.
  if (!session) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Session not found.</div>;
  }

  return (
    <div className="session-page">
      <header className="session-header">
        <h1>{session.name || 'Voteflix Session'}</h1>
        <div className="session-header-actions">
           <button onClick={() => setIsModalOpen(true)} className="button-primary">
            Suggest a Movie
          </button>
          <button onClick={handleCopyLink}>
            {isLinkCopied ? '✅ Copied!' : '🔗 Copy Invite Link'}
          </button>
        </div>
      </header>

      {deleteError && <div className="error-message">Error deleting movie: {deleteError}</div>}
      {isDeleting && <p>Deleting movie...</p>}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Suggest a Movie"
      >
        <MovieSubmissionForm
          sessionId={sessionId}
          onMovieAdded={handleMovieAddedAndCloseModal}
          existingMovies={session.movies ? session.movies.map(m => m.title) : []}
        />
      </Modal>

      {/* --- VOTING SECTION --- */}
      <div className="voting-section">
        <h3>Vote on a Matchup</h3>
        {voteError && <div className="error-message" style={{textAlign: 'center'}}>{voteError}</div>}
        
        <div className="voting-arena">
          <div className={`voting-status ${isVoting ? 'visible' : ''}`}>
            Recording Vote...
          </div>
          
          {(!session.movies || session.movies.length < 2) && (
             <p style={{textAlign: 'center'}}>Add at least two movies to start voting.</p>
          )}

          {currentPair.length === 2 && (
            <div className={`voting-pair ${isFading ? 'fading-out' : ''}`}>
              {currentPair.map(movie => (
                <div key={movie.id} className="voting-movie-option" onClick={() => handleVote(movie.id)}>
                  <div className="image-container">
                    <img src={movie.poster_url} alt={`${movie.title} poster`} />
                  </div>
                  <h4>{movie.title} ({movie.year})</h4>
                </div>
              ))}
            </div>
          )}

          {!isVoting && allPairsVotedForCurrentUser && session.movies && session.movies.length >= 2 && (
            <div className="voting-complete">
              <h4>🎉 You've voted on all available pairs!</h4>
              <p>The final rankings are below. If more movies are added, new voting pairs will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- RANKINGS SECTION --- */}
      <div className="rankings-section">
        <h3>Ranked Movie Suggestions</h3>
        {isRankingLoading && <p>Loading rankings...</p>}
        {rankingError && <div className="error-message">{rankingError}</div>}
        {!isRankingLoading && rankedMovies.length > 0 && (
          <ol className="ranked-movie-list">
            {rankedMovies.map((movie, index) => (
               <MovieItem key={movie.id} movie={movie} onDelete={handleDeleteMovie} />
            ))}
          </ol>
        )}
        {!isRankingLoading && rankedMovies.length === 0 && session.movies && session.movies.length > 0 && (
          <p>Rankings will appear here after some votes have been cast.</p>
        )}
        {!isRankingLoading && (!session.movies || session.movies.length === 0) && (
           <div className="no-movies-message">No movies suggested yet. Add one to get started!</div>
        )}
      </div>
    </div>
  );
} 