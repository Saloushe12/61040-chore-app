// VenueDetailSync
// Spec:
// # sync: VenueDetailSync
// ## when
// Request.getVenueDetail(venueId)
// ## then
// returns venue profile, live metrics, events, historical snapshots
// ## notes
// - Report lists are anonymized and batched.
//
// This implementation is a plain JS function that can be wired to HTTP
// later (e.g., via a Requesting-style server or a small Express adapter).

const { getCollection } = require('../utils/database');
const VenueStatsSnapshotConcept = require('../concepts/VenueStatsSnapshotConcept');
const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');
const VenueEventConcept = require('../concepts/VenueEventConcept');
const VenueConcept = require('../concepts/VenueConcept');
const { calculateDistance } = require('../services/geofence');

/**
 * Compute current metrics for a single venue (shared with NearbyVenuesSync),
 * but kept local here to avoid cross-module cycles.
 */
async function computeVenueMetricsForDetail({
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
  const noiseLevel = mode(filteredVibeReports.map((r) => r.noiseLevel));
  const energyLevel = mode(filteredVibeReports.map((r) => r.energyLevel));

  const musicTagCounts = {};
  for (const r of filteredVibeReports) {
    for (const tag of r.musicTags || []) {
      musicTagCounts[tag] = (musicTagCounts[tag] || 0) + 1;
    }
  }
  const musicTags = Object.entries(musicTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return {
    avgWait,
    crowdDensity,
    noiseLevel,
    energyLevel,
    musicTags,
    reportCount: filteredWaitReports.length + filteredVibeReports.length,
    waitReportCount: filteredWaitReports.length,
    vibeReportCount: filteredVibeReports.length,
    lastUpdated: new Date(),
  };
}

/**
 * Build a VenueDetailSync function.
 *
 * @param {Object} deps
 * @param {import('../concepts/VenueConcept')} deps.venueConcept
 * @param {import('../concepts/WaitReportConcept')} deps.waitReportConcept
 * @param {import('../concepts/VibeReportConcept')} deps.vibeReportConcept
 * @param {import('../concepts/VenueEventConcept')} deps.venueEventConcept
 * @param {import('../concepts/VenueStatsSnapshotConcept')} deps.snapshotConcept
 *
 * @returns {Function} venueDetailSync({ venueId, userLocation? }) → { venue, metrics, events, forecast, history }
 */
function buildVenueDetailSync({
  venueConcept,
  waitReportConcept,
  vibeReportConcept,
  venueEventConcept,
  snapshotConcept,
}) {
  return async function venueDetailSync({ venueId, userLocation }) {
    // 1. Load venue profile
    const [venueInfo] = await venueConcept._getVenueDetails({ venueId });
    if (!venueInfo) {
      return { error: 'Venue not found' };
    }

    // 2. Compute live metrics
    const metrics = await computeVenueMetricsForDetail({
      venueId,
      waitReportConcept,
      vibeReportConcept,
    });

    // 3. Load upcoming/current events for this venue
    const now = new Date();
    const events = await venueEventConcept._getEventsForFilters({
      venueId,
      startDate: now,
      endDate: null,
    });

    // 4. Load forecast from snapshots (simple wrapper around existing service)
    // Here we mirror the same logic as services/forecasting.getPeakForecast:
    const today = new Date();
    const targetDay = today.getDay();
    const fourWeeksAgo = new Date(
      today.getTime() - 28 * 24 * 60 * 60 * 1000
    );
    const snapshotsForForecast =
      await snapshotConcept._getSnapshotsForForecast({
        venueId,
        dayOfWeek: targetDay,
        since: fourWeeksAgo,
      });

    // Group by hour of day to compute a simple forecast
    const hourly = {};
    for (const s of snapshotsForForecast) {
      const h = s.hourOfDay;
      if (!hourly[h]) {
        hourly[h] = {
          sumPeak: 0,
          sumWait: 0,
          sumCrowd: 0,
          count: 0,
        };
      }
      hourly[h].sumPeak += s.derivedPeakScore || 0;
      hourly[h].sumWait += s.avgReportedWait || 0;
      hourly[h].sumCrowd += s.avgCrowdDensity || 0;
      hourly[h].count += 1;
    }

    const forecast = Object.keys(hourly)
      .map((hour) => {
        const data = hourly[hour];
        return {
          hour: parseInt(hour, 10),
          peakScore: Math.round(data.sumPeak / data.count),
          avgWait: Math.round(data.sumWait / data.count),
          avgCrowdDensity: data.sumCrowd / data.count,
          confidence: Math.min(data.count / 4, 1),
        };
      })
      .sort((a, b) => a.hour - b.hour);

    const totalDataPoints = snapshotsForForecast.length;
    const overallConfidence = Math.min(totalDataPoints / 20, 1);

    // 5. Optionally compute distance from userLocation, if provided
    let distanceMeters = undefined;
    if (userLocation && venueInfo.location) {
      const { lat, lon } = venueInfo.location;
      distanceMeters = Math.round(
        calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          lat,
          lon
        )
      );
    }

    return {
      venue: {
        ...venueInfo,
        distanceMeters,
      },
      metrics,
      events,
      forecast: {
        forecast,
        confidence: overallConfidence,
        dayOfWeek: targetDay,
        dataPoints: totalDataPoints,
      },
    };
  };
}

module.exports = {
  buildVenueDetailSync,
};


