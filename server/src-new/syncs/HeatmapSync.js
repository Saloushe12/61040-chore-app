// HeatmapSync
// Spec:
// # sync: HeatmapSync
// ## when
// Request.getHeatmap(areaBounds)
// ## then
// returns activity scores per grid cell
// ## notes
// - Heatmaps derived from geofence-verified WaitReports and VibeReports only.
// - Helps avoid spoofed “fake crowded areas.”
//
// Simplified implementation:
// - Takes a bounding box and a grid size (e.g., 10x10)
// - Buckets recent geofence-verified reports into grid cells
// - Computes an activity score per cell based on report counts

/**
 * Build a HeatmapSync function.
 *
 * @param {Object} deps
 * @param {import('../concepts/WaitReportConcept')} deps.waitReportConcept
 * @param {import('../concepts/VibeReportConcept')} deps.vibeReportConcept
 *
 * @returns {Function} heatmapSync({ areaBounds, gridSize?, timeWindowMinutes? }) → { cells }
 */
function buildHeatmapSync({ waitReportConcept, vibeReportConcept }) {
  return async function heatmapSync({
    areaBounds,
    gridSize = 10,
    timeWindowMinutes = 60,
  }) {
    const { minLat, maxLat, minLon, maxLon } = areaBounds;
    const latStep = (maxLat - minLat) / gridSize;
    const lonStep = (maxLon - minLon) / gridSize;

    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    // For simplicity, fetch all recent reports and filter in-memory by bounds + time.
    // In a production system, you'd index by location and timestamp.
    const waitReports =
      (await waitReportConcept._getAllRecentReports({ since: cutoffTime })) ||
      [];
    const vibeReports =
      (await vibeReportConcept._getAllRecentReports({ since: cutoffTime })) ||
      [];

    // Initialize grid
    const cells = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        cells.push({
          row,
          col,
          centerLat: minLat + (row + 0.5) * latStep,
          centerLon: minLon + (col + 0.5) * lonStep,
          waitReportCount: 0,
          vibeReportCount: 0,
          activityScore: 0,
        });
      }
    }

    const findCellIndex = (lat, lon) => {
      if (
        lat < minLat ||
        lat > maxLat ||
        lon < minLon ||
        lon > maxLon
      ) {
        return -1;
      }
      const row = Math.floor((lat - minLat) / latStep);
      const col = Math.floor((lon - minLon) / lonStep);
      if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return -1;
      return row * gridSize + col;
    };

    const processReport = (report, type) => {
      const loc = report.location;
      if (!loc || loc.lat === undefined || loc.lon === undefined) return;
      const idx = findCellIndex(loc.lat, loc.lon);
      if (idx === -1) return;
      const cell = cells[idx];
      if (type === 'wait') cell.waitReportCount += 1;
      if (type === 'vibe') cell.vibeReportCount += 1;
    };

    for (const r of waitReports) {
      if (!r.geofenceVerified) continue;
      processReport(r, 'wait');
    }
    for (const r of vibeReports) {
      if (!r.geofenceVerified) continue;
      processReport(r, 'vibe');
    }

    // Compute activity score: simple weighted sum
    for (const cell of cells) {
      cell.activityScore =
        cell.waitReportCount * 2 + cell.vibeReportCount; // weights can be tuned
    }

    // Only return cells with some activity to reduce payload
    const activeCells = cells
      .filter((c) => c.activityScore > 0)
      .map(cell => ({
        lat: cell.centerLat,
        lon: cell.centerLon,
        centerLat: cell.centerLat, // Keep for backward compatibility
        centerLon: cell.centerLon, // Keep for backward compatibility
        activityScore: cell.activityScore,
        waitReportCount: cell.waitReportCount,
        vibeReportCount: cell.vibeReportCount
      }));

    return { cells: activeCells };
  };
}

module.exports = {
  buildHeatmapSync,
};


