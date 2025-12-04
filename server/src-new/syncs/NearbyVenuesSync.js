// NearbyVenuesSync
// Spec:
// # sync: NearbyVenuesSync
// ## when
// Request.getNearbyVenues(userLocation)
// ## then
// returns venues with aggregated wait, vibe, and event information
// ## notes
// - Aggregations incorporate only geofence-verified reports.
//
// This file provides a concrete implementation of that sync using the
// concept classes and the raw MongoDB-based storage in src-new.

const { getCollection } = require('../utils/database');
const { calculateDistance } = require('../services/geofence');

/**
 * Compute current metrics for a single venue based on recent WaitReports and VibeReports.
 * This mirrors the logic in server/src/services/aggregation.js but operates on
 * plain arrays returned from the concept layer instead of Mongoose models.
 *
 * @param {Object} params
 * @param {string} params.venueId
 * @param {import('../concepts/WaitReportConcept')} params.waitReportConcept
 * @param {import('../concepts/VibeReportConcept')} params.vibeReportConcept
 * @param {number} [params.timeWindowMinutes]
 */
async function computeVenueMetrics({
  venueId,
  waitReportConcept,
  vibeReportConcept,
  timeWindowMinutes = 30,
}) {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  // Wait reports: only geofence-verified
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

  // Vibe reports: only geofence-verified
  const vibeReports = await vibeReportConcept._getRecentReports({
    venueId,
    since: cutoffTime,
  });
  const filteredVibeReports = vibeReports.filter((r) => r.geofenceVerified);

  // Mode for categorical data
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

  // Top music tags (up to 3)
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
 * NearbyVenuesSync implementation.
 *
 * @param {Object} deps
 * @param {import('../concepts/WaitReportConcept')} deps.waitReportConcept
 * @param {import('../concepts/VibeReportConcept')} deps.vibeReportConcept
 *
 * @returns {Function} a function that takes { latitude, longitude, radiusMeters, tags? }
 * and returns { venues: [...] } with metrics attached.
 */
function buildNearbyVenuesSync({ waitReportConcept, vibeReportConcept }) {
  return async function nearbyVenuesSync({
    latitude,
    longitude,
    radiusMeters,
    tags,
  }) {
    const venuesCollection = await getCollection('Venue.venues');

    // Fetch all venues; in a production-ready version, we'd use geospatial
    // indexes and queries. Here we compute distances in JS using Haversine.
    const allVenues = await venuesCollection.find({}).toArray();

    const tagFilter =
      tags && tags.length
        ? new Set(tags)
        : null;

    const filteredVenues = [];

    for (const v of allVenues) {
      if (!v.location || v.location.lat === undefined || v.location.lon === undefined) {
        continue;
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        v.location.lat,
        v.location.lon
      );

      if (radiusMeters !== undefined && distance > radiusMeters) {
        continue;
      }

      if (tagFilter && Array.isArray(v.tags) && v.tags.length) {
        const hasTag = v.tags.some((t) => tagFilter.has(t));
        if (!hasTag) continue;
      }

      filteredVenues.push({ venue: v, distance });
    }

    // Compute metrics for each venue
    const resultVenues = [];
    for (const { venue, distance } of filteredVenues) {
      const metrics = await computeVenueMetrics({
        venueId: venue._id.toHexString(),
        waitReportConcept,
        vibeReportConcept,
      });

      const venueIdString = venue._id.toHexString();
      resultVenues.push({
        _id: venueIdString, // Frontend expects _id
        venueId: venueIdString, // Also include venueId for consistency
        name: venue.name,
        address: venue.address,
        location: venue.location,
        tags: venue.tags,
        currentStatus: venue.currentStatus,
        staticAttributes: venue.staticAttributes,
        operatorUserId: venue.operatorUserId
          ? venue.operatorUserId.toHexString()
          : undefined,
        createdAt: venue.createdAt,
        distanceMeters: Math.round(distance),
        metrics,
      });
    }

    return { venues: resultVenues };
  };
}

module.exports = {
  buildNearbyVenuesSync,
};


