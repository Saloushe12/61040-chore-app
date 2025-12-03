const express = require('express');
const { body, query } = require('express-validator');
const Venue = require('../models/Venue');
const WaitReport = require('../models/WaitReport');
const VibeReport = require('../models/VibeReport');
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

// Get suggested venues (closest + trending) - MUST be before /:id route
router.get(
  '/suggested',
  [
    optionalAuth,
    query('latitude').isFloat({ min: -90, max: 90 }),
    query('longitude').isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 100, max: 50000 }),
    validate
  ],
  async (req, res) => {
    try {
      const { latitude, longitude, radius = 10000 } = req.query;
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const maxDistance = parseInt(radius);

      // Find closest venues
      const nearbyVenues = await Venue.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [userLng, userLat]
            },
            $maxDistance: maxDistance
          }
        }
      }).limit(20);

      // Find trending venues (high report activity in last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      // Get report counts per venue
      const waitReportCounts = await WaitReport.aggregate([
        {
          $match: {
            createdAt: { $gte: twoHoursAgo },
            geofenceVerified: true
          }
        },
        {
          $group: {
            _id: '$venueId',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 20
        }
      ]);

      const vibeReportCounts = await VibeReport.aggregate([
        {
          $match: {
            createdAt: { $gte: twoHoursAgo },
            geofenceVerified: true
          }
        },
        {
          $group: {
            _id: '$venueId',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 20
        }
      ]);

      // Combine report counts
      const reportCountsMap = {};
      [...waitReportCounts, ...vibeReportCounts].forEach(item => {
        const venueId = item._id.toString();
        if (!reportCountsMap[venueId]) {
          reportCountsMap[venueId] = 0;
        }
        reportCountsMap[venueId] += item.count;
      });

      // Get trending venue IDs (venues with 3+ reports in last 2 hours)
      const trendingVenueIds = Object.entries(reportCountsMap)
        .filter(([_, count]) => count >= 3)
        .map(([venueId, count]) => ({ venueId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => item.venueId);

      const trendingVenues = await Venue.find({
        _id: { $in: trendingVenueIds }
      });

      // Calculate distance for nearby venues
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
      };

      // Create suggestion objects with reasons
      const suggestions = [];
      const venueMap = new Map();

      // Add closest venues (top 10)
      nearbyVenues.slice(0, 10).forEach(venue => {
        const venueObj = venue.toObject();
        const venueId = venue._id.toString();
        const distance = calculateDistance(
          userLat,
          userLng,
          venue.location.coordinates[1],
          venue.location.coordinates[0]
        );
        venueMap.set(venueId, {
          venue: venueObj,
          reasons: ['closest'],
          distance,
          reportCount: reportCountsMap[venueId] || 0
        });
      });

      // Add trending venues
      trendingVenues.forEach(venue => {
        const venueId = venue._id.toString();
        const distance = calculateDistance(
          userLat,
          userLng,
          venue.location.coordinates[1],
          venue.location.coordinates[0]
        );
        const reportCount = reportCountsMap[venueId] || 0;

        if (venueMap.has(venueId)) {
          // Venue is both close and trending
          venueMap.get(venueId).reasons.push('trending');
          venueMap.get(venueId).reportCount = reportCount;
        } else {
          // Venue is trending but not in top 10 closest
          venueMap.set(venueId, {
            venue: venue.toObject(),
            reasons: ['trending'],
            distance,
            reportCount
          });
        }
      });

      // Convert to array and sort by priority
      const suggestionsArray = Array.from(venueMap.values());
      
      // Sort: prioritize venues that are both close and trending, then by distance/report count
      suggestionsArray.sort((a, b) => {
        // If one has both reasons and the other doesn't, prioritize the one with both
        const aHasBoth = a.reasons.length > 1;
        const bHasBoth = b.reasons.length > 1;
        if (aHasBoth && !bHasBoth) return -1;
        if (!aHasBoth && bHasBoth) return 1;

        // If both have same number of reasons, prioritize by distance (if close) or report count (if trending)
        if (a.reasons.includes('closest') && b.reasons.includes('closest')) {
          return a.distance - b.distance;
        }
        if (a.reasons.includes('trending') && b.reasons.includes('trending')) {
          return b.reportCount - a.reportCount;
        }
        // Mixed: prioritize closest if within reasonable distance, else trending
        if (a.distance < 5000) return -1;
        if (b.distance < 5000) return 1;
        return b.reportCount - a.reportCount;
      });

      // Limit to top 15 suggestions
      const topSuggestions = suggestionsArray.slice(0, 15);

      // Get metrics for all suggested venues
      const venueIds = topSuggestions.map(s => s.venue._id);
      const metricsMap = await getMultipleVenueMetrics(venueIds);

      // Attach metrics and format response
      const formattedSuggestions = topSuggestions.map(suggestion => ({
        ...suggestion.venue,
        metrics: metricsMap[suggestion.venue._id],
        suggestionReasons: suggestion.reasons,
        distance: Math.round(suggestion.distance),
        reportCount: suggestion.reportCount
      }));

      res.json({ suggestions: formattedSuggestions });
    } catch (error) {
      console.error('Get suggested venues error:', error);
      res.status(500).json({ error: 'Failed to fetch suggested venues' });
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
