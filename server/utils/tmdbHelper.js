const axios = require('axios');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Helper function to parse title and year (e.g., "Movie Title (YYYY)")
function parseTitleAndYear(inputTitle) {
  if (!inputTitle) return { title: null, year: null };
  const match = inputTitle.match(/^(.*?)(?:\s*\((\d{4})\))?$/);
  if (match) {
    const title = match[1] ? match[1].trim() : inputTitle.trim();
    const year = match[2] ? parseInt(match[2]) : null;
    return { title, year };
  }
  return { title: inputTitle.trim(), year: null };
}

// Helper function to search TMDB and get movie details
async function getMovieDetailsFromTMDB(titleToSearch, yearToSearch = null) {
  if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not found. Skipping TMDB lookup.');
    return null;
  }

  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie`;
    let searchParams = { api_key: TMDB_API_KEY, query: titleToSearch };
    if (yearToSearch) {
      searchParams.primary_release_year = yearToSearch;
    }
    
    let searchResponse = await axios.get(searchUrl, { params: searchParams });

    if ((!searchResponse.data || !searchResponse.data.results || searchResponse.data.results.length === 0) && yearToSearch) {
      const fallbackParams = { api_key: TMDB_API_KEY, query: titleToSearch };
      searchResponse = await axios.get(searchUrl, { params: fallbackParams });
    }

    if (searchResponse.data && searchResponse.data.results && searchResponse.data.results.length > 0) {
      const movieId = searchResponse.data.results[0].id;
      
      const detailUrl = `${TMDB_BASE_URL}/movie/${movieId}`;
      const detailParams = { api_key: TMDB_API_KEY, append_to_response: 'credits,videos' }; 
      let detailResponse;
      try {
        detailResponse = await axios.get(detailUrl, { params: detailParams });
      } catch (detailError) {
        console.error('[TMDB] ERROR during axios.get for movie details:', detailError.message);
        if (detailError.response) {
          console.error('[TMDB] Error response data:', detailError.response.data);
          console.error('[TMDB] Error response status:', detailError.response.status);
        }
        return null; // Exit if detail fetch fails
      }
      
      if (detailResponse && detailResponse.data) {
      } else {
        return null; // Exit if no data
      }

      const tmdbMovie = detailResponse.data;

      let director = null;
      if (tmdbMovie.credits && tmdbMovie.credits.crew) {
        const directorEntry = tmdbMovie.credits.crew.find(person => person.job === 'Director');
        if (directorEntry) {
          director = directorEntry.name;
        }
      }

      let trailerUrl = null;
      if (tmdbMovie.videos && tmdbMovie.videos.results) {
        const trailers = tmdbMovie.videos.results.filter(
          video => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser')
        );
        let bestTrailer = trailers.find(t => t.type === 'Trailer' && t.official);
        if (!bestTrailer) bestTrailer = trailers.find(t => t.type === 'Trailer');
        if (!bestTrailer) bestTrailer = trailers.find(t => t.type === 'Teaser' && t.official);
        if (!bestTrailer) bestTrailer = trailers.find(t => t.type === 'Teaser');

        if (bestTrailer) {
          trailerUrl = `https://www.youtube.com/watch?v=${bestTrailer.key}`;
        }
      }

      const formattedDetails = {
        title: tmdbMovie.title,
        poster_url: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : null,
        synopsis: tmdbMovie.overview,
        genres: tmdbMovie.genres ? tmdbMovie.genres.map(g => g.name) : [],
        year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.substring(0, 4)) : null,
        director: director,
        runtime: tmdbMovie.runtime ? `${tmdbMovie.runtime} min` : null,
        rating: tmdbMovie.vote_average ? `${tmdbMovie.vote_average.toFixed(1)}/10 (TMDB)` : null,
        tmdbId: tmdbMovie.id,
        trailer_url: trailerUrl
      };

      return formattedDetails;
    }
    return null;
  } catch (error) {
    console.error('[TMDB] Error fetching data from TMDB:', error.response ? error.response.data : error.message);
    return null;
  }
}

module.exports = { getMovieDetailsFromTMDB, parseTitleAndYear }; 