// Concept: Venue
// Purpose: represent nightlife locations and their operational status
// This concept uses the raw MongoDB driver and is independent of Mongoose models.

const { getCollection, freshID, ObjectId } = require('../utils/database');

/**
 * State: Venues are stored in the `Venue.venues` collection with:
 * - _id: ID
 * - name: string
 * - location: { lat: number, lon: number }
 * - address: string
 * - hours: object
 * - tags: string[]
 * - currentStatus: 'open' | 'closed' | 'door_hold'
 * - staticAttributes: object
 * - operatorUserId?: ID
 * - createdAt: Date
 */

class VenueConcept {
  constructor(db) {
    this.db = db;
  }

  async _venues() {
    if (this.db) {
      return this.db.collection('Venue.venues');
    }
    return getCollection('Venue.venues');
  }

  /**
   * createVenue(name, location, address, hours, tags, staticAttributes): { venueId } | { error }
   * @param {Object} params
   * @param {string} params.name
   * @param {{ lat: number, lon: number }} params.location
   * @param {string} params.address
   * @param {Object} [params.hours]
   * @param {string[]} [params.tags]
   * @param {Object} [params.staticAttributes]
   * @param {string} [params.operatorUserId]
   * @returns {Promise<{ venueId: string } | { error: string }>}
   */
  async createVenue({
    name,
    location,
    address,
    hours = {},
    tags = [],
    staticAttributes = {},
    operatorUserId,
  }) {
    const venues = await this._venues();

    const now = new Date();
    const venueId = freshID();

    const doc = {
      _id: new ObjectId(venueId),
      name: name.trim(),
      location: {
        lat: location.lat,
        lon: location.lon,
      },
      address: address.trim(),
      hours,
      tags,
      currentStatus: 'open',
      staticAttributes,
      operatorUserId: operatorUserId ? new ObjectId(operatorUserId) : null,
      createdAt: now,
    };

    await venues.insertOne(doc);

    return { venueId };
  }

  /**
   * claimVenue(venueId, operatorUserId): Empty | { error }
   * Requires: operatorUserId is a User with role = venue_operator (checked elsewhere)
   */
  async claimVenue({ venueId, operatorUserId }) {
    const venues = await this._venues();

    const result = await venues.updateOne(
      { _id: new ObjectId(venueId) },
      { $set: { operatorUserId: new ObjectId(operatorUserId) } }
    );

    if (result.matchedCount === 0) {
      return { error: 'Venue not found' };
    }

    return {};
  }

  /**
   * updateVenueProfile(venueId, fieldsToUpdate): Empty | { error }
   */
  async updateVenueProfile({ venueId, fieldsToUpdate }) {
    const venues = await this._venues();

    const allowedFields = ['name', 'address', 'hours', 'tags', 'staticAttributes'];
    const set = {};

    for (const key of allowedFields) {
      if (fieldsToUpdate[key] !== undefined) {
        set[key] = fieldsToUpdate[key];
      }
    }

    if (Object.keys(set).length === 0) {
      return {};
    }

    const result = await venues.updateOne(
      { _id: new ObjectId(venueId) },
      { $set: set }
    );

    if (result.matchedCount === 0) {
      return { error: 'Venue not found' };
    }

    return {};
  }

  /**
   * updateVenueStatus(venueId, status): Empty | { error }
   * status: 'open' | 'closed' | 'door_hold'
   */
  async updateVenueStatus({ venueId, status }) {
    const venues = await this._venues();

    if (!['open', 'closed', 'door_hold'].includes(status)) {
      return { error: 'Invalid status' };
    }

    const result = await venues.updateOne(
      { _id: new ObjectId(venueId) },
      { $set: { currentStatus: status } }
    );

    if (result.matchedCount === 0) {
      return { error: 'Venue not found' };
    }

    return {};
  }

  /**
   * _getVenueDetails(venueId): (venue fields)
   * Internal query helper returning an array.
   */
  async _getVenueDetails({ venueId }) {
    const venues = await this._venues();
    const v = await venues.findOne({ _id: new ObjectId(venueId) });

    if (!v) return [];

    return [
      {
        venueId: v._id.toHexString(),
        name: v.name,
        location: v.location,
        address: v.address,
        hours: v.hours,
        tags: v.tags,
        currentStatus: v.currentStatus,
        staticAttributes: v.staticAttributes,
        operatorUserId: v.operatorUserId ? v.operatorUserId.toHexString() : undefined,
        createdAt: v.createdAt,
      },
    ];
  }

  /**
   * _getVenuesByOperator(operatorUserId): internal helper
   * Used by VenueDashboardSync to find venues managed by an operator.
   *
   * @param {Object} params
   * @param {string} params.operatorUserId
   * @returns {Promise<Array<any>>}
   */
  async _getVenuesByOperator({ operatorUserId }) {
    const venues = await this._venues();
    return venues
      .find({
        operatorUserId: new ObjectId(operatorUserId),
      })
      .toArray();
  }
}

module.exports = VenueConcept;


