const WaitReport = require('../models/WaitReport');
const VibeReport = require('../models/VibeReport');

// Get current venue metrics based on recent reports
const getCurrentVenueMetrics = async (venueId, timeWindowMinutes = 30) => {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  // Aggregate wait reports (only geofence verified)
  const waitReports = await WaitReport.find({
    venueId,
    createdAt: { $gte: cutoffTime },
    geofenceVerified: true
  });

  const avgWait =
    waitReports.length > 0
      ? waitReports.reduce((sum, r) => sum + r.reportedWaitMinutes, 0) / waitReports.length
      : null;

  // Aggregate vibe reports (only geofence verified)
  const vibeReports = await VibeReport.find({
    venueId,
    createdAt: { $gte: cutoffTime },
    geofenceVerified: true
  });

  // Calculate mode for categorical data (crowd density)
  let crowdDensity = null;
  if (vibeReports.length > 0) {
    const crowdCounts = { low: 0, medium: 0, high: 0 };
    vibeReports.forEach((r) => crowdCounts[r.crowdDensity]++);
    crowdDensity = Object.keys(crowdCounts).reduce((a, b) =>
      crowdCounts[a] > crowdCounts[b] ? a : b
    );
  }

  // Calculate mode for noise level
  let noiseLevel = null;
  if (vibeReports.length > 0) {
    const noiseCounts = { chill: 0, moderate: 0, loud: 0 };
    vibeReports.forEach((r) => noiseCounts[r.noiseLevel]++);
    noiseLevel = Object.keys(noiseCounts).reduce((a, b) =>
      noiseCounts[a] > noiseCounts[b] ? a : b
    );
  }

  // Calculate mode for energy level
  let energyLevel = null;
  if (vibeReports.length > 0) {
    const energyCounts = { low: 0, medium: 0, hype: 0 };
    vibeReports.forEach((r) => energyCounts[r.energyLevel]++);
    energyLevel = Object.keys(energyCounts).reduce((a, b) =>
      energyCounts[a] > energyCounts[b] ? a : b
    );
  }

  // Aggregate music tags (most common)
  const musicTags = [];
  if (vibeReports.length > 0) {
    const tagCounts = {};
    vibeReports.forEach((r) => {
      r.musicTags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0]);
    musicTags.push(...sortedTags);
  }

  return {
    avgWait,
    crowdDensity,
    noiseLevel,
    energyLevel,
    musicTags,
    reportCount: waitReports.length + vibeReports.length,
    waitReportCount: waitReports.length,
    vibeReportCount: vibeReports.length,
    lastUpdated: new Date()
  };
};

// Get aggregated metrics for multiple venues
const getMultipleVenueMetrics = async (venueIds, timeWindowMinutes = 30) => {
  const metricsMap = {};

  for (const venueId of venueIds) {
    metricsMap[venueId] = await getCurrentVenueMetrics(venueId, timeWindowMinutes);
  }

  return metricsMap;
};

module.exports = { getCurrentVenueMetrics, getMultipleVenueMetrics };
