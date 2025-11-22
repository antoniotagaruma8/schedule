const express = require('express');
const mongoose = require('mongoose');
const scheduleRoutes = require('./routes'); // Import routes from the same directory

// Check if environment variables are loaded, especially in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Use the schedule routes
app.use(scheduleRoutes);

// A simple test route
app.get('/', (req, res) => {
  res.send('Express on Vercel with Mongoose!');
});

// Connect to MongoDB
// Make sure to set MONGODB_URI in your Vercel project environment variables
const dbUri = process.env.MONGODB_URI;

if (!dbUri) {
  console.error('MongoDB URI is not set. Please set the MONGODB_URI environment variable.');
} else {
  mongoose.connect(dbUri)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// Export the app for Vercel
module.exports = app;