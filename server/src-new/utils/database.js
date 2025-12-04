// Raw MongoDB driver connection helper for concept-based architecture
// This file is standalone and does NOT affect the existing Mongoose-based code.

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

let cachedClient = null;
let cachedDb = null;

/**
 * Get a connected MongoDB database instance.
 * Uses a singleton client so multiple concept classes can share the connection.
 */
async function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  const client = new MongoClient(uri);
  await client.connect();

  // Use database name from connection string or default to 'waitless'
  const dbNameFromUri = uri.split('/').pop().split('?')[0] || 'waitless';
  const db = client.db(dbNameFromUri);

  cachedClient = client;
  cachedDb = db;

  return db;
}

/**
 * Helper to get a typed collection from the database.
 * @param {string} name - Collection name
 * @returns {Promise<import('mongodb').Collection>}
 */
async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

/**
 * Generate a new ID (compatible with MongoDB ObjectId).
 */
function freshID() {
  return new ObjectId().toHexString();
}

module.exports = {
  getDb,
  getCollection,
  freshID,
  ObjectId,
};


