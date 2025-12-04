// Concept-based notifications service for src-new
// Replaces dependency on server/src/services/notifications.js

const AlertSubscriptionConcept = require('../concepts/AlertSubscriptionConcept');
const VenueConcept = require('../concepts/VenueConcept');
const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');

const alertConcept = new AlertSubscriptionConcept();
const venueConcept = new VenueConcept();
const waitReportConcept = new WaitReportConcept();
const vibeReportConcept = new VibeReportConcept();

// Compute current metrics similarly to src/services/aggregation.js
async function getCurrentVenueMetricsConcept(venueId, timeWindowMinutes = 30) {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const waitReports = await waitReportConcept._getRecentReports({
    venueId,
    since: cutoffTime,
  });
  const filteredWaitReports = waitReports.filter((r) => r.geofenceVerified);

  const avgWait =
    filteredWaitReports.length > 0
      ? filteredWaitReports.reduce(
          (sum, r) => sum + (r.reportedWaitMinutes || 0),
          0
        ) / filteredWaitReports.length
      : null;

  const vibeReports = await vibeReportConcept._getRecentReports({
    venueId,
    since: cutoffTime,
  });
  const filteredVibeReports = vibeReports.filter((r) => r.geofenceVerified);

  const mode = (values) => {
    if (!values.length) return null;
    const counts = {};
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }
    return Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b
    );
  };

  const crowdDensity = mode(filteredVibeReports.map((r) => r.crowdDensity));

  return {
    avgWait,
    crowdDensity,
    reportCount: filteredWaitReports.length + filteredVibeReports.length,
  };
}

// Get aggregated metrics for multiple venues (similar to src/services/aggregation.js)
async function getMultipleVenueMetricsConcept(venueIds, timeWindowMinutes = 30) {
  const metricsMap = {};

  for (const venueId of venueIds) {
    metricsMap[venueId] = await getCurrentVenueMetricsConcept(venueId, timeWindowMinutes);
  }

  return metricsMap;
}

// Trigger alerts for a venue based on current metrics and active subscriptions
const triggerAlertsForVenue = async (venueId, io) => {
  try {
    const metrics = await getCurrentVenueMetricsConcept(venueId);
    const [venue] = await venueConcept._getVenueDetails({ venueId });

    if (!venue) return;

    // Fetch all active subscriptions for this venue
    const subsCollection = await alertConcept._subs();
    const activeSubscriptions = await subsCollection
      .find({ venueId: venueId, active: true })
      .toArray();

    for (const sub of activeSubscriptions) {
      let shouldTrigger = false;
      let message = '';

      if (
        sub.condition.waitBelowMinutes !== undefined &&
        metrics.avgWait !== null &&
        metrics.avgWait < sub.condition.waitBelowMinutes
      ) {
        shouldTrigger = true;
        message = `Wait time at ${venue.name} is now ${Math.round(
          metrics.avgWait
        )} minutes!`;
      }

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
        io.to(sub.userId.toString()).emit('alert', {
          subscriptionId: sub._id.toString(),
          venueId,
          venueName: venue.name,
          message,
          metrics,
          timestamp: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Concept error triggering alerts:', error);
  }
};

// Trigger alerts for event-based conditions
const triggerEventAlerts = async (venueId, eventTag, io) => {
  try {
    const [venue] = await venueConcept._getVenueDetails({ venueId });
    if (!venue) return;

    const subsCollection = await alertConcept._subs();
    const subscriptions = await subsCollection
      .find({
        venueId,
        active: true,
        'condition.eventTag': eventTag,
      })
      .toArray();

    for (const sub of subscriptions) {
      if (io) {
        io.to(sub.userId.toString()).emit('alert', {
          subscriptionId: sub._id.toString(),
          venueId,
          venueName: venue.name,
          message: `Event "${eventTag}" is happening at ${venue.name}!`,
          eventTag,
          timestamp: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Concept error triggering event alerts:', error);
  }
};

module.exports = { 
  triggerAlertsForVenue, 
  triggerEventAlerts,
  getCurrentVenueMetricsConcept,
  getMultipleVenueMetricsConcept,
};


