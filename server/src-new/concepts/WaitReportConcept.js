// Concept: WaitReport
// Purpose: provide crowdsourced wait times and check-in confirmations
// This concept uses the raw MongoDB driver and is independent of Mongoose.
//
// Spec actions:
// - submitWaitReport(userId, venueId, reportedWaitMinutes, geofenceVerified): (reportId)
// - submitVenueWaitOverride(operatorUserId, venueId, waitMinutes): (reportId)
//
// Notes in spec:
// - Geofence verification uses distance checks (done elsewhere; we take a boolean flag here)
// - Only one wait report per user per venue per night; this constraint is enforced elsewhere.

const { getCollection, freshID, ObjectId } = require('../utils/database');

/**
 * State: WaitReports are stored in the `WaitReport.reports` collection with:
 * - _id: ID
 * - venueId: ID
 * - userId: ID
 * - reportedWaitMinutes: number
 * - createdAt: Date
 * - source: 'user' | 'venue_override'
 * - geofenceVerified: boolean
 * - location?: { lat: number, lon: number }
 *
 * We deliberately store location in a simple lat/lon object instead of
 * the GeoJSON Point used by the current Mongoose model to keep the concept
 * schema simple and focused on the spec. Geofence verification and
 * geospatial queries are handled in syncs/services.
 */

class WaitReportConcept {
  constructor(db) {
    this.db = db;
  }

  async _reports() {
    if (this.db) {
      return this.db.collection('WaitReport.reports');
    }
    return getCollection('WaitReport.reports');
  }

  /**
   * submitWaitReport(userId, venueId, reportedWaitMinutes, geofenceVerified): (reportId)
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.venueId
   * @param {number} params.reportedWaitMinutes
   * @param {boolean} params.geofenceVerified
   * @param {{lat:number, lon:number}} [params.location]
   * @returns {Promise<{ reportId: string }>}
   */
  async submitWaitReport({
    userId,
    venueId,
    reportedWaitMinutes,
    geofenceVerified,
    location,
  }) {
    const reports = await this._reports();
    const now = new Date();
    const reportId = freshID();

    const doc = {
      _id: new ObjectId(reportId),
      venueId: new ObjectId(venueId),
      userId: new ObjectId(userId),
      reportedWaitMinutes,
      createdAt: now,
      source: 'user',
      geofenceVerified: !!geofenceVerified,
    };

    if (location) {
      doc.location = {
        lat: location.lat,
        lon: location.lon,
      };
    }

    await reports.insertOne(doc);

    return { reportId };
  }

  /**
   * submitVenueWaitOverride(operatorUserId, venueId, waitMinutes): (reportId)
   * This allows venue operators to override or supplement wait time.
   *
   * @param {Object} params
   * @param {string} params.operatorUserId
   * @param {string} params.venueId
   * @param {number} params.waitMinutes
   * @returns {Promise<{ reportId: string }>}
   */
  async submitVenueWaitOverride({ operatorUserId, venueId, waitMinutes }) {
    const reports = await this._reports();
    const now = new Date();
    const reportId = freshID();

    const doc = {
      _id: new ObjectId(reportId),
      venueId: new ObjectId(venueId),
      userId: new ObjectId(operatorUserId),
      reportedWaitMinutes: waitMinutes,
      createdAt: now,
      source: 'venue_override',
      geofenceVerified: true, // operator reports are implicitly trusted
    };

    await reports.insertOne(doc);

    return { reportId };
  }

  /**
   * _getRecentReports(venueId, since): internal helper
   * Used by syncs/aggregation to compute current metrics.
   *
   * @param {Object} params
   * @param {string} params.venueId
   * @param {Date} params.since
   * @returns {Promise<Array<any>>}
   */
  async _getRecentReports({ venueId, since }) {
    const reports = await this._reports();
    const query = {
      createdAt: { $gte: since },
    };
    if (venueId) {
      query.venueId = new ObjectId(venueId);
    }
    return reports.find(query).toArray();
  }

  /**
   * _getUserReports(userId, limit?): internal helper
   * Used by UserContributionHistorySync.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {number} [params.limit]
   * @returns {Promise<Array<any>>}
   */
  async _getUserReports({ userId, limit = 20 }) {
    const reports = await this._reports();
    return reports
      .find({
        userId: new ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * _getAllRecentReports(since): internal helper for HeatmapSync
   *
   * @param {Object} params
   * @param {Date} params.since
   * @returns {Promise<Array<any>>}
   */
  async _getAllRecentReports({ since }) {
    const reports = await this._reports();
    return reports
      .find({
        createdAt: { $gte: since },
      })
      .toArray();
  }
}

module.exports = WaitReportConcept;


