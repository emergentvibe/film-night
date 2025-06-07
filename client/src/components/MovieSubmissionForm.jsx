import React, { useState } from 'react';

function MovieSubmissionForm({ onMovieAdded, existingMovies }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!url && !title) {
      setError('Please provide either a movie URL or a title.');
      setIsLoading(false);
      return;
    }

    if (title && existingMovies && existingMovies.includes(title)) {
      setError(`The movie "${title}" has already been suggested for this session.`);
      setIsLoading(false);
      return;
    }

    try {
      const payload = {};
      if (url) payload.url = url;
      if (title) payload.title = title;
      if (year) payload.year = year;
      
      await onMovieAdded(payload); 
      
      // No need to reset fields here, as the modal will close on success
      // setUrl(''); 
      // setTitle('');
      // setYear('');

    } catch (err) {
      console.error('Error submitting movie:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add movie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="movie-submission-form">
      {error && <div className="error-message mb-3">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="url">Movie URL (e.g., Letterboxd, YouTube):</label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://letterboxd.com/film/parasite/"
        />
      </div>

      <p style={{textAlign: 'center', margin: '1em 0', fontWeight: 'bold'}}>- OR -</p>

      <div className="form-group">
        <label htmlFor="title">Title:</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., My Neighbor Totoro"
        />
      </div>

      <div className="form-group">
        <label htmlFor="year">Year (Optional):</label>
        <input
          type="number"
          id="year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="e.g., 1988"
        />
      </div>

      <button type="submit" disabled={isLoading} className="button-primary">
        {isLoading ? 'Adding Movie...' : 'Add Movie'}
      </button>
    </form>
  );
}

export default MovieSubmissionForm; 