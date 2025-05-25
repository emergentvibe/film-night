require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const path = require('path'); // Added for serving static files
const db = require('./db'); // Import the db module to initialize the pool connection
const sessionsRouter = require('./routes/sessions');

const app = express();
// Use environment variable for port or default to 3001. 
// Fly.io will set the PORT environment variable.
const port = process.env.PORT || 3001; 

app.use(express.json()); // Middleware to parse JSON bodies

// Logging middleware (can be refined or removed for production)
app.use('/api/sessions', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SERVER_INDEX] Request to /api/sessions: ${req.method} ${req.originalUrl}`);
    console.log(`[SERVER_INDEX] Request body:`, req.body);
  }
  next();
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  // Corrected path: ./client/dist relative to server/index.js
  const clientBuildPath = path.join(__dirname, 'client/dist');
  app.use(express.static(clientBuildPath));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get('*', (req, res, next) => {
    if (!req.originalUrl.startsWith('/api')) { // Don't serve index.html for API routes
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    } else {
        next(); // Important for API 404s to not be overridden
    }
  });
}

app.get('/api', (req, res) => { // Changed base API check to /api
  res.send('Film Night API is running!');
});

// API routes
app.use('/api/sessions', sessionsRouter);

// For development, you might still want to listen on 0.0.0.0
// For Fly.io, it handles the external binding.
const host = process.env.NODE_ENV === 'production' ? '::' : '0.0.0.0';

app.listen(port, host, () => { 
  if (db.pool) { 
    console.log(`Server listening on ${host}:${port}. DB connection attempt made via db module.`);
  } else {
    console.log(`Server listening on ${host}:${port}. DB module might not have initialized pool correctly.`);
  }
});

module.exports = app; // For potential testing 