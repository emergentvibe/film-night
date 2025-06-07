import axios from 'axios';

const API_BASE_URL = '/api'; // Proxied by Vite

/**
 * Creates a new film night session.
 * @param {string | null} sessionName - Optional name for the session.
 * @returns {Promise<object>} The new session data from the backend.
 */
export const createSession = async (sessionName = null) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sessions`, { sessionName });
    return response.data; // Expected: { sessionId, name, createdAt, shareableLink }
  } catch (error) {
    console.error('Error creating session:', error.response ? error.response.data : error.message);
    throw error; // Re-throw to be caught by the calling component
  }
};

/**
 * Fetches details for a specific session.
 * @param {string} sessionId - The ID of the session to fetch.
 * @param {string} [voterIdentifier] - Optional: The identifier for the current voter.
 * @returns {Promise<object>} The session data.
 */
export const getSessionDetails = async (sessionId, voterIdentifier = null) => {
  try {
    let url = `${API_BASE_URL}/sessions/${sessionId}`;
    if (voterIdentifier) {
      url += `?voterIdentifier=${encodeURIComponent(voterIdentifier)}`;
    }
    const response = await axios.get(url);
    return response.data; // Expected: { id, session_name, created_at, movies: [], rankings: [], globally_voted_pairs: [], user_voted_pairs: [] }
  } catch (error) {
    console.error(`Error fetching session ${sessionId} (VoterID: ${voterIdentifier}):`, error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Adds a movie to a session.
 * @param {string} sessionId - The ID of the session.
 * @param {object} movieData - Data for the movie to add.
 *   Expected structure: { title, submittedUrl, sourceType, posterUrl, genres, synopsis, year, director, runtime, rating }
 * @returns {Promise<object>} The newly added movie data.
 */
export const addMovieToSession = async (sessionId, movieData) => {
  const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/movies`, movieData);
  return response.data;
};

export const deleteMovieFromSession = async (sessionId, movieId) => {
  const response = await axios.delete(`${API_BASE_URL}/sessions/${sessionId}/movies/${movieId}`);
  return response.data; // Should contain { message: 'Movie deleted successfully', movieId: movieId }
};

/**
 * Records a vote for a movie pair in a session.
 * @param {string} sessionId - The ID of the session.
 * @param {string} movieAId - The ID of the first movie in the pair.
 * @param {string} movieBId - The ID of the second movie in the pair.
 * @param {string} winnerId - The ID of the movie chosen by the user (must be one of movieAId or movieBId).
 * @param {string} voterIdentifier - An anonymous ID for the voter.
 * @returns {Promise<object>} The newly created vote data.
 */
export const recordVote = async (sessionId, movieAId, movieBId, winnerId, voterIdentifier) => {
  const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/vote`, { movieAId, movieBId, winnerId, voterIdentifier });
  return response.data;
};

/**
 * Fetches the ranked list of movies for a session.
 * @param {string} sessionId - The ID of the session.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of ranked movie objects.
 * Each movie object will include its details and win count.
 */
export const getSessionRankings = async (sessionId) => {
  const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/rankings`);
  return response.data; // Expected: Array of { id, title, poster_url, year, wins, ... }
};

// Add other API functions here as needed (e.g., for votes, pairs, rankings) 