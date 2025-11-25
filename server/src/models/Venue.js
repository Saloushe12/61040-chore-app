const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
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
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  hours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  tags: [{
    type: String,
    enum: ['bar', 'club', 'restaurant', 'lounge', 'pub', 'brewery', 'other']
  }],
  currentStatus: {
    type: String,
    enum: ['open', 'closed', 'door_hold'],
    default: 'open'
  },
  staticAttributes: {
    coverCharge: Number,
    accessibility: Boolean,
    minAge: Number,
    capacity: Number
  },
  operatorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure location is indexed for geospatial queries
venueSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Venue', venueSchema);
