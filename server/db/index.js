const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Fly.io and Heroku Postgres connections
    }
  });
  console.log('Connecting to database using DATABASE_URL.');
} else {
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // Optional: add connection timeout, max connections, etc.
    // connectionTimeoutMillis: 2000,
    // max: 20, 
  });
  console.log('Connecting to database using individual DB_USER/DB_HOST etc. variables.');
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