// Concept: User
// Purpose: identify patrons and venue operators
// This concept is implemented using the raw MongoDB driver and is independent
// of the existing Mongoose-based implementation.

const bcrypt = require('bcryptjs');
const { getCollection, freshID, ObjectId } = require('../utils/database');

/**
 * State: Users are stored in the `User.users` collection with:
 * - _id: ID
 * - role: 'patron' | 'venue_operator'
 * - displayName?: string
 * - homeArea?: string
 * - email: string
 * - passwordHash: string
 * - createdAt: Date
 * - lastActiveAt: Date
 */

class UserConcept {
  constructor(db) {
    // db is optional; if not provided we'll use getCollection internally
    this.db = db;
  }

  async _users() {
    if (this.db) {
      return this.db.collection('User.users');
    }
    return getCollection('User.users');
  }

  /**
   * register(displayName, role, email, password): (userId) | { error }
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.password
   * @param {string} [params.displayName]
   * @param {'patron'|'venue_operator'} [params.role]
   * @returns {Promise<{ userId: string } | { error: string }>}
   */
  async register({ email, password, displayName, role = 'patron' }) {
    const users = await this._users();

    // Check if email already exists
    const existing = await users.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return { error: 'Email already registered' };
    }

    const now = new Date();
    const userId = freshID();
    const passwordHash = await bcrypt.hash(password, 10);

    const doc = {
      _id: new ObjectId(userId),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      displayName: displayName || null,
      homeArea: null,
      createdAt: now,
      lastActiveAt: now,
    };

    await users.insertOne(doc);

    return { userId };
  }

  /**
   * authenticate(email, password): (userId) | { error }
   * Helper for login flows; checks credentials against stored passwordHash.
   *
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.password
   * @returns {Promise<{ userId: string } | { error: string }>}
   */
  async authenticate({ email, password }) {
    const users = await this._users();
    const normalizedEmail = email.toLowerCase().trim();

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return { error: 'Invalid credentials' };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return { error: 'Invalid credentials' };
    }

    // Update lastActiveAt
    await users.updateOne(
      { _id: user._id },
      { $set: { lastActiveAt: new Date() } }
    );

    return { userId: user._id.toHexString() };
  }

  /**
   * updateProfile(userId, displayName?, homeArea?): Empty | { error }
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} [params.displayName]
   * @param {string} [params.homeArea]
   * @returns {Promise<{} | { error: string }>}
   */
  async updateProfile({ userId, displayName, homeArea }) {
    const users = await this._users();

    const update = { $set: {} };
    if (displayName !== undefined) update.$set.displayName = displayName;
    if (homeArea !== undefined) update.$set.homeArea = homeArea;
    update.$set.lastActiveAt = new Date();

    // If nothing to update besides lastActiveAt, still proceed
    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      update
    );

    if (result.matchedCount === 0) {
      return { error: 'User not found' };
    }

    return {};
  }

  /**
   * _getUserDetails(userId): (userId, role, displayName?, homeArea?, createdAt, lastActiveAt)
   * Internal query helper returning an array to match concept style.
   * @param {Object} params
   * @param {string} params.userId
   * @returns {Promise<Array<{ userId: string, role: string, displayName?: string, homeArea?: string, createdAt: Date, lastActiveAt: Date }>>}
   */
  async _getUserDetails({ userId }) {
    const users = await this._users();
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          passwordHash: 0,
        },
      }
    );

    if (!user) {
      return [];
    }

    return [
      {
        userId: user._id.toHexString(),
        role: user.role,
        displayName: user.displayName || undefined,
        homeArea: user.homeArea || undefined,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
      },
    ];
  }
}

module.exports = UserConcept;


