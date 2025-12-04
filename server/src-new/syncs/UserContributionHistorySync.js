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
  return async function userContributionHistorySync({ userId, limit = 20 }) {
    const [waitReports, vibeReports] = await Promise.all([
      waitReportConcept._getUserReports({ userId, limit }),
      vibeReportConcept._getUserReports({ userId, limit }),
    ]);

    return {
      waitReports,
      vibeReports,
    };
  };
}

module.exports = {
  buildUserContributionHistorySync,
};


