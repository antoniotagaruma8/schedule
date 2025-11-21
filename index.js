const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// This is the main entry point for your Vercel serverless function.
// Your Express app is exported at the end of this file.

// Define a route for the root path ('/') to handle incoming requests.
app.get('/', (req, res) => {
  // Check database connection status
  const isConnected = mongoose.connection.readyState === 1;
  res.send(`Welcome! Your Express server is running on Vercel. MongoDB connected: ${isConnected}`);
});

// Example API route: try visiting /api/greet?name=yourname
app.get('/api/greet', (req, res) => {
  const { name = 'World' } = req.query;
  res.json({ message: `Hello, ${name}!` });
});

// Export the app to be used by Vercel. Vercel will automatically
// handle the server listening part.
module.exports = app;