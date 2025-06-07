const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { protocol, username, password, port, pathname } = new URL(process.env.DATABASE_URL);

const pool = new Pool({
  user: username,
  password: password,
  host: '127.0.0.1', // Force IPv4 for the flyctl proxy
  port: port,
  database: pathname.slice(1), // Remove leading '/' from the pathname
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create Sessions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table "sessions" created or already exists.');

    // Create Movies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        year INTEGER,
        director VARCHAR(255),
        runtime VARCHAR(50),
        genres TEXT[],
        synopsis TEXT,
        poster_url TEXT,
        rating VARCHAR(50),
        trailer_url TEXT,
        tmdb_id TEXT,
        watch_providers JSONB,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, title)
      );
    `);
    console.log('Table "movies" created or already exists.');

    // Create Votes Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        movie_a_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        movie_b_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        winner_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        voter_identifier TEXT NOT NULL,
        voted_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT chk_different_movies CHECK (movie_a_id <> movie_b_id)
      );
    `);
    console.log('Table "votes" created or already exists.');

    await client.query('COMMIT');
    console.log('Database schema created successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
};

createTables().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}).finally(() => {
  pool.end();
}); 