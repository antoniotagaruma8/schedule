const express = require('express');
const Schedule = require('./schedule'); // The Mongoose model you defined

const router = express.Router();

// The frontend expects a single document containing all links.
// We'll use a known ID to always find and update the same document.
const SCHEDULE_DOCUMENT_ID = '6650a8d6207298e85332575a'; // Using a fixed ObjectId for the single document

/**
 * GET /schedule
 * Fetches the single document containing all schedule links.
 */
router.get('/schedule', async (req, res) => {
  try {
    // Find the one document that stores all our links.
    // The `lean()` method returns a plain JavaScript object for better performance.
    const schedule = await Schedule.findById(SCHEDULE_DOCUMENT_ID).lean();

    if (!schedule) {
      // If no schedule exists yet, return an empty links object.
      return res.status(200).json({ links: {} });
    }

    // The frontend expects the data in a { links: { ... } } format.
    res.status(200).json({ links: schedule.links || {} });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Error fetching schedule data from the database.' });
  }
});

/**
 * PUT /schedule
 * Updates (or creates) the single document with new schedule links.
 */
router.put('/schedule', async (req, res) => {
  const { links } = req.body;

  if (typeof links === 'undefined') {
    return res.status(400).json({ message: 'Request body must contain a "links" object.' });
  }

  try {
    // Use findByIdAndUpdate with `upsert: true` to create the document if it doesn't exist.
    // The `new: true` option returns the document after the update.
    await Schedule.findByIdAndUpdate(SCHEDULE_DOCUMENT_ID, { links }, { upsert: true, new: true });
    res.status(200).json({ message: 'Schedule updated successfully.' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Error saving schedule data to the database.' });
  }
});

module.exports = router;