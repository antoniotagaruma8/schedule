const express = require('express');
const Schedule = require('../Schedule.js'); // Correct path to your model

const router = express.Router();

// A simple middleware to wrap async route handlers and catch errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET all schedule items
router.get('/schedules', asyncHandler(async (req, res) => {
  const schedules = await Schedule.find().sort({ date: 1 });
  res.status(200).json(schedules);
}));

// GET a specific schedule item by ID
router.get('/schedules/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    return res.status(404).json({ message: 'Schedule not found' });
  }
  res.status(200).json(schedule);
}));

// POST a new schedule item
router.post('/schedules', asyncHandler(async (req, res) => {
  const newSchedule = new Schedule(req.body);
  await newSchedule.save();
  res.status(201).json(newSchedule);
}));

// PUT (update) a specific schedule item by ID
router.put('/schedules/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedSchedule = await Schedule.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!updatedSchedule) {
    return res.status(404).json({ message: 'Schedule not found' });
  }
  res.status(200).json(updatedSchedule);
}));

// DELETE a specific schedule item by ID
router.delete('/schedules/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedSchedule = await Schedule.findByIdAndDelete(id);
  if (!deletedSchedule) {
    return res.status(404).json({ message: 'Schedule not found' });
  }
  res.status(200).json({ message: 'Schedule deleted successfully' });
}));

module.exports = router;