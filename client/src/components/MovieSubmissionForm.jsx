import React, { useState } from 'react';

function MovieSubmissionForm({ sessionId, onMovieAdded, setError }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); // Clear previous errors

    if (!url && !title) {
      setError('Please enter a movie URL or a manual title.');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {};
      if (url) payload.url = url;
      if (title) payload.title = title;
      if (year) payload.year = year;
      
      await onMovieAdded(payload); 
      setUrl(''); 
      setTitle('');
      setYear('');
    } catch (error) {
      console.error('Error submitting movie:', error);
      setError(error.message || 'Failed to add movie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="movie-submission-form">
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

      <button type="submit" disabled={isLoading} style={{marginTop: '1em'}}>
        {isLoading ? 'Adding Movie...' : 'Add Movie'}
      </button>
    </form>
  );
}

export default MovieSubmissionForm; 