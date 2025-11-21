const express = require('express');
const app = express();

// This is the main entry point for your Vercel serverless function.
// Your Express app is exported at the end of this file.

// Define a route for the root path ('/') to handle incoming requests.
app.get('/', (req, res) => {
  res.send('Welcome! Your Express server is running on Vercel.');
});

// Example API route: try visiting /api/greet?name=yourname
app.get('/api/greet', (req, res) => {
  const { name = 'World' } = req.query;
  res.json({ message: `Hello, ${name}!` });
});

// Export the app to be used by Vercel. Vercel will automatically
// handle the server listening part.
module.exports = app;