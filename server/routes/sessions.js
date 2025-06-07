const express = require('express');
const db = require('../db'); // Import the centralized db query function
const unfluff = require('unfluff');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

// console.log('[DEBUG] Attempting to require tmdbHelper from:', require.resolve('../utils/tmdbHelper')); // Removed
const { getMovieDetailsFromTMDB, parseTitleAndYear } = require('../utils/tmdbHelper');

const router = express.Router();

// The TMDB_API_KEY and TMDB_BASE_URL constants were here and are also not needed,
// as they are used within the imported getMovieDetailsFromTMDB in tmdbHelper.js

// Helper function to get movie title from AI
async function getMovieTitleFromAI(unfluffData) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not found. Skipping AI title extraction.');
    return null;
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let promptContent = 
`You are an expert at identifying movie titles from noisy text.
I have an extracted title from a webpage: "${unfluffData.title}".`;

  if (unfluffData.description) {
    promptContent += `
The following page description might provide additional context: "${unfluffData.description}"`;
  }
  if (unfluffData.date) {
    promptContent += `
A date associated with the page is: "${unfluffData.date}". This might be the release year.`;
  }

  promptContent += `
This title might include extra information like director names, uploader details, or quality indicators (e.g., "HD", "4K", "Official Trailer", "Full Movie").
Your task is to extract the most likely canonical movie title and its release year.
For example, if the input is "Stanley Kubrick's The Shining (1980) - Full Movie HD", you should extract "The Shining" and "1980".
If the input is "Movie Title by Famous Director", extract "Movie Title".
If the input is "MOVIE SUPER TRAILER (2024)", extract "MOVIE SUPER TRAILER" and "2024".
`;

  if (unfluffData.description) {
    promptContent += `
The following page description might provide additional context: "${unfluffData.description}"
`;
  }

  promptContent += `
Please return your answer ONLY as a JSON object with the keys "title" (string) and "year" (number or null).
Example: {"title": "The Shining", "year": 1980}
If you cannot confidently determine a movie title, return {"title": null, "year": null}.
If you find a title but no year, return {"title": "Found Title", "year": null}.`;

  try {
    console.log('[Anthropic] Sending request to AI with prompt:', promptContent);
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Or another suitable model
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: promptContent,
        },
        {
          role: "assistant",
          content: "Okay, I will analyze the provided text and return the movie title and year in JSON format."
        }
      ],
    });

    console.log('[Anthropic] Received response:', response);

    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      const textResponse = response.content[0].text.trim();
      // Try to extract JSON from the response, it might be wrapped in markdown
      const jsonMatch = textResponse.match(/```json\n(.*\n)```|({.*})/s);
      let parsedJson = null;
      if (jsonMatch && (jsonMatch[1] || jsonMatch[2])) {
        try {
          parsedJson = JSON.parse(jsonMatch[1] || jsonMatch[2]);
        } catch (e) {
          console.error('[Anthropic] Failed to parse JSON from caught regex match:', textResponse, e);
          // Fallback: try parsing the whole string if regex fails but it looks like JSON
          if (textResponse.startsWith('{') && textResponse.endsWith('}')) {
            try {
              parsedJson = JSON.parse(textResponse);
            } catch (e2) {
              console.error('[Anthropic] Failed to parse JSON directly from response:', textResponse, e2);
            }
          }
        }
      } else if (textResponse.startsWith('{') && textResponse.endsWith('}')) {
        // If no markdown, try to parse directly if it looks like JSON
        try {
          parsedJson = JSON.parse(textResponse);
        } catch (e) {
          console.error('[Anthropic] Failed to parse JSON (direct attempt): ', textResponse, e);
        }
      }

      if (parsedJson && parsedJson.title) {
        console.log('[Anthropic] Successfully parsed AI response:', parsedJson);
        return {
          title: parsedJson.title,
          year: parsedJson.year ? parseInt(parsedJson.year) : null, // Ensure year is an int or null
        };
      } else {
        console.warn('[Anthropic] Could not parse a valid title from AI response:', textResponse);
      }
    } else {
      console.warn('[Anthropic] No usable text content in AI response:', response);
    }
  } catch (error) {
    console.error('[Anthropic] Error calling Anthropic API:', error);
  }

  return null;
}

// POST /api/sessions - Create a new film night session
router.post('/', async (req, res) => {
  const { sessionName } = req.body; // Optional sessionName from request
  try {
    const result = await db.query(
      'INSERT INTO sessions (session_name) VALUES ($1) RETURNING id, session_name, created_at',
      [sessionName]
    );
    const newSession = result.rows[0];
    // Construct the shareable link (adjust base URL as needed for frontend)
    const shareableLink = `${req.protocol}://${req.get('host')}/session/${newSession.id}`;
    // In a real app, req.get('host') might be the API host, 
    // you'd use a known frontend base URL.
    // For now, this is a simplification.

    res.status(201).json({
      sessionId: newSession.id,
      sessionName: newSession.session_name,
      createdAt: newSession.created_at,
      shareableLink: shareableLink // This link is conceptual for now
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

// GET /api/sessions/:sessionId - Get details of a specific session
router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { voterIdentifier } = req.query; // Get voterIdentifier from query params
  console.log(`[SESSIONS_ROUTE] GET /api/sessions/${sessionId} - Handler entered. VoterID: ${voterIdentifier}`);
  try {
    const sessionResult = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = sessionResult.rows[0];

    const moviesResult = await db.query('SELECT * FROM movies WHERE session_id = $1 ORDER BY added_at ASC', [sessionId]);
    
    // Parse genres from JSON string to array for each movie
    const movies = moviesResult.rows.map(movie => {
      try {
        // The genres field might be a JSON string, null, or already an object/array
        // depending on db driver and history. This makes it robust.
        if (typeof movie.genres === 'string') {
          return { ...movie, genres: JSON.parse(movie.genres) };
        }
        return movie;
      } catch (e) {
        console.error(`Failed to parse genres for movie ${movie.id}:`, movie.genres, e);
        return { ...movie, genres: [] }; // Gracefully handle malformed data
      }
    });

    session.movies = movies;

    // Fetch unique pairs that have been globally voted on for this session
    const globallyVotedPairsResult = await db.query(
      `SELECT DISTINCT 
         LEAST(movie_a_id::text, movie_b_id::text) as movie1_id, 
         GREATEST(movie_a_id::text, movie_b_id::text) as movie2_id 
       FROM votes 
       WHERE session_id = $1`,
      [sessionId]
    );
    session.globally_voted_pairs = globallyVotedPairsResult.rows.map(pair => `${pair.movie1_id}_${pair.movie2_id}`);

    // Fetch unique pairs voted on by the specific voterIdentifier, if provided
    session.user_voted_pairs = []; // Initialize as empty
    if (voterIdentifier) {
      const userVotedPairsResult = await db.query(
        `SELECT DISTINCT 
           LEAST(movie_a_id::text, movie_b_id::text) as movie1_id, 
           GREATEST(movie_a_id::text, movie_b_id::text) as movie2_id 
         FROM votes 
         WHERE session_id = $1 AND voter_identifier = $2`,
        [sessionId, voterIdentifier]
      );
      session.user_voted_pairs = userVotedPairsResult.rows.map(pair => `${pair.movie1_id}_${pair.movie2_id}`);
    }

    session.rankings = []; // Placeholder for now

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session', details: error.message });
  }
});

// POST /api/sessions/:sessionId/movies - Add a new movie to the session
router.post('/:sessionId/movies', async (req, res) => {
  const { sessionId } = req.params;
  let { url, title: manualTitle, year: manualYear, director, runtime, genres, synopsis, poster_url, rating } = req.body;

  // We need either a URL or a manual title to proceed.
  if (!url && !manualTitle) {
    return res.status(400).json({ error: 'A movie URL or a manual title is required.' });
  }

  // Check if movie already exists by title in this session
  try {
    const existingMovieCheck = await db.query(
      'SELECT id FROM movies WHERE session_id = $1 AND lower(title) = lower($2)',
      [sessionId, manualTitle]
    );
    if (existingMovieCheck.rows.length > 0) {
      return res.status(409).json({ error: `Movie "${manualTitle}" has already been suggested.` });
    }
  } catch (dbError) {
    console.error('DB Error checking for existing movie:', dbError);
    return res.status(500).json({ error: 'Database error while checking for existing movie.' });
  }
  
  let movieDetails = {
    title: manualTitle, // Initialize with manual title if provided
    year: manualYear,   // Initialize with manual year if provided
    director,
    runtime,
    genres,
    synopsis,
    poster_url,
    rating: rating
  };

  let searchTitle = manualTitle;
  let searchYear = manualYear;

  if (url) {
    try {
      const html = await axios.get(url, { timeout: 10000 });
      const unfluffData = unfluff(html.data);
      
      let aiExtractedInfo = null;
      const titleForAI = unfluffData.softTitle || unfluffData.title;
      const descriptionForAI = unfluffData.description;
      const dateHintForAI = unfluffData.date;

      if (titleForAI) {
        aiExtractedInfo = await getMovieTitleFromAI({ title: titleForAI, description: descriptionForAI, date: dateHintForAI });
      }

      if (aiExtractedInfo && aiExtractedInfo.title) {
        searchTitle = aiExtractedInfo.title;
        if (aiExtractedInfo.year) {
            searchYear = aiExtractedInfo.year;
        }
      }
    } catch (error) {
      console.error('Error during URL processing. Will proceed with manual data. Error:', error);
    }
  } else {
    console.log('[MOVIE_ADD_DEBUG] No URL provided. Using manually entered title for TMDB search.');
  }

  // If we have a title to search for (from manual input or URL processing), use TMDB
  if (searchTitle) {
    try {
      const tmdbDetails = await getMovieDetailsFromTMDB(searchTitle, searchYear);

      if (tmdbDetails) {
        // We merge TMDB details. This enriches the manual data.
        movieDetails = {
          ...movieDetails, // Keeps manual data as a fallback
          ...tmdbDetails   // Overwrites with richer TMDB data
        };
      }
    } catch (error) {
      console.error('Error during TMDB call:', error);
    }
  }

  // At this point, movieDetails contains the best information we could gather.
  // Now, we insert it into the database.
  try {
    const result = await db.query(
      `INSERT INTO movies (session_id, title, year, director, runtime, genres, synopsis, poster_url, rating, trailer_url, tmdb_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        sessionId,
        movieDetails.title,
        movieDetails.year || null,
        movieDetails.director,
        movieDetails.runtime,
        movieDetails.genres || null,
        movieDetails.synopsis,
        movieDetails.poster_url,
        movieDetails.rating,
        movieDetails.trailer_url,
        movieDetails.tmdbId || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CRITICAL: Failed to insert movie into database:', error);
    res.status(500).json({ error: 'Failed to save movie to database', details: error.message });
  }
});

// DELETE /api/sessions/:sessionId/movies/:movieId - Delete a specific movie from a session
router.delete('/:sessionId/movies/:movieId', async (req, res) => {
  const { movieId } = req.params;
  // We don't strictly need sessionId for deletion if movieId is a UUID and unique across all sessions.
  // However, it could be used for an additional check if desired:
  // const { sessionId } = req.params; 
  // await db.query('DELETE FROM movies WHERE id = $1 AND session_id = $2', [movieId, sessionId]);

  if (!movieId) {
    return res.status(400).json({ error: 'Movie ID is required.'});
  }

  try {
    const result = await db.query('DELETE FROM movies WHERE id = $1 RETURNING id', [movieId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Movie not found or already deleted.' });
    }
    res.status(200).json({ message: 'Movie deleted successfully', movieId: movieId });
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ error: 'Failed to delete movie', details: error.message });
  }
});

// POST /api/sessions/:sessionId/vote - Record a vote for a movie pair
router.post('/:sessionId/vote', async (req, res) => {
  const { sessionId } = req.params;
  // Updated to match schema: movie_a_id, movie_b_id, winner_id
  // Added voterIdentifier
  const { movieAId, movieBId, winnerId, voterIdentifier } = req.body;

  if (!movieAId || !movieBId || !winnerId || !voterIdentifier) {
    return res.status(400).json({ error: 'movieAId, movieBId, winnerId, and voterIdentifier are required.' });
  }

  if (movieAId === movieBId) {
    return res.status(400).json({ error: 'Movie A and Movie B cannot be the same.' });
  }

  if (winnerId !== movieAId && winnerId !== movieBId) {
    return res.status(400).json({ error: 'Winner must be one of Movie A or Movie B.' });
  }

  try {
    const sessionExists = await db.query('SELECT id FROM sessions WHERE id = $1', [sessionId]);
    if (sessionExists.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Check if all three movies exist and belong to the session
    const movieA = await db.query('SELECT id FROM movies WHERE id = $1 AND session_id = $2', [movieAId, sessionId]);
    const movieB = await db.query('SELECT id FROM movies WHERE id = $1 AND session_id = $2', [movieBId, sessionId]);
    // Winner is implicitly checked by being movieA or movieB which are checked against the session.

    if (movieA.rows.length === 0) {
      return res.status(404).json({ error: 'Movie A not found in this session.' });
    }
    if (movieB.rows.length === 0) {
      return res.status(404).json({ error: 'Movie B not found in this session.' });
    }

    const result = await db.query(
      'INSERT INTO votes (session_id, movie_a_id, movie_b_id, winner_id, voter_identifier) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [sessionId, movieAId, movieBId, winnerId, voterIdentifier]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error recording vote:', error);
    if (error.code === '23503') { // Foreign key violation
        // Check specific constraints if known, e.g. error.constraint name
        return res.status(404).json({ error: 'Invalid session or movie ID provided.', details: error.message });
    }
    if (error.constraint === 'chk_different_movies') { 
        return res.status(400).json({ error: 'Movie A and Movie B must be different (database check).'});
    }
    res.status(500).json({ error: 'Failed to record vote', details: error.message });
  }
});

// GET /api/sessions/:sessionId/rankings - Calculate and return movie rankings
router.get('/:sessionId/rankings', async (req, res) => {
  const { sessionId } = req.params;
  try {
    // Check if there are at least two movies to prevent SQL errors on empty sets
    const movieCountResult = await db.query('SELECT COUNT(*) FROM movies WHERE session_id = $1', [sessionId]);
    const movieCount = parseInt(movieCountResult.rows[0].count, 10);
    if (movieCount < 1) {
      return res.json([]); // No movies, no rankings
    }

    // This query calculates the number of "wins" for each movie
    const rankingsResult = await db.query(`
      SELECT
        m.id,
        m.title,
        m.year,
        m.director,
        m.runtime,
        m.rating,
        m.genres,
        m.synopsis,
        m.poster_url,
        m.trailer_url,
        COALESCE(v.wins, 0) as wins
      FROM movies m
      LEFT JOIN (
        SELECT
          winner_id,
          COUNT(*) as wins
        FROM votes
        WHERE session_id = $1
        GROUP BY winner_id
      ) v ON m.id = v.winner_id
      WHERE m.session_id = $1
      ORDER BY wins DESC, m.title ASC;
    `, [sessionId]);

    res.json(rankingsResult.rows);
  } catch (error) {
    console.error('Error calculating rankings:', error);
    res.status(500).json({ error: 'Failed to calculate rankings', details: error.message });
  }
});

module.exports = router; 