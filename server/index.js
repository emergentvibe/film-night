require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const path = require('path'); // Added for serving static files
const db = require('./db'); // Import the db module to initialize the pool connection
const sessionsRouter = require('./routes/sessions');
const cors = require('cors');

const app = express();
// Use environment variable for port or default to 3001. 
// Fly.io will set the PORT environment variable.
const port = process.env.PORT || 3001; 

// --- Startup Environment Variable Check ---
// Essential for production debugging.
const requiredEnvVars = ['DATABASE_URL', 'TMDB_API_KEY', 'ANTHROPIC_API_KEY'];
let missingVars = false;
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`[Startup Error] Missing required environment variable: ${varName}`);
    missingVars = true;
  }
});

if (missingVars) {
  console.error("One or more required environment variables are missing. The application may not function correctly.");
  // In a stricter setup, you might want to exit here:
  // process.exit(1);
} else {
  console.log("[Startup] All required environment variables are present.");
}
// --- End Check ---

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Logging middleware (can be refined or removed for production)
app.use('/api/sessions', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SERVER_INDEX] Request to /api/sessions: ${req.method} ${req.originalUrl}`);
    console.log(`[SERVER_INDEX] Request body:`, req.body);
  }
  next();
});

// Serve static files from the React app build directory
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// The "catchall" handler: for any request that doesn't match one above,
// send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

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