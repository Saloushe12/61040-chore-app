/**
 * Type definitions for concept-based architecture
 * These types help ensure consistency across concepts
 */

/**
 * @typedef {string} ID
 * Unique identifier for entities (MongoDB ObjectId as string)
 */

/**
 * @typedef {Object} Empty
 * Empty object type for actions that don't return data
 */

/**
 * Result type for actions that may return an error
 * @template T
 * @typedef {T | {error: string}} Result
 */

module.exports = {};


