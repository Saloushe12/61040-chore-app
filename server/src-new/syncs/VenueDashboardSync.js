// VenueDashboardSync
// Spec:
// # sync: VenueDashboardSync
// ## when
// Request.getVenueDashboard(operatorUserId)
// ## then
// returns managed venues with live stats and events
// ## notes
// - Operators see only aggregated reports; no raw user data.
//
// Plain JS implementation using concept helpers.

const VenueConcept = require('../concepts/VenueConcept');
const VenueEventConcept = require('../concepts/VenueEventConcept');
const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');

/**
 * Compute lightweight metrics for operator dashboard (reusing logic from
 * NearbyVenues/VenueDetail but simplified).
 */
async function computeDashboardMetrics({
  venueId,
  waitReportConcept,
  vibeReportConcept,
  timeWindowMinutes = 30,
}) {
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

/**
 * Build a VenueDashboardSync function.
 *
 * @param {Object} deps
 * @param {import('../concepts/VenueConcept')} deps.venueConcept
 * @param {import('../concepts/VenueEventConcept')} deps.venueEventConcept
 * @param {import('../concepts/WaitReportConcept')} deps.waitReportConcept
 * @param {import('../concepts/VibeReportConcept')} deps.vibeReportConcept
 *
 * @returns {Function} venueDashboardSync({ operatorUserId }) → { venues: [...] }
 */
function buildVenueDashboardSync({
  venueConcept,
  venueEventConcept,
  waitReportConcept,
  vibeReportConcept,
}) {
  return async function venueDashboardSync({ operatorUserId }) {
    // 1. Find venues managed by this operator
    const venues = await venueConcept._getVenuesByOperator({ operatorUserId });

    const now = new Date();
    const dashboardVenues = [];

    for (const v of venues) {
      const venueId = v._id.toHexString();

      // 2. Compute simple metrics
      const metrics = await computeDashboardMetrics({
        venueId,
        waitReportConcept,
        vibeReportConcept,
      });

      // 3. Load upcoming events for this venue
      const events = await venueEventConcept._getEventsForFilters({
        venueId,
        startAfter: now,
        startBefore: null,
      });

      dashboardVenues.push({
        _id: venueId, // Add _id for compatibility with frontend
        venueId,
        name: v.name,
        address: v.address,
        currentStatus: v.currentStatus,
        tags: v.tags,
        metrics,
        upcomingEvents: events, // Keep as upcomingEvents to match frontend
      });
    }

    return { venues: dashboardVenues };
  };
}

module.exports = {
  buildVenueDashboardSync,
};


