// Concept: VenueEvent
// Purpose: describe events occurring at a venue
//
// Spec actions:
// - createVenueEvent(venueId, title, description, timeRange, tags): (eventId)
// - updateVenueEvent(eventId, fieldsToUpdate)
// - cancelVenueEvent(eventId)
// - markEventInProgress(eventId)
//
// Notes:
// - Event tags support filtering.
// - User-created and operator-created events share the same format.

const { getCollection, freshID, ObjectId } = require('../utils/database');

/**
 * State: VenueEvents are stored in `VenueEvent.events` with:
 * - _id: ID
 * - venueId: ID
 * - title: string
 * - description?: string
 * - startTime: Date
 * - endTime: Date
 * - tags: string[]
 * - createdBy: ID
 * - status: 'scheduled' | 'cancelled' | 'in_progress' | 'completed'
 * - createdAt: Date
 */

class VenueEventConcept {
  constructor(db) {
    this.db = db;
  }

  async _events() {
    if (this.db) {
      return this.db.collection('VenueEvent.events');
    }
    return getCollection('VenueEvent.events');
  }

  /**
   * createVenueEvent(venueId, title, description, timeRange, tags): (eventId) | { error }
   * @param {Object} params
   * @param {string} params.venueId
   * @param {string} params.title
   * @param {string} [params.description]
   * @param {{ start: Date|string, end: Date|string }} params.timeRange
   * @param {string[]} params.tags
   * @param {string} params.createdByUserId
   * @returns {Promise<{ eventId: string } | { error: string }>}
   */
  async createVenueEvent({
    venueId,
    title,
    description,
    timeRange,
    tags,
    createdByUserId,
  }) {
    const events = await this._events();

    const startTime = new Date(timeRange.start);
    const endTime = new Date(timeRange.end);

    if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
      return { error: 'Invalid start time' };
    }
    if (!(endTime instanceof Date) || isNaN(endTime.getTime())) {
      return { error: 'Invalid end time' };
    }
    if (endTime <= startTime) {
      return { error: 'End time must be after start time' };
    }

    const eventId = freshID();
    const now = new Date();

    const doc = {
      _id: new ObjectId(eventId),
      venueId: new ObjectId(venueId),
      title: title.trim(),
      description: description || null,
      startTime,
      endTime,
      tags: tags || [],
      createdBy: new ObjectId(createdByUserId),
      status: 'scheduled',
      createdAt: now,
    };

    await events.insertOne(doc);

    return { eventId };
  }

  /**
   * updateVenueEvent(eventId, fieldsToUpdate): Empty | { error }
   * Allowed fields: title, description, startTime, endTime, tags, status
   * Status changes like 'cancelled' or 'in_progress' can be done here, but
   * spec also has explicit cancel/markInProgress actions that call into this.
   */
  async updateVenueEvent({ eventId, fieldsToUpdate }) {
    const events = await this._events();

    const set = {};
    if (fieldsToUpdate.title !== undefined) {
      set.title = fieldsToUpdate.title;
    }
    if (fieldsToUpdate.description !== undefined) {
      set.description = fieldsToUpdate.description;
    }
    if (fieldsToUpdate.tags !== undefined) {
      set.tags = fieldsToUpdate.tags;
    }
    if (fieldsToUpdate.startTime !== undefined) {
      set.startTime = new Date(fieldsToUpdate.startTime);
    }
    if (fieldsToUpdate.endTime !== undefined) {
      set.endTime = new Date(fieldsToUpdate.endTime);
    }
    if (fieldsToUpdate.status !== undefined) {
      set.status = fieldsToUpdate.status;
    }

    if (Object.keys(set).length === 0) {
      return {};
    }

    const result = await events.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: set }
    );

    if (result.matchedCount === 0) {
      return { error: 'Event not found' };
    }

    // If both times updated, ensure consistency
    const updated = await events.findOne({ _id: new ObjectId(eventId) });
    if (updated && updated.endTime <= updated.startTime) {
      // revert times and report error
      await events.updateOne(
        { _id: updated._id },
        {
          $set: {
            startTime: updated.startTime,
            endTime: updated.endTime,
          },
        }
      );
      return { error: 'End time must be after start time' };
    }

    return {};
  }

  /**
   * cancelVenueEvent(eventId): Empty | { error }
   */
  async cancelVenueEvent({ eventId }) {
    return this.updateVenueEvent({
      eventId,
      fieldsToUpdate: { status: 'cancelled' },
    });
  }

  /**
   * markEventInProgress(eventId): Empty | { error }
   */
  async markEventInProgress({ eventId }) {
    return this.updateVenueEvent({
      eventId,
      fieldsToUpdate: { status: 'in_progress' },
    });
  }

  /**
   * _getEventsForFilters: internal helper for EventFilterSync / VenueDetailSync
   * @param {Object} params
   * @param {string} [params.venueId]
   * @param {string[]} [params.tags]
   * @param {string} [params.status]
   * @param {Date} [params.startAfter]
   * @param {Date} [params.startBefore]
   * @returns {Promise<Array<any>>}
   */
  async _getEventsForFilters({ venueId, tags, status, startAfter, startBefore }) {
    const events = await this._events();
    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['scheduled', 'in_progress'] };
    }

    if (venueId) {
      query.venueId = new ObjectId(venueId);
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Time range filtering - use $gte and $lte for proper date comparison
    if (startAfter || startBefore) {
      query.startTime = {};
      if (startAfter) {
        query.startTime.$gte = new Date(startAfter);
      }
      if (startBefore) {
        query.startTime.$lte = new Date(startBefore);
      }
    }

    return events
      .find(query)
      .sort({ startTime: 1 })
      .limit(100)
      .toArray();
  }
}

module.exports = VenueEventConcept;


