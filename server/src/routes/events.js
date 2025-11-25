const express = require('express');
const { body, query } = require('express-validator');
const VenueEvent = require('../models/VenueEvent');
const Venue = require('../models/Venue');
const { auth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { triggerEventAlerts } = require('../services/notifications');

const router = express.Router();

// Get events (with filters)
router.get(
  '/',
  [
    optionalAuth,
    query('venueId').optional().isMongoId(),
    query('tags').optional(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validate
  ],
  async (req, res) => {
    try {
      const { venueId, tags, startDate, endDate } = req.query;

      const query = {
        status: { $in: ['scheduled', 'in_progress'] }
      };

      if (venueId) {
        query.venueId = venueId;
      }

      if (tags) {
        const tagArray = tags.split(',');
        query.tags = { $in: tagArray };
      }

      // Filter by date range
      if (startDate || endDate) {
        query.startTime = {};
        if (startDate) query.startTime.$gte = new Date(startDate);
        if (endDate) query.startTime.$lte = new Date(endDate);
      } else {
        // Default: only future and current events
        query.startTime = { $gte: new Date() };
      }

      const events = await VenueEvent.find(query)
        .populate('venueId', 'name address location')
        .populate('createdBy', 'displayName')
        .sort({ startTime: 1 })
        .limit(100);

      res.json({ events });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
);

// Create event
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
    validate
  ],
  async (req, res) => {
    try {
      const { venueId, title, description, startTime, endTime, tags } = req.body;

      // Check if venue exists
      const venue = await Venue.findById(venueId);
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      // Validate that end time is after start time
      if (new Date(endTime) <= new Date(startTime)) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      const event = new VenueEvent({
        venueId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        tags,
        createdBy: req.userId
      });

      await event.save();

      // Trigger alerts for users subscribed to this event tag
      const io = req.app.get('io');
      if (io) {
        for (const tag of tags) {
          await triggerEventAlerts(venueId, tag, io);
        }

        // Broadcast to venue subscribers
        io.to(`venue-${venueId}`).emit('venue-update', {
          venueId,
          type: 'new-event',
          eventId: event._id
        });
      }

      res.status(201).json({ event });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// Update event
router.patch(
  '/:id',
  [
    auth,
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('tags').optional().isArray(),
    validate
  ],
  async (req, res) => {
    try {
      const event = await VenueEvent.findById(req.params.id);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if user is the creator or venue operator
      const venue = await Venue.findById(event.venueId);
      const isCreator = event.createdBy.toString() === req.userId.toString();
      const isOperator = venue.operatorUserId?.toString() === req.userId.toString();

      if (!isCreator && !isOperator) {
        return res.status(403).json({ error: 'Not authorized to update this event' });
      }

      const { title, description, startTime, endTime, tags } = req.body;

      if (title) event.title = title;
      if (description !== undefined) event.description = description;
      if (startTime) event.startTime = new Date(startTime);
      if (endTime) event.endTime = new Date(endTime);
      if (tags) event.tags = tags;

      // Validate times if updated
      if (event.endTime <= event.startTime) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      await event.save();

      res.json({ event });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// Cancel event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await VenueEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is the creator or venue operator
    const venue = await Venue.findById(event.venueId);
    const isCreator = event.createdBy.toString() === req.userId.toString();
    const isOperator = venue.operatorUserId?.toString() === req.userId.toString();

    if (!isCreator && !isOperator) {
      return res.status(403).json({ error: 'Not authorized to cancel this event' });
    }

    event.status = 'cancelled';
    await event.save();

    res.json({ event, message: 'Event cancelled successfully' });
  } catch (error) {
    console.error('Cancel event error:', error);
    res.status(500).json({ error: 'Failed to cancel event' });
  }
});

module.exports = router;
