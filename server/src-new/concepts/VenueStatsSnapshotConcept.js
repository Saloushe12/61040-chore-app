// Concept: VenueStatsSnapshot
// Purpose: retain periodic aggregate stats for historical analysis and forecasting
//
// Spec actions:
// - recordStatsSnapshot(venueId, aggregates): (snapshotId)
// - recomputePeakScores(venueId)
//
// Notes:
// - Stored at coarse granularity (e.g., every 15 minutes).
// - Forecasting is simple: rolling averages or bucket analysis.

const { getCollection, freshID, ObjectId } = require('../utils/database');

/**
 * State: VenueStatsSnapshots are stored in `VenueStatsSnapshot.snapshots` with:
 * - _id: ID
 * - venueId: ID
 * - timestamp: Date
 * - avgReportedWait: number | null
 * - avgCrowdDensity: number (0-2)
 * - reportCount: number
 * - derivedPeakScore: number (0-100)
 * - dayOfWeek: 0-6
 * - hourOfDay: 0-23
 */

class VenueStatsSnapshotConcept {
  constructor(db) {
    this.db = db;
  }

  async _snapshots() {
    if (this.db) {
      return this.db.collection('VenueStatsSnapshot.snapshots');
    }
    return getCollection('VenueStatsSnapshot.snapshots');
  }

  /**
   * recordStatsSnapshot(venueId, aggregates): (snapshotId)
   * aggregates: { avgReportedWait?, avgCrowdDensity?, reportCount?, derivedPeakScore? }
   *
   * This is intended to be called periodically (e.g., via a cron job) using
   * the current aggregated metrics from the aggregation service.
   *
   * @param {Object} params
   * @param {string} params.venueId
   * @param {{ avgReportedWait?: number|null, avgCrowdDensity?: number|null, reportCount?: number, derivedPeakScore?: number }} params.aggregates
   * @param {Date} [params.timestamp] - optional override for timestamp (defaults to now)
   * @returns {Promise<{ snapshotId: string }>}
   */
  async recordStatsSnapshot({ venueId, aggregates, timestamp }) {
    const snapshots = await this._snapshots();

    const ts = timestamp || new Date();
    const dayOfWeek = ts.getDay();
    const hourOfDay = ts.getHours();
    const snapshotId = freshID();

    const doc = {
      _id: new ObjectId(snapshotId),
      venueId: new ObjectId(venueId),
      timestamp: ts,
      avgReportedWait:
        aggregates.avgReportedWait === undefined
          ? null
          : aggregates.avgReportedWait,
      avgCrowdDensity:
        aggregates.avgCrowdDensity === undefined
          ? null
          : aggregates.avgCrowdDensity,
      reportCount: aggregates.reportCount ?? 0,
      derivedPeakScore: aggregates.derivedPeakScore ?? null,
      dayOfWeek,
      hourOfDay,
    };

    await snapshots.insertOne(doc);

    return { snapshotId };
  }

  /**
   * recomputePeakScores(venueId): recompute derivedPeakScore for historical snapshots.
   * In practice, your existing `services/forecasting.calculatePeakScore` is the
   * function that converts current metrics to a peak score. For historical data,
   * this method could be used to backfill or adjust scores if the scoring logic changes.
   *
   * For now, this is a placeholder that leaves forecasting logic in the
   * existing `services/forecasting.js` module, aligning with the current app.
   *
   * @param {Object} params
   * @param {string} params.venueId
   * @returns {Promise<void>}
   */
  async recomputePeakScores({ venueId }) {
    const snapshots = await this._snapshots();

    // Placeholder: in a full refactor, we'd:
    // 1. Read all snapshots for this venue
    // 2. Recompute derivedPeakScore for each snapshot based on some
    //    scoring function (e.g., existing calculatePeakScore logic)
    // 3. Update documents in bulk.
    //
    // For now, we keep actual forecasting in services/forecasting.js.

    await snapshots.updateMany(
      { venueId: new ObjectId(venueId) },
      { $set: {} }
    );
  }

  /**
   * _getSnapshotsForForecast(venueId, dayOfWeek, since): internal helper
   * Mirrors the query used in services/forecasting.getPeakForecast.
   *
   * @param {Object} params
   * @param {string} params.venueId
   * @param {number} params.dayOfWeek
   * @param {Date} params.since
   * @returns {Promise<Array<any>>}
   */
  async _getSnapshotsForForecast({ venueId, dayOfWeek, since }) {
    const snapshots = await this._snapshots();
    return snapshots
      .find({
        venueId: new ObjectId(venueId),
        dayOfWeek,
        timestamp: { $gte: since },
      })
      .toArray();
  }
}

module.exports = VenueStatsSnapshotConcept;


