import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionDetails, addMovieToSession, deleteMovieFromSession, recordVote, getSessionRankings } from '../services/api';
import MovieSubmissionForm from '../components/MovieSubmissionForm';
import { v4 as uuidv4 } from 'uuid';

// MovieItem component (can be moved to components/ later)
function MovieItem({ movie, onDelete }) {
  return (
    <li className="movie-item">
      <button 
        onClick={() => onDelete(movie.id)}
        className="delete-movie-btn"
        title="Remove movie"
      >
        X
      </button>
      <h4>{movie.title} ({movie.year || 'Year N/A'})</h4>
      {movie.poster_url && <img src={movie.poster_url} alt={`${movie.title} poster`} />}
      <p><strong>Director:</strong> {movie.director || 'N/A'}</p>
      <p><strong>Runtime:</strong> {movie.runtime || 'N/A'}</p>
      <p><strong>Rating:</strong> {movie.rating || 'N/A'}</p>
      <p><strong>Genres:</strong> {movie.genres && movie.genres.length > 0 ? movie.genres.join(', ') : 'N/A'}</p>
      <div className="movie-item-actions">
        {movie.trailer_url && 
            <p><a href={movie.trailer_url} target="_blank" rel="noopener noreferrer">Watch Trailer</a></p>
        }
        {movie.synopsis && <p style={{clear: 'both', paddingTop: '0.5em'}}><em>{movie.synopsis}</em></p>} 
      </div>
      <div style={{clear: 'both'}}></div>
    </li>
  );
}

export function SessionPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formSubmitError, setFormSubmitError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPair, setCurrentPair] = useState([]);
  const [voteError, setVoteError] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [currentUserVotedPairs, setCurrentUserVotedPairs] = useState(new Set());
  const [allPairsVotedForCurrentUser, setAllPairsVotedForCurrentUser] = useState(false);
  const [voterIdentifier, setVoterIdentifier] = useState(null);
  const [rankedMovies, setRankedMovies] = useState([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

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
    setFormSubmitError(null);
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
    setFormSubmitError(null);
    try {
      await addMovieToSession(sessionId, movieData);
      fetchDetails(true);
    } catch (err) {
      console.error('Error in handleMovieAdded:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to add movie.';
      setFormSubmitError(errorMessage);
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
    if (currentPair.length !== 2) {
      console.error("Cannot vote, currentPair is not set correctly.");
      setVoteError("Could not determine movies for voting. Please refresh.");
      return;
    }

    const movieAId = currentPair[0].id;
    const movieBId = currentPair[1].id;
    const winnerId = clickedMovieId;

    // Ensure winnerId is one of the pair
    if (winnerId !== movieAId && winnerId !== movieBId) {
        console.error("Winner ID is not part of the current pair.", { winnerId, movieAId, movieBId });
        setVoteError("Invalid vote selection. Please try again.");
        return;
    }

    if (!voterIdentifier) {
      console.error("Voter identifier not set. Cannot record vote.");
      setVoteError("Your voting session ID is not set. Please refresh.");
      return;
    }

    setIsVoting(true);
    setVoteError(null);
    try {
      await recordVote(sessionId, movieAId, movieBId, winnerId, voterIdentifier);
      
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
    }
    setIsVoting(false);
  };

  const shareableLink = `${window.location.origin}/session/${sessionId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy link: ', err);
      // Optionally, show an error message to the user
    }
  };

  if (isLoading && !session) return <div className="container"><p className="info-message">Loading session details...</p></div>;
  if (error) return <div className="container"><p className="error-message">Error: {error}</p></div>;
  if (!session) return <div className="container"><p className="info-message">Session not found or still loading.</p></div>;

  return (
    <div className="container">
      <h2>{session.session_name ? session.session_name : `Film Night: ${session.id.substring(0,8)}...`}</h2>
      <div className="session-link-container">
        <label htmlFor="shareableSessionLink" className="session-link-label">Share this link with your friends</label>
        <div className="session-link-input-group">
          <span id="shareableSessionLink" className="session-link-text"><strong>{shareableLink}</strong></span>
          <button onClick={handleCopyLink} className="copy-link-button">
            {isLinkCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <hr />
      
      <h3>Suggest a Movie</h3>
      <MovieSubmissionForm 
        sessionId={sessionId} 
        onMovieAdded={handleMovieAdded} 
        setError={setFormSubmitError}
      />
      {formSubmitError && <p className="error-message">Submission Error: {formSubmitError}</p>}
      
      <hr />
      <h3>Movies Suggested ({session.movies ? session.movies.length : 0})</h3>
      {isDeleting && <p className="info-message">Deleting movie...</p>}
      {deleteError && <p className="error-message">Delete Error: {deleteError}</p>}
      {session.movies && session.movies.length > 0 ? (
        <ul>
          {session.movies.map(movie => (
            <MovieItem key={movie.id} movie={movie} onDelete={handleDeleteMovie} />
          ))}
        </ul>
      ) : (
        <p className="info-message">No movies suggested yet. Be the first!</p>
      )}
      <hr />
      <h3>Let's Pick!</h3>
      {isVoting && <p className="info-message">Recording vote...</p>}
      {voteError && <p className="error-message">Vote Error: {voteError}</p>}
      {session && session.movies && session.movies.length < 2 && (
        <p className="info-message">Need at least two movies to start comparing. Add some more suggestions!</p>
      )}
      {allPairsVotedForCurrentUser && session && session.movies && session.movies.length >=2 && (
        <p className="info-message">All unique pairs have been compared by you. Woohoo!</p>
      )}
      {currentPair.length === 2 && !allPairsVotedForCurrentUser ? (
        <div className="comparison-area">
          {currentPair.map(movieInPair => (
            <div key={movieInPair.id} className="comparison-movie-card" 
                 onClick={() => handleVote(movieInPair.id)}>
              <h4>{movieInPair.title} ({movieInPair.year || 'Year N/A'})</h4>
              {movieInPair.poster_url && <img src={movieInPair.poster_url} alt={`${movieInPair.title} poster`} />}
              <p className="choose-text"><em>Choose this movie</em></p>
            </div>
          ))}
        </div>
      ) : (
        session && session.movies && session.movies.length >= 2 && !allPairsVotedForCurrentUser && <p className="info-message">Loading next pair...</p>
      )}
      <hr />
      <h3 className="ranked-list-title">Tonight's Contenders - Ranked!</h3>
      {isRankingLoading && <p className="info-message">Loading rankings...</p>}
      {rankingError && <p className="error-message">Error loading rankings: {rankingError}</p>}
      {!isRankingLoading && !rankingError && rankedMovies.length === 0 && session && session.movies && session.movies.length > 0 && (
        <p className="info-message">No votes recorded yet, or rankings are being calculated. Vote on some pairs!</p>
      )}
      {!isRankingLoading && !rankingError && rankedMovies.length > 0 && (
        <div className="ranked-list">
          <ol>
            {rankedMovies.map((movie, index) => (
              <li key={movie.id}>
                <span className="rank-info">{index + 1}.</span>
                {movie.poster_url && <img src={movie.poster_url} alt={`${movie.title} poster`} />}
                <div>
                    <strong>{movie.title} ({movie.year || 'N/A'})</strong><br />
                    <small>Wins: {movie.wins}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {!isRankingLoading && !rankingError && rankedMovies.length === 0 && (!session || !session.movies || !session.movies.length) && (
         <p className="info-message">Add some movies and cast some votes to see the rankings!</p>
      )}
    </div>
  );
} 