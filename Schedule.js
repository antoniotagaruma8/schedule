const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    required: true
  }
}, { timestamps: true }); // `timestamps: true` adds createdAt and updatedAt fields automatically

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;