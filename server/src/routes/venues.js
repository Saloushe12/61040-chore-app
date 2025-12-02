const express = require('express');
const { body, query } = require('express-validator');
const Venue = require('../models/Venue');
const { auth, optionalAuth, requireVenueOperator } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { getCurrentVenueMetrics, getMultipleVenueMetrics } = require('../services/aggregation');
const { getPeakForecast } = require('../services/forecasting');

const router = express.Router();

// Get nearby venues
router.get(
  '/',
  [
    optionalAuth,
    query('latitude').isFloat({ min: -90, max: 90 }),
    query('longitude').isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 100, max: 20000000 }), // Increased max to allow fetching all venues
    query('tags').optional(),
    validate
  ],
  async (req, res) => {
    try {
      const { latitude, longitude, radius = 5000, tags } = req.query;
      const maxDistance = parseInt(radius);

      const query = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            ...(maxDistance < 20000000 && { $maxDistance: maxDistance }) // Only add maxDistance if not fetching all
          }
        }
      };

      // Filter by tags if provided
      if (tags) {
        const tagArray = tags.split(',');
        query.tags = { $in: tagArray };
      }

      const venues = await Venue.find(query).limit(100); // Increased limit

      // Get metrics for all venues
      const venueIds = venues.map(v => v._id);
      const metricsMap = await getMultipleVenueMetrics(venueIds);

      // Attach metrics to venues
      const venuesWithMetrics = venues.map(venue => ({
        ...venue.toObject(),
        metrics: metricsMap[venue._id]
      }));

      res.json({ venues: venuesWithMetrics });
    } catch (error) {
      console.error('Get venues error:', error);
      res.status(500).json({ error: 'Failed to fetch venues' });
    }
  }
);

// Get venue by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id).populate('operatorUserId', 'displayName');

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const metrics = await getCurrentVenueMetrics(venue._id);

    res.json({
      venue: venue.toObject(),
      metrics
    });
  } catch (error) {
    console.error('Get venue error:', error);
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

// Create venue (any authenticated user)
router.post(
  '/',
  [
    auth,
    body('name').trim().notEmpty(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('address').trim().notEmpty(),
    body('tags').optional().isArray(),
    validate
  ],
  async (req, res) => {
    try {
      const { name, latitude, longitude, address, hours, tags, staticAttributes } = req.body;

      // Use provided coordinates or default to (0, 0) if not provided
      // In production, consider geocoding the address instead
      const lat = latitude !== undefined ? parseFloat(latitude) : 0;
      const lng = longitude !== undefined ? parseFloat(longitude) : 0;

      const venue = new Venue({
        name,
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        address,
        hours: hours || {},
        tags: tags || [],
        staticAttributes: staticAttributes || {},
        operatorUserId: req.user.role === 'venue_operator' ? req.userId : undefined
      });

      await venue.save();

      res.status(201).json({ venue });
    } catch (error) {
      console.error('Create venue error:', error);
      res.status(500).json({ error: 'Failed to create venue' });
    }
  }
);

// Update venue (operator only)
router.patch(
  '/:id',
  [
    auth,
    requireVenueOperator,
    body('name').optional().trim(),
    body('address').optional().trim(),
    body('hours').optional(),
    body('tags').optional().isArray(),
    body('staticAttributes').optional(),
    validate
  ],
  async (req, res) => {
    try {
      const venue = await Venue.findById(req.params.id);

      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      // Check ownership
      if (venue.operatorUserId?.toString() !== req.userId.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this venue' });
      }

      const { name, address, hours, tags, staticAttributes } = req.body;

      if (name) venue.name = name;
      if (address) venue.address = address;
      if (hours) venue.hours = hours;
      if (tags) venue.tags = tags;
      if (staticAttributes) venue.staticAttributes = staticAttributes;

      await venue.save();

      res.json({ venue });
    } catch (error) {
      console.error('Update venue error:', error);
      res.status(500).json({ error: 'Failed to update venue' });
    }
  }
);

// Update venue status (operator only)
router.patch(
  '/:id/status',
  [
    auth,
    requireVenueOperator,
    body('status').isIn(['open', 'closed', 'door_hold']),
    validate
  ],
  async (req, res) => {
    try {
      const venue = await Venue.findById(req.params.id);

      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      // Check ownership
      if (venue.operatorUserId?.toString() !== req.userId.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this venue' });
      }

      venue.currentStatus = req.body.status;
      await venue.save();

      // Broadcast status update via Socket.io if available
      const io = req.app.get('io');
      if (io) {
        io.to(`venue-${venue._id}`).emit('venue-update', {
          venueId: venue._id,
          type: 'status',
          status: venue.currentStatus
        });
      }

      res.json({ venue });
    } catch (error) {
      console.error('Update venue status error:', error);
      res.status(500).json({ error: 'Failed to update venue status' });
    }
  }
);

// Get venue forecast
router.get('/:id/forecast', optionalAuth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const dayOfWeek = req.query.dayOfWeek ? parseInt(req.query.dayOfWeek) : null;
    const forecast = await getPeakForecast(venue._id, dayOfWeek);

    res.json(forecast);
  } catch (error) {
    console.error('Get forecast error:', error);
    res.status(500).json({ error: 'Failed to get forecast' });
  }
});

module.exports = router;
