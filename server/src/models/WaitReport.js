const mongoose = require('mongoose');

const waitReportSchema = new mongoose.Schema({
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedWaitMinutes: {
    type: Number,
    required: true,
    min: 0,
    max: 300 // 5 hours max
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['user', 'venue_override'],
    default: 'user'
  },
  geofenceVerified: {
    type: Boolean,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  }
});

module.exports = mongoose.model('WaitReport', waitReportSchema);
