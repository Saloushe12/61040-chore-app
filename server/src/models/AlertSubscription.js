const mongoose = require('mongoose');

const alertSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  condition: {
    waitBelowMinutes: Number,
    crowdDensityIn: [{
      type: String,
      enum: ['low', 'medium', 'high']
    }],
    eventTag: String
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AlertSubscription', alertSubscriptionSchema);
