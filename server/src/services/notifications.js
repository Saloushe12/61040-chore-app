const AlertSubscription = require('../models/AlertSubscription');
const Venue = require('../models/Venue');
const { getCurrentVenueMetrics } = require('./aggregation');

// Check and trigger alerts for a venue
const triggerAlertsForVenue = async (venueId, io) => {
  try {
    const metrics = await getCurrentVenueMetrics(venueId);
    const venue = await Venue.findById(venueId);

    if (!venue) return;

    const activeSubscriptions = await AlertSubscription.find({
      venueId,
      active: true
    }).populate('userId');

    for (const sub of activeSubscriptions) {
      let shouldTrigger = false;
      let message = '';

      // Check wait time condition
      if (
        sub.condition.waitBelowMinutes !== undefined &&
        metrics.avgWait !== null &&
        metrics.avgWait < sub.condition.waitBelowMinutes
      ) {
        shouldTrigger = true;
        message = `Wait time at ${venue.name} is now ${Math.round(metrics.avgWait)} minutes!`;
      }

      // Check crowd density condition
      if (
        sub.condition.crowdDensityIn &&
        sub.condition.crowdDensityIn.length > 0 &&
        metrics.crowdDensity &&
        sub.condition.crowdDensityIn.includes(metrics.crowdDensity)
      ) {
        shouldTrigger = true;
        message = `Crowd level at ${venue.name} is now ${metrics.crowdDensity}!`;
      }

      if (shouldTrigger && io) {
        // Emit via Socket.io to user's room
        io.to(sub.userId._id.toString()).emit('alert', {
          subscriptionId: sub._id,
          venueId,
          venueName: venue.name,
          message,
          metrics,
          timestamp: new Date()
        });
      }
    }
  } catch (error) {
    console.error('Error triggering alerts:', error);
  }
};

// Check alerts for event-based conditions
const triggerEventAlerts = async (venueId, eventTag, io) => {
  try {
    const venue = await Venue.findById(venueId);
    if (!venue) return;

    const subscriptions = await AlertSubscription.find({
      venueId,
      active: true,
      'condition.eventTag': eventTag
    }).populate('userId');

    for (const sub of subscriptions) {
      if (io) {
        io.to(sub.userId._id.toString()).emit('alert', {
          subscriptionId: sub._id,
          venueId,
          venueName: venue.name,
          message: `Event "${eventTag}" is happening at ${venue.name}!`,
          eventTag,
          timestamp: new Date()
        });
      }
    }
  } catch (error) {
    console.error('Error triggering event alerts:', error);
  }
};

module.exports = { triggerAlertsForVenue, triggerEventAlerts };
