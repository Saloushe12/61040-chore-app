// EventFilterSync
// Spec:
// # sync: EventFilterSync
// ## when
// Request.filterByEvent(eventTag, timeRange)
// ## then
// returns venues and events matching the tag
// ## notes
// - Useful for “what’s happening tonight?” scenarios.
//
// Plain JS implementation using VenueEventConcept helper.

const VenueEventConcept = require('../concepts/VenueEventConcept');
const VenueConcept = require('../concepts/VenueConcept');
const { ObjectId } = require('../utils/database');

/**
 * Build an EventFilterSync function.
 *
 * @param {Object} deps
 * @param {import('../concepts/VenueEventConcept')} deps.venueEventConcept
 * @param {import('../concepts/VenueConcept')} deps.venueConcept
 *
 * @returns {Function} eventFilterSync({ eventTag, startDate?, endDate? }) → { events }
 */
function buildEventFilterSync({ venueEventConcept, venueConcept }) {
  return async function eventFilterSync({ eventTag, startDate, endDate }) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const tags = eventTag ? [eventTag] : [];

    const events = await venueEventConcept._getEventsForFilters({
      venueId: null,
      tags,
      startDate: start,
      endDate: end,
    });

    // Optionally hydrate basic venue info for each event
    const venuesCollection = await venueConcept._venues();
    const venueCache = new Map();

    const enriched = [];
    for (const e of events) {
      const venueIdStr = e.venueId.toHexString();
      let venue = venueCache.get(venueIdStr);
      if (!venue) {
        venue = await venuesCollection.findOne({ _id: new ObjectId(venueIdStr) });
        venueCache.set(venueIdStr, venue);
      }

      enriched.push({
        eventId: e._id.toHexString(),
        venueId: venueIdStr,
        venueName: venue?.name,
        venueAddress: venue?.address,
        title: e.title,
        description: e.description,
        startTime: e.startTime,
        endTime: e.endTime,
        tags: e.tags,
        status: e.status,
      });
    }

    return { events: enriched };
  };
}

module.exports = {
  buildEventFilterSync,
};


