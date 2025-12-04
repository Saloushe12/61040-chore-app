// Concept: AlertSubscription
// Purpose: allow users to receive notifications when venue conditions change
//
// Spec actions:
// - createAlertSubscription(userId, venueId, condition): (subscriptionId)
// - updateAlertSubscription(subscriptionId, condition)
// - deactivateAlertSubscription(subscriptionId)
// - triggerAlertsForVenue(venueId, newAggregates)  <-- implemented in services/notifications in current app

const { getCollection, freshID, ObjectId } = require('../utils/database');

/**
 * State: AlertSubscriptions are stored in the `AlertSubscription.subscriptions` collection with:
 * - _id: ID
 * - userId: ID
 * - venueId: ID
 * - condition: { waitBelowMinutes?, crowdDensityIn?, eventTag? }
 * - createdAt: Date
 * - active: boolean
 */

class AlertSubscriptionConcept {
  constructor(db) {
    this.db = db;
  }

  async _subs() {
    if (this.db) {
      return this.db.collection('AlertSubscription.subscriptions');
    }
    return getCollection('AlertSubscription.subscriptions');
  }

  /**
   * createAlertSubscription(userId, venueId, condition): (subscriptionId) | { error }
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.venueId
   * @param {{waitBelowMinutes?: number, crowdDensityIn?: string[], eventTag?: string}} params.condition
   * @returns {Promise<{ subscriptionId: string } | { error: string }>}
   */
  async createAlertSubscription({ userId, venueId, condition }) {
    const subs = await this._subs();

    const hasWait = condition.waitBelowMinutes !== undefined;
    const hasCrowd =
      Array.isArray(condition.crowdDensityIn) &&
      condition.crowdDensityIn.length > 0;
    const hasEvent = !!condition.eventTag;

    if (!hasWait && !hasCrowd && !hasEvent) {
      return { error: 'At least one alert condition must be set' };
    }

    const now = new Date();
    const subscriptionId = freshID();

    const doc = {
      _id: new ObjectId(subscriptionId),
      userId: new ObjectId(userId),
      venueId: new ObjectId(venueId),
      condition: {
        waitBelowMinutes: condition.waitBelowMinutes,
        crowdDensityIn: hasCrowd ? condition.crowdDensityIn : [],
        eventTag: condition.eventTag || null,
      },
      active: true,
      createdAt: now,
    };

    await subs.insertOne(doc);

    return { subscriptionId };
  }

  /**
   * updateAlertSubscription(subscriptionId, condition): Empty | { error }
   * Also allows updating `active` flag if included in params.
   * @param {Object} params
   * @param {string} params.subscriptionId
   * @param {{waitBelowMinutes?: number, crowdDensityIn?: string[], eventTag?: string}} [params.condition]
   * @param {boolean} [params.active]
   * @returns {Promise<{} | { error: string }>}
   */
  async updateAlertSubscription({ subscriptionId, condition, active }) {
    const subs = await this._subs();

    const update = { $set: {} };

    if (condition) {
      const hasWait = condition.waitBelowMinutes !== undefined;
      const hasCrowd =
        Array.isArray(condition.crowdDensityIn) &&
        condition.crowdDensityIn.length > 0;
      const hasEvent = !!condition.eventTag;

      if (!hasWait && !hasCrowd && !hasEvent) {
        return { error: 'At least one alert condition must be set' };
      }

      update.$set.condition = {
        waitBelowMinutes: condition.waitBelowMinutes,
        crowdDensityIn: hasCrowd ? condition.crowdDensityIn : [],
        eventTag: condition.eventTag || null,
      };
    }

    if (active !== undefined) {
      update.$set.active = !!active;
    }

    if (Object.keys(update.$set).length === 0) {
      return {};
    }

    const result = await subs.updateOne(
      { _id: new ObjectId(subscriptionId) },
      update
    );

    if (result.matchedCount === 0) {
      return { error: 'Alert subscription not found' };
    }

    return {};
  }

  /**
   * deactivateAlertSubscription(subscriptionId): Empty | { error }
   * @param {Object} params
   * @param {string} params.subscriptionId
   * @returns {Promise<{} | { error: string }>}
   */
  async deactivateAlertSubscription({ subscriptionId }) {
    const subs = await this._subs();

    const result = await subs.updateOne(
      { _id: new ObjectId(subscriptionId) },
      { $set: { active: false } }
    );

    if (result.matchedCount === 0) {
      return { error: 'Alert subscription not found' };
    }

    return {};
  }

  /**
   * _getUserAlerts(userId): internal helper for UserAlertsSync
   * @param {Object} params
   * @param {string} params.userId
   * @returns {Promise<Array<any>>}
   */
  async _getUserAlerts({ userId }) {
    const subs = await this._subs();
    return subs
      .find({
        userId: new ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .toArray();
  }
}

module.exports = AlertSubscriptionConcept;


