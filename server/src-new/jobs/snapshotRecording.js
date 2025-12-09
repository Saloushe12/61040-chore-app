// Automatic snapshot recording job
// Runs every 15 minutes to record venue stats snapshots
// Spec requirement: recordStatsSnapshot(venueId, aggregates) - saves periodic aggregates (every 15 minutes)

const VenueConcept = require('../concepts/VenueConcept');
const VenueStatsSnapshotConcept = require('../concepts/VenueStatsSnapshotConcept');
const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');
const { getCollection } = require('../utils/database');

const venueConcept = new VenueConcept();
const snapshotConcept = new VenueStatsSnapshotConcept();
const waitReportConcept = new WaitReportConcept();
const vibeReportConcept = new VibeReportConcept();

/**
 * Compute aggregated metrics for a venue over the last 30 minutes
 */
async function computeVenueAggregates(venueId, timeWindowMinutes = 30) {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  // Get recent wait reports (geofence-verified only)
  const waitReports = await waitReportConcept._getRecentReports({
    venueId,
    since: cutoffTime,
  });
  const verifiedWaitReports = waitReports.filter((r) => r.geofenceVerified);

  // Get recent vibe reports (geofence-verified only)
  const vibeReports = await vibeReportConcept._getRecentReports({
    venueId,
    since: cutoffTime,
  });
  const verifiedVibeReports = vibeReports.filter((r) => r.geofenceVerified);

  // Compute average wait time
  const avgReportedWait =
    verifiedWaitReports.length > 0
      ? verifiedWaitReports.reduce(
          (sum, r) => sum + (r.reportedWaitMinutes || 0),
          0
        ) / verifiedWaitReports.length
      : null;

  // Compute average crowd density (map to numeric: low=0, medium=1, high=2)
  const densityMap = { low: 0, medium: 1, high: 2 };
  const crowdDensities = verifiedVibeReports
    .map((r) => densityMap[r.crowdDensity])
    .filter((d) => d !== undefined);
  const avgCrowdDensity =
    crowdDensities.length > 0
      ? crowdDensities.reduce((sum, d) => sum + d, 0) / crowdDensities.length
      : null;

  // Total report count
  const reportCount = verifiedWaitReports.length + verifiedVibeReports.length;

  // Simple peak score: higher wait + higher crowd = higher score (0-100 scale)
  let derivedPeakScore = null;
  if (avgReportedWait !== null || avgCrowdDensity !== null) {
    const waitScore = avgReportedWait !== null ? Math.min(avgReportedWait / 60, 1) * 50 : 0;
    const crowdScore = avgCrowdDensity !== null ? (avgCrowdDensity / 2) * 50 : 0;
    derivedPeakScore = Math.round(waitScore + crowdScore);
  }

  return {
    avgReportedWait,
    avgCrowdDensity,
    reportCount,
    derivedPeakScore,
  };
}

/**
 * Record snapshots for all venues
 */
async function recordAllVenueSnapshots() {
  try {
    console.log(`[Snapshot Job] Starting snapshot recording at ${new Date().toISOString()}`);

    const venuesCollection = await getCollection('Venue.venues');
    const allVenues = await venuesCollection.find({}).toArray();

    let successCount = 0;
    let errorCount = 0;

    for (const venue of allVenues) {
      try {
        const venueId = venue._id.toHexString();
        const aggregates = await computeVenueAggregates(venueId);

        await snapshotConcept.recordStatsSnapshot({
          venueId,
          aggregates,
        });

        successCount++;
      } catch (error) {
        console.error(`[Snapshot Job] Error recording snapshot for venue ${venue._id}:`, error);
        errorCount++;
      }
    }

    console.log(
      `[Snapshot Job] Completed: ${successCount} snapshots recorded, ${errorCount} errors`
    );
  } catch (error) {
    console.error('[Snapshot Job] Fatal error:', error);
  }
}

/**
 * Start the snapshot recording job
 * Runs every 15 minutes
 */
function startSnapshotJob() {
  // Run immediately on start
  recordAllVenueSnapshots();

  // Then run every 15 minutes
  const interval = 15 * 60 * 1000; // 15 minutes in milliseconds
  setInterval(() => {
    recordAllVenueSnapshots();
  }, interval);

  console.log('[Snapshot Job] Started: will run every 15 minutes');
}

module.exports = {
  startSnapshotJob,
  recordAllVenueSnapshots,
};

