const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file
const Schedule = require('./Schedule.js'); // Import the Schedule model

const app = express();

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;

// Add a check to ensure the MONGODB_URI is provided.
if (!MONGODB_URI) {
  throw new Error('FATAL ERROR: MONGODB_URI is not defined in the environment variables.');
}

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

// --- API Endpoints for Schedules ---

// GET all schedule items
app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ date: 1 });
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedules', error });
  }
});

// GET a specific schedule item by ID
app.get('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedule', error });
  }
});

// POST a new schedule item
app.post('/api/schedules', async (req, res) => {
  try {
    const newSchedule = new Schedule(req.body);
    await newSchedule.save();
    res.status(201).json(newSchedule);
  } catch (error) {
    res.status(400).json({ message: 'Error creating schedule', error });
  }
});

// PUT (update) a specific schedule item by ID
app.put('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSchedule = await Schedule.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.status(200).json(updatedSchedule);
  } catch (error) {
    res.status(400).json({ message: 'Error updating schedule', error });
  }
});

// DELETE a specific schedule item by ID
app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSchedule = await Schedule.findByIdAndDelete(id);
    if (!deletedSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting schedule', error });
  }
});

// Start the server for local development if not in a serverless environment
if (process.env.NODE_ENV !== 'test') { // Avoid starting server during tests
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app to be used by Vercel. Vercel will automatically
// handle the server listening part.
module.exports = app;