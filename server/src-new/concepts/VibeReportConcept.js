// Concept: VibeReport
// Purpose: capture structured, frequently updated atmosphere data
//
// Spec action:
// - submitVibeReport(userId, venueId, fields, geofenceVerified): (reportId)
//
// Notes:
// - Structured categories reduce harmful descriptors.
// - Geofencing must be confirmed before accepting vibe reports (handled in syncs/services).

const { getCollection, freshID, ObjectId } = require('../utils/database');

/**
 * State: VibeReports are stored in the `VibeReport.reports` collection with:
 * - _id: ID
 * - venueId: ID
 * - userId: ID
 * - crowdDensity: 'low' | 'medium' | 'high'
 * - noiseLevel: 'chill' | 'moderate' | 'loud'
 * - energyLevel: 'low' | 'medium' | 'hype'
 * - musicTags: string[]
 * - createdAt: Date
 * - geofenceVerified: boolean
 * - location?: { lat: number, lon: number }
 */

class VibeReportConcept {
  constructor(db) {
    this.db = db;
  }

  async _reports() {
    if (this.db) {
      return this.db.collection('VibeReport.reports');
    }
    return getCollection('VibeReport.reports');
  }

  /**
   * submitVibeReport(userId, venueId, fields, geofenceVerified): (reportId)
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.venueId
   * @param {'low'|'medium'|'high'} params.crowdDensity
   * @param {'chill'|'moderate'|'loud'} params.noiseLevel
   * @param {'low'|'medium'|'hype'} params.energyLevel
   * @param {string[]} params.musicTags
   * @param {boolean} params.geofenceVerified
   * @param {{lat:number, lon:number}} [params.location]
   * @returns {Promise<{ reportId: string }>}
   */
  async submitVibeReport({
    userId,
    venueId,
    crowdDensity,
    noiseLevel,
    energyLevel,
    musicTags,
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
      crowdDensity,
      noiseLevel,
      energyLevel,
      musicTags,
      createdAt: now,
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

module.exports = VibeReportConcept;


