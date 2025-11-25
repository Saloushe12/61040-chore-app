const mongoose = require('mongoose');

const vibeReportSchema = new mongoose.Schema({
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
  crowdDensity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  noiseLevel: {
    type: String,
    enum: ['chill', 'moderate', 'loud'],
    required: true
  },
  energyLevel: {
    type: String,
    enum: ['low', 'medium', 'hype'],
    required: true
  },
  musicTags: [{
    type: String,
    enum: ['edm', 'hip_hop', 'jazz', 'rock', 'pop', 'country', 'latin', 'live_band', 'dj', 'none', 'other']
  }],
  createdAt: {
    type: Date,
    default: Date.now
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

module.exports = mongoose.model('VibeReport', vibeReportSchema);
