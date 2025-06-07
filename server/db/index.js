const { Pool } = require('pg');
const path = require('path');

let pool;

if (process.env.DATABASE_URL) {
  // This block will be used by Fly.io production, which sets DATABASE_URL directly.
  const config = {
    connectionString: process.env.DATABASE_URL,
  };
  // The host override is not needed here because we are not using the proxy.
  pool = new Pool(config);
  console.log('Connecting to database using DATABASE_URL from environment.');
} else {
  // This block will be used for local development.
  // We explicitly load the .env file from the 'server' directory.
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  
  const config = {
    connectionString: process.env.DATABASE_URL,
  };

  // When running locally via `flyctl proxy`, the DB is at 127.0.0.1.
  // The hostname in DATABASE_URL is 'localhost', which on some systems
  // resolves to the IPv6 address '::1' first, causing connection errors.
  if (process.env.NODE_ENV !== 'production') {
    config.host = '127.0.0.1';
  }

  pool = new Pool(config);
  console.log('Connecting to database using .env file for local development.');
}

// Test the connection and export the query function
console.log('Attempting to connect to database...');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('PostgreSQL client: Error connecting to the database', err.stack);
  } else {
    console.log('PostgreSQL client: Database connected successfully:', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool // Export pool if direct access is needed elsewhere (e.g. transactions)
}; 