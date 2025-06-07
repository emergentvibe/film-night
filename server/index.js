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

// API routes must be registered before the static file serving and catchall handler
app.use('/api/sessions', sessionsRouter);

// Serve static files from the React app build directory
// In our new Dockerfile, the public folder is at the root of the app directory
const publicPath = path.join(__dirname, 'public');

// This check is important: only serve static files and the catchall
// route in a production environment. In development, Vite handles this.
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(publicPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

app.get('/api', (req, res) => { // Changed base API check to /api
  res.send('Film Night API is running!');
});

// For development, you might still want to listen on 0.0.0.0
// For Fly.io, it handles the external binding.
const host = '0.0.0.0';

app.listen(port, host, () => { 
  if (db.pool) { 
    console.log(`Server listening on ${host}:${port}. DB connection attempt made via db module.`);
  } else {
    console.log(`Server listening on ${host}:${port}. DB module might not have initialized pool correctly.`);
  }
});

module.exports = app; // For potential testing 