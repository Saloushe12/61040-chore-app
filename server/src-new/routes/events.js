const express = require('express');
const { body, query } = require('express-validator');
const { auth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { triggerEventAlerts } = require('../services/notifications');

const VenueConcept = require('../concepts/VenueConcept');
const VenueEventConcept = require('../concepts/VenueEventConcept');
const {
  buildEventFilterSync,
} = require('../syncs/EventFilterSync');

const router = express.Router();

const venueConcept = new VenueConcept();
const venueEventConcept = new VenueEventConcept();
const eventFilterSync = buildEventFilterSync({
  venueEventConcept,
  venueConcept,
});

// Get events (with filters) via sync
router.get(
  '/',
  [
    optionalAuth,
    query('venueId').optional().isMongoId(),
    query('tags').optional(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId, tags, startDate, endDate } = req.query;
      const tagArray = tags ? tags.split(',') : [];

      const result = await eventFilterSync({
        eventTag: tagArray.length === 1 ? tagArray[0] : null,
        startDate,
        endDate,
      });

      res.json(result);
    } catch (error) {
      console.error('Concept get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
);

// Create event (concept-based)
router.post(
  '/',
  [
    auth,
    body('venueId').isMongoId(),
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
    body('tags').isArray(),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId, title, description, startTime, endTime, tags } = req.body;

      // Check venue exists in concept storage
      const [venue] = await venueConcept._getVenueDetails({ venueId });
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      const result = await venueEventConcept.createVenueEvent({
        venueId,
        title,
        description,
        timeRange: { start: startTime, end: endTime },
        tags,
        createdByUserId: req.userId.toString(),
      });

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      // Trigger alerts for users subscribed to this event tag
      const io = req.app.get('io');
      if (io) {
        for (const tag of tags) {
          await triggerEventAlerts(venueId, tag, io);
        }

        io.to(`venue-${venueId}`).emit('venue-update', {
          venueId,
          type: 'new-event',
          eventId: result.eventId,
        });
      }

      res.status(201).json({ eventId: result.eventId });
    } catch (error) {
      console.error('Concept create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// Update event (concept-based core, with same authorization semantics)
router.patch(
  '/:id',
  [
    auth,
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('tags').optional().isArray(),
    validate,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, startTime, endTime, tags, status } = req.body;

      const fieldsToUpdate = {};
      if (title !== undefined) fieldsToUpdate.title = title;
      if (description !== undefined) fieldsToUpdate.description = description;
      if (startTime !== undefined) fieldsToUpdate.startTime = startTime;
      if (endTime !== undefined) fieldsToUpdate.endTime = endTime;
      if (tags !== undefined) fieldsToUpdate.tags = tags;
      if (status !== undefined) fieldsToUpdate.status = status;

      const result = await venueEventConcept.updateVenueEvent({
        eventId: id,
        fieldsToUpdate,
      });

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ eventId: id });
    } catch (error) {
      console.error('Concept update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// Cancel event
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await venueEventConcept.cancelVenueEvent({ eventId: id });
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }
    res.json({ eventId: id, message: 'Event cancelled successfully' });
  } catch (error) {
    console.error('Concept cancel event error:', error);
    res.status(500).json({ error: 'Failed to cancel event' });
  }
});

module.exports = router;


