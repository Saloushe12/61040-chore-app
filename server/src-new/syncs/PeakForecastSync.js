// PeakForecastSync
// Spec:
// # sync: PeakForecastSync
// ## when
// Request.getPeakForecast(venueId)
// ## then
// returns predicted peak hours based on VenueStatsSnapshots
// ## notes
// - Forecasting uses simple bucket averaging.
//
// This sync is a thin wrapper around the existing forecasting logic in
// server/src/services/forecasting.js. For src-new to be standalone, you
// could reimplement forecasting based on VenueStatsSnapshotConcept, but
// for now this module is left as a placeholder to be filled in or wired
// to a local forecasting implementation.

let getPeakForecast;
try {
  // Optional: if a local forecasting service exists under src-new, load it.
  // Otherwise, this will remain undefined and calling this sync will throw.
  // getPeakForecast = require('../services/forecasting').getPeakForecast;
} catch (e) {
  // Leave undefined; calling will error until implemented.
}

/**
 * Build a PeakForecastSync function.
 *
 * @returns {Function} peakForecastSync({ venueId, dayOfWeek? }) → forecastResult
 */
function buildPeakForecastSync() {
  return async function peakForecastSync({ venueId, dayOfWeek = null }) {
    if (!getPeakForecast) {
      throw new Error('getPeakForecast is not implemented in src-new.');
    }
    return getPeakForecast(venueId, dayOfWeek);
  };
}

module.exports = {
  buildPeakForecastSync,
};


