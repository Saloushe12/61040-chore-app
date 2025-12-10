// UserContributionHistorySync
// Spec:
// # sync: UserContributionHistorySync
// ## when
// Request.getContributionHistory(userId)
// ## then
// returns user’s WaitReports and VibeReports
// ## notes
// - Reinforces transparency and user trust.
//
// Plain JS implementation using concept helpers.

const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');
const VenueConcept = require('../concepts/VenueConcept');

/**
 * Build a UserContributionHistorySync function.
 *
 * @param {Object} deps
 * @param {import('../concepts/WaitReportConcept')} deps.waitReportConcept
 * @param {import('../concepts/VibeReportConcept')} deps.vibeReportConcept
 *
 * @returns {Function} userContributionHistorySync({ userId, limit? }) → { waitReports, vibeReports }
 */
function buildUserContributionHistorySync({
  waitReportConcept,
  vibeReportConcept,
}) {
  const venueConcept = new VenueConcept();
  
  return async function userContributionHistorySync({ userId, limit = 20 }) {
    const [waitReports, vibeReports] = await Promise.all([
      waitReportConcept._getUserReports({ userId, limit }),
      vibeReportConcept._getUserReports({ userId, limit }),
    ]);

    // Enrich reports with venue names
    const venueIds = new Set([
      ...waitReports.map(r => r.venueId.toString()),
      ...vibeReports.map(r => r.venueId.toString())
    ]);

    const venueMap = new Map();
    for (const venueId of venueIds) {
      const [venue] = await venueConcept._getVenueDetails({ venueId });
      if (venue) {
        venueMap.set(venueId, venue.name);
      }
    }

    // Add venue names to reports
    const enrichedWaitReports = waitReports.map(report => ({
      ...report,
      venueName: venueMap.get(report.venueId.toString()) || 'Unknown Venue'
    }));

    const enrichedVibeReports = vibeReports.map(report => ({
      ...report,
      venueName: venueMap.get(report.venueId.toString()) || 'Unknown Venue'
    }));

    return {
      waitReports: enrichedWaitReports,
      vibeReports: enrichedVibeReports,
    };
  };
}

module.exports = {
  buildUserContributionHistorySync,
};


