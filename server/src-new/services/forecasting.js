// Forecasting service for src-new
// Uses VenueStatsSnapshotConcept instead of Mongoose models
// Provides peak time forecasting based on historical snapshots

const VenueStatsSnapshotConcept = require('../concepts/VenueStatsSnapshotConcept');

/**
 * Get peak time forecast based on historical snapshots
 * @param {string} venueId
 * @param {number|null} dayOfWeek - 0-6 (Sunday-Saturday), or null for current day
 * @returns {Promise<{forecast: Array, confidence: number, dayOfWeek: number, dataPoints: number}>}
 */
async function getPeakForecast(venueId, dayOfWeek = null) {
  const snapshotConcept = new VenueStatsSnapshotConcept();
  const now = new Date();
  const targetDayOfWeek = dayOfWeek !== null ? dayOfWeek : now.getDay();

  // Get snapshots from same day of week, last 4 weeks
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const snapshots = await snapshotConcept._getSnapshotsForForecast({
    venueId,
    dayOfWeek: targetDayOfWeek,
    since: fourWeeksAgo,
  });

  if (snapshots.length === 0) {
    return {
      forecast: [],
      confidence: 0,
      message: 'Insufficient historical data for forecast',
      dayOfWeek: targetDayOfWeek,
      dataPoints: 0,
    };
  }

  // Group by hour and calculate average peak score
  const hourlyAverages = {};
  snapshots.forEach((s) => {
    const hour = s.hourOfDay;
    if (!hourlyAverages[hour]) {
      hourlyAverages[hour] = { sum: 0, count: 0, waitSum: 0, crowdSum: 0 };
    }
    hourlyAverages[hour].sum += s.derivedPeakScore || 0;
    hourlyAverages[hour].waitSum += s.avgReportedWait || 0;
    hourlyAverages[hour].crowdSum += s.avgCrowdDensity || 0;
    hourlyAverages[hour].count += 1;
  });

  const forecast = Object.keys(hourlyAverages)
    .map((hour) => {
      const data = hourlyAverages[hour];
      return {
        hour: parseInt(hour, 10),
        peakScore: Math.round(data.sum / data.count),
        avgWait: Math.round(data.waitSum / data.count),
        avgCrowdDensity: data.crowdSum / data.count,
        confidence: Math.min(data.count / 4, 1), // 0-1 based on data points
      };
    })
    .sort((a, b) => a.hour - b.hour);

  // Overall confidence based on total data points
  const totalDataPoints = snapshots.length;
  const overallConfidence = Math.min(totalDataPoints / 20, 1); // Need 20+ snapshots for full confidence

  return {
    forecast,
    confidence: overallConfidence,
    dayOfWeek: targetDayOfWeek,
    dataPoints: totalDataPoints,
  };
}

/**
 * Calculate peak score from current metrics (0-100)
 * This is used when recording snapshots to compute derivedPeakScore
 * @param {Object} metrics - { avgWait?: number|null, crowdDensity?: string, reportCount?: number }
 * @returns {number} peak score 0-100
 */
function calculatePeakScore(metrics) {
  let score = 0;

  // Wait time contribution (0-40 points)
  if (metrics.avgWait !== null && metrics.avgWait !== undefined) {
    // 0 min = 0 points, 60+ min = 40 points
    score += Math.min((metrics.avgWait / 60) * 40, 40);
  }

  // Crowd density contribution (0-40 points)
  const crowdScores = { low: 0, medium: 20, high: 40 };
  if (metrics.crowdDensity) {
    score += crowdScores[metrics.crowdDensity] || 0;
  }

  // Report count contribution (0-20 points)
  // More reports = more activity
  const reportCount = metrics.reportCount || 0;
  score += Math.min(reportCount * 2, 20);

  return Math.min(Math.round(score), 100);
}

module.exports = { getPeakForecast, calculatePeakScore };

