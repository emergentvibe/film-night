-- server/db/init.sql

-- Drop tables if they exist (for easier re-initialization during development)
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS votes CASCADE; -- Though votes are phase 3, good to have consistency

-- Sessions Table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Using UUID for session IDs
    session_name VARCHAR(255), -- Optional friendly name for the session
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movies Table
CREATE TABLE movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Using UUID for movie IDs
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    submitted_url TEXT,
    source_type VARCHAR(50) CHECK (source_type IN ('url', 'manual')), -- Enum-like check
    poster_url TEXT,
    genres TEXT[], -- Array of strings for genres
    synopsis TEXT,
    year INTEGER,
    director VARCHAR(255),
    runtime VARCHAR(50), -- e.g., "105 min" or "1h 45m"
    rating VARCHAR(50), -- e.g., "7.8/10"
    tmdb_id TEXT, -- Store TMDB ID for potential future use
    trailer_url TEXT, -- To store the YouTube trailer link
    submitted_by TEXT, -- Optional: to see who suggested what
    added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes Table (as per dev-plan, for consistency though used in a later phase)
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    voter_identifier VARCHAR(255), -- To anonymously track voters within a session
    movie_a_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    movie_b_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES movies(id) ON DELETE CASCADE, -- Can be NULL if skipped
    is_skip BOOLEAN DEFAULT FALSE,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_different_movies CHECK (movie_a_id <> movie_b_id),
    -- Ensure a voter doesn't vote for the same pair multiple times (for specific A vs B order)
    -- For more robust pair uniqueness regardless of order, logic would be in the app
    CONSTRAINT unique_vote_pair_for_voter UNIQUE (session_id, voter_identifier, movie_a_id, movie_b_id)
);

-- Optional: Indexes for performance on foreign keys and frequently queried columns
CREATE INDEX idx_movies_session_id ON movies(session_id);
CREATE INDEX idx_votes_session_id ON votes(session_id);
CREATE INDEX idx_votes_voter_identifier ON votes(voter_identifier);
CREATE INDEX idx_votes_movie_a_id ON votes(movie_a_id);
CREATE INDEX idx_votes_movie_b_id ON votes(movie_b_id);
CREATE INDEX idx_votes_winner_id ON votes(winner_id);


-- Note: To use gen_random_uuid() you might need to ensure the pgcrypto extension is enabled.
-- If not enabled by default on your PostgreSQL instance, you might need to run:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- This usually requires superuser privileges and is best run once per database manually.

COMMENT ON COLUMN sessions.id IS 'Unique identifier for the session (UUID)';
COMMENT ON COLUMN movies.session_id IS 'Foreign key referencing the session this movie belongs to';
COMMENT ON COLUMN movies.genres IS 'Array of genre strings, e.g., {"Sci-Fi", "Adventure"}';
COMMENT ON COLUMN votes.session_id IS 'Foreign key referencing the session this vote belongs to';
COMMENT ON COLUMN votes.voter_identifier IS 'Anonymized ID for a user making votes in a session';
COMMENT ON COLUMN votes.winner_id IS 'The movie ID that won the pair; NULL if skipped or a tie (if ties allowed)'; 