const mongoose = require('mongoose');

const venueStatsSnapshotSchema = new mongoose.Schema({
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  avgReportedWait: {
    type: Number,
    min: 0
  },
  avgCrowdDensity: {
    type: Number,
    min: 0,
    max: 2 // 0=low, 1=medium, 2=high
  },
  reportCount: {
    type: Number,
    default: 0
  },
  derivedPeakScore: {
    type: Number,
    min: 0,
    max: 100
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6 // 0=Sunday, 6=Saturday
  },
  hourOfDay: {
    type: Number,
    min: 0,
    max: 23
  }
});

module.exports = mongoose.model('VenueStatsSnapshot', venueStatsSnapshotSchema);
