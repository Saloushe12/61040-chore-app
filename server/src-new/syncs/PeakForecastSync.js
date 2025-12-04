// PeakForecastSync
// Spec:
// # sync: PeakForecastSync
// ## when
// Request.getPeakForecast(venueId)
// ## then
// returns predicted peak hours based on VenueStatsSnapshots
// ## notes
// - Forecasting uses simple bucket averaging.

const { getPeakForecast } = require('../services/forecasting');

/**
 * Build a PeakForecastSync function.
 *
 * @returns {Function} peakForecastSync({ venueId, dayOfWeek? }) → forecastResult
 */
function buildPeakForecastSync() {
  return async function peakForecastSync({ venueId, dayOfWeek = null }) {
    return getPeakForecast(venueId, dayOfWeek);
  };
}

module.exports = {
  buildPeakForecastSync,
};


