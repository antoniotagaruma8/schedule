const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file
const apiRoutes = require('./api/routes'); // Import the new router

const app = express();

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

const { MONGODB_URI, PORT = 3000 } = process.env;

// Add a check to ensure the MONGODB_URI is provided.
if (!MONGODB_URI) {
  throw new Error('FATAL ERROR: MONGODB_URI is not defined in the environment variables.');
}

// Connect to MongoDB
const connectDB = async () => {
  // Use existing connection if available
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  // Otherwise, create a new connection
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB');
  } catch (err) {
    console.error('Could not connect to MongoDB:', err);
    // Exit process with failure in case of connection error
    process.exit(1);
  }
};

// Connect to DB before starting the app logic
connectDB();

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

// --- API Endpoints for Schedules ---

// Use the API routes
app.use('/api', apiRoutes);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack for debugging

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation Error', errors: err.errors });
  }

  // Default to 500 server error
  res.status(500).json({ message: 'An internal server error occurred' });
});

// Start the server for local development if not in a serverless environment
if (process.env.NODE_ENV !== 'test') { // Avoid starting server during tests
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app to be used by Vercel. Vercel will automatically
// handle the server listening part.
module.exports = app;