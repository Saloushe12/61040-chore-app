const express = require('express');
const { body, query } = require('express-validator');
const { auth, optionalAuth, requireVenueOperator } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const VenueConcept = require('../concepts/VenueConcept');
const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');
const VenueEventConcept = require('../concepts/VenueEventConcept');
const VenueStatsSnapshotConcept = require('../concepts/VenueStatsSnapshotConcept');

const {
  buildNearbyVenuesSync,
} = require('../syncs/NearbyVenuesSync');
const {
  buildVenueDetailSync,
} = require('../syncs/VenueDetailSync');
const {
  buildPeakForecastSync,
} = require('../syncs/PeakForecastSync');
const {
  buildVenueDashboardSync,
} = require('../syncs/VenueDashboardSync');
const { getMultipleVenueMetricsConcept } = require('../services/notifications');
const { calculateDistance } = require('../services/geofence');

const router = express.Router();

// Instantiate concepts
const venueConcept = new VenueConcept();
const waitReportConcept = new WaitReportConcept();
const vibeReportConcept = new VibeReportConcept();
const venueEventConcept = new VenueEventConcept();
const snapshotConcept = new VenueStatsSnapshotConcept();

// Build sync functions
const nearbyVenuesSync = buildNearbyVenuesSync({
  waitReportConcept,
  vibeReportConcept,
});
const venueDetailSync = buildVenueDetailSync({
  venueConcept,
  waitReportConcept,
  vibeReportConcept,
  venueEventConcept,
  snapshotConcept,
});
const peakForecastSync = buildPeakForecastSync();
const venueDashboardSync = buildVenueDashboardSync({
  venueConcept,
  venueEventConcept,
  waitReportConcept,
  vibeReportConcept,
});

// Get nearby venues (concept/sync-based)
router.get(
  '/',
  [
    optionalAuth,
    query('latitude').isFloat({ min: -90, max: 90 }),
    query('longitude').isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 100, max: 20000000 }),
    query('tags').optional(),
    validate,
  ],
  async (req, res) => {
    try {
      const { latitude, longitude, radius = 5000, tags } = req.query;
      
      // Handle tags - can be array (from axios tags[]=value1&tags[]=value2) or comma-separated string
      let tagArray = undefined;
      if (tags) {
        if (Array.isArray(tags)) {
          // Axios sends arrays as tags[]=value1&tags[]=value2, Express parses as array
          tagArray = tags.filter(t => t && String(t).trim().length > 0).map(t => String(t).trim());
        } else if (typeof tags === 'string') {
          // Comma-separated string format
          tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        }
        // Set to undefined if empty after filtering
        if (tagArray && tagArray.length === 0) {
          tagArray = undefined;
        }
      }

      const result = await nearbyVenuesSync({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: parseInt(radius, 10),
        tags: tagArray,
      });

      // Deduplicate venues by ID and name+address
      const venues = result.venues || [];
      const seenIds = new Set();
      const seenKeys = new Set();
      const deduplicatedVenues = venues.filter((venue) => {
        const id = String(venue._id || venue.venueId || '').toLowerCase().trim();
        const key = `${venue.name || ''}|${venue.address || ''}`.toLowerCase().trim();
        
        // Skip if we've seen this ID or name+address combination
        if (!id || id === 'undefined' || id === 'null' || seenIds.has(id)) {
          return false;
        }
        if (key && seenKeys.has(key)) {
          return false;
        }
        
        seenIds.add(id);
        if (key) seenKeys.add(key);
        return true;
      });

      res.json({ venues: deduplicatedVenues });
    } catch (error) {
      console.error('Concept get venues error:', error);
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
    validate,
  ],
  async (req, res) => {
    try {
      const { latitude, longitude, radius = 10000 } = req.query;
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const maxDistance = parseInt(radius, 10);

      // Helper function to normalize venue ID to string
      // Always prefer venueId over _id for consistency
      const normalizeVenueId = (venue) => {
        if (!venue) return null;
        
        // Prefer venueId, then _id
        let id = venue.venueId || venue._id;
        if (!id) return null;
        
        // Handle ObjectId objects
        if (id.toHexString && typeof id.toHexString === 'function') {
          return id.toHexString();
        }
        
        // Handle strings - normalize to lowercase for consistency
        const idStr = String(id).trim().toLowerCase();
        if (!idStr || idStr === 'undefined' || idStr === 'null' || idStr === '') return null;
        
        return idStr;
      };

      // Use NearbyVenuesSync to get closest venues
      const nearbyResult = await nearbyVenuesSync({
        latitude: userLat,
        longitude: userLng,
        radiusMeters: maxDistance,
        tags: undefined,
      });
      const nearbyVenues = nearbyResult.venues || [];
      
      // Deduplicate nearby venues by ID, then sort by distance, then take top 20
      const nearbyVenueIds = new Set();
      const deduplicatedNearby = nearbyVenues.filter((venue) => {
        const id = normalizeVenueId(venue);
        if (!id || nearbyVenueIds.has(id)) return false;
        nearbyVenueIds.add(id);
        return true;
      });
      
      // Sort by distance to get actual closest venues
      deduplicatedNearby.sort((a, b) => {
        const distA = a.distanceMeters || 0;
        const distB = b.distanceMeters || 0;
        return distA - distB;
      });
      
      const topNearby = deduplicatedNearby.slice(0, 20);

      // Find trending venues (high report activity in last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      // Get all recent reports and count by venue
      const waitReports = await waitReportConcept._getAllRecentReports({
        since: twoHoursAgo,
      });
      const vibeReports = await vibeReportConcept._getAllRecentReports({
        since: twoHoursAgo,
      });

      // Filter to geofence-verified reports
      const verifiedWaitReports = waitReports.filter((r) => r.geofenceVerified);
      const verifiedVibeReports = vibeReports.filter((r) => r.geofenceVerified);

      // Count reports per venue
      const reportCountsMap = {};
      [...verifiedWaitReports, ...verifiedVibeReports].forEach((report) => {
        const venueId = report.venueId.toString();
        reportCountsMap[venueId] = (reportCountsMap[venueId] || 0) + 1;
      });

      // Get trending venue IDs (venues with 3+ reports in last 2 hours)
      const trendingVenueIds = Object.entries(reportCountsMap)
        .filter(([_, count]) => count >= 3)
        .map(([venueId, count]) => ({ venueId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item) => item.venueId);

      // Fetch trending venues - deduplicate venue IDs first
      const uniqueTrendingIds = [...new Set(trendingVenueIds)];
      const trendingVenues = [];
      for (const venueId of uniqueTrendingIds) {
        const [venue] = await venueConcept._getVenueDetails({ venueId });
        if (venue) {
          trendingVenues.push(venue);
        }
      }
      
      // Additional deduplication of trending venues by normalized ID
      const trendingVenueIdsSeen = new Set();
      const deduplicatedTrending = trendingVenues.filter((venue) => {
        const id = normalizeVenueId(venue);
        if (!id || trendingVenueIdsSeen.has(id)) return false;
        trendingVenueIdsSeen.add(id);
        return true;
      });

      // Create suggestion objects with reasons
      // Use both ID and name+address as keys to catch duplicates
      const venueMap = new Map();
      const venueKeys = new Set(); // Track by name+address as fallback

      // Add closest venues (top 10) - normalize IDs to strings
      topNearby.slice(0, 10).forEach((venue) => {
        const venueId = normalizeVenueId(venue);
        if (!venueId) return; // Skip invalid venues
        
        // Create a unique key from name + address as fallback
        const venueKey = `${venue.name || ''}|${venue.address || ''}`.toLowerCase().trim();
        
        // Skip if already in map by ID OR by name+address
        if (venueMap.has(venueId) || venueKeys.has(venueKey)) {
          return;
        }
        
        venueKeys.add(venueKey);
        
        // Normalize the venue object to have consistent ID fields
        const normalizedVenue = {
          ...venue,
          _id: venueId,
          venueId: venueId,
        };
        
        const venueLat = venue.location?.lat || venue.location?.coordinates?.[1];
        const venueLon = venue.location?.lon || venue.location?.coordinates?.[0];
        const distance = calculateDistance(userLat, userLng, venueLat, venueLon);

        venueMap.set(venueId, {
          venue: normalizedVenue,
          reasons: ['closest'],
          distance,
          reportCount: reportCountsMap[venueId] || 0,
        });
      });

      // Add trending venues - normalize IDs to strings
      deduplicatedTrending.forEach((venue) => {
        const venueId = normalizeVenueId(venue);
        if (!venueId) return; // Skip invalid venues
        
        // Create a unique key from name + address as fallback
        const venueKey = `${venue.name || ''}|${venue.address || ''}`.toLowerCase().trim();
        
        // Normalize the venue object to have consistent ID fields
        const normalizedVenue = {
          ...venue,
          _id: venueId,
          venueId: venueId,
        };
        
        const venueLat = venue.location?.lat || venue.location?.coordinates?.[1];
        const venueLon = venue.location?.lon || venue.location?.coordinates?.[0];
        const distance = calculateDistance(userLat, userLng, venueLat, venueLon);
        const reportCount = reportCountsMap[venueId] || 0;

        if (venueMap.has(venueId) || venueKeys.has(venueKey)) {
          // Venue is both close and trending (or duplicate by name+address)
          if (venueMap.has(venueId)) {
            const existing = venueMap.get(venueId);
            if (!existing.reasons.includes('trending')) {
              existing.reasons.push('trending');
            }
            existing.reportCount = reportCount;
            // Update venue object to ensure consistent IDs
            existing.venue = normalizedVenue;
          }
          // If it exists by name+address but not by ID, skip it (duplicate)
        } else {
          // Venue is trending but not in top 10 closest
          venueKeys.add(venueKey);
          venueMap.set(venueId, {
            venue: normalizedVenue,
            reasons: ['trending'],
            distance,
            reportCount,
          });
        }
      });

      // Convert to array - the Map already deduplicated by ID
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

      // Get metrics for all suggested venues - use normalized IDs
      const venueIds = topSuggestions.map((s) => {
        return normalizeVenueId(s.venue);
      }).filter(Boolean);
      const metricsMap = await getMultipleVenueMetricsConcept(venueIds);

      // Attach metrics and format response
      // All venues in the Map should already have normalized IDs, but ensure consistency
      const formattedSuggestions = topSuggestions.map((suggestion) => {
        const venue = suggestion.venue;
        const venueId = normalizeVenueId(venue);
        if (!venueId) return null; // Skip invalid venues
        
        // Create venue object with guaranteed consistent ID fields
        const { _id, venueId: vId, ...venueWithoutIds } = venue;
        
        return {
          ...venueWithoutIds,
          _id: venueId, // Always use normalized _id
          venueId: venueId, // Always use normalized venueId (same as _id)
          metrics: metricsMap[venueId],
          suggestionReasons: suggestion.reasons,
          distance: Math.round(suggestion.distance),
          reportCount: suggestion.reportCount,
        };
      }).filter(Boolean); // Remove any null entries

      // Final deduplication by ID to ensure no duplicates - normalize all IDs to strings
      const seenIds = new Set();
      const deduplicatedSuggestions = formattedSuggestions.filter((suggestion) => {
        const id = normalizeVenueId(suggestion) || String(suggestion._id || suggestion.venueId || '');
        if (!id || id === 'undefined' || id === 'null' || seenIds.has(id)) {
          return false;
        }
        seenIds.add(id);
        return true;
      });

      res.json({ suggestions: deduplicatedSuggestions });
    } catch (error) {
      console.error('Concept get suggested venues error:', error);
      res.status(500).json({ error: 'Failed to fetch suggested venues' });
    }
  }
);

// Get venue by ID with detail sync
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const venueId = req.params.id;

    // Validate venue ID
    if (!venueId || venueId === 'undefined' || venueId.trim() === '') {
      return res.status(400).json({ error: 'Invalid venue ID' });
    }

    // Validate ObjectId format (24 character hex string)
    if (!/^[0-9a-fA-F]{24}$/.test(venueId)) {
      return res.status(400).json({ error: 'Invalid venue ID format' });
    }

    const { latitude, longitude } = req.query;
    const userLocation =
      latitude && longitude
        ? {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          }
        : undefined;

    const result = await venueDetailSync({
      venueId,
      userLocation,
    });

    if (result.error === 'Venue not found') {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Concept get venue error:', error);
    console.error('Error details:', {
      venueId: req.params.id,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

// Create venue (concept-based)
router.post(
  '/',
  [
    auth,
    body('name').trim().notEmpty(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('address').trim().notEmpty(),
    body('tags').optional().isArray(),
    validate,
  ],
  async (req, res) => {
    try {
      const {
        name,
        latitude,
        longitude,
        address,
        hours,
        tags,
        staticAttributes,
      } = req.body;

      const lat = latitude !== undefined ? parseFloat(latitude) : 0;
      const lng = longitude !== undefined ? parseFloat(longitude) : 0;

      const result = await venueConcept.createVenue({
        name,
        location: { lat, lon: lng },
        address,
        hours: hours || {},
        tags: tags || [],
        staticAttributes: staticAttributes || {},
        operatorUserId:
          req.user && req.user.role === 'venue_operator'
            ? req.userId.toString()
            : undefined,
      });

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      // Fetch full venue details for response
      const [venue] = await venueConcept._getVenueDetails({
        venueId: result.venueId,
      });

      res.status(201).json({ venue });
    } catch (error) {
      console.error('Concept create venue error:', error);
      res.status(500).json({ error: 'Failed to create venue' });
    }
  }
);

// Update venue (operator only, concept-based)
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
    validate,
  ],
  async (req, res) => {
    try {
      // Ownership check still done via Mongoose-based auth middleware's req.user
      const { id } = req.params;
      const { name, address, hours, tags, staticAttributes } = req.body;

      const fieldsToUpdate = {};
      if (name !== undefined) fieldsToUpdate.name = name;
      if (address !== undefined) fieldsToUpdate.address = address;
      if (hours !== undefined) fieldsToUpdate.hours = hours;
      if (tags !== undefined) fieldsToUpdate.tags = tags;
      if (staticAttributes !== undefined)
        fieldsToUpdate.staticAttributes = staticAttributes;

      const result = await venueConcept.updateVenueProfile({
        venueId: id,
        fieldsToUpdate,
      });

      if (result.error) {
        return res.status(404).json({ error: result.error });
      }

      const [venue] = await venueConcept._getVenueDetails({ venueId: id });
      res.json({ venue });
    } catch (error) {
      console.error('Concept update venue error:', error);
      res.status(500).json({ error: 'Failed to update venue' });
    }
  }
);

// Claim venue (operator only, concept-based)
router.patch(
  '/:id/claim',
  [
    auth,
    requireVenueOperator,
    validate,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const operatorUserId = req.userId;

      const result = await venueConcept.claimVenue({
        venueId: id,
        operatorUserId,
      });

      if (result.error) {
        return res.status(404).json({ error: result.error });
      }

      const [venue] = await venueConcept._getVenueDetails({ venueId: id });
      res.json({ venue });
    } catch (error) {
      console.error('Concept claim venue error:', error);
      res.status(500).json({ error: 'Failed to claim venue' });
    }
  }
);

// Update venue status (operator only, concept-based)
router.patch(
  '/:id/status',
  [
    auth,
    requireVenueOperator,
    body('status').isIn(['open', 'closed', 'door_hold']),
    validate,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await venueConcept.updateVenueStatus({
        venueId: id,
        status,
      });

      if (result.error) {
        return res.status(404).json({ error: result.error });
      }

      const [venue] = await venueConcept._getVenueDetails({ venueId: id });

      // Broadcast status update via Socket.io if available
      const io = req.app.get('io');
      if (io) {
        io.to(`venue-${id}`).emit('venue-update', {
          venueId: id,
          type: 'status',
          status: venue.currentStatus,
        });
      }

      res.json({ venue });
    } catch (error) {
      console.error('Concept update venue status error:', error);
      res.status(500).json({ error: 'Failed to update venue status' });
    }
  }
);

// Get venue forecast (concept/service wrapper)
router.get('/:id/forecast', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const dayOfWeek = req.query.dayOfWeek
      ? parseInt(req.query.dayOfWeek, 10)
      : null;

    const forecast = await peakForecastSync({ venueId: id, dayOfWeek });
    res.json(forecast);
  } catch (error) {
    console.error('Concept get forecast error:', error);
    res.status(500).json({ error: 'Failed to get forecast' });
  }
});

// Get operator dashboard (operator only)
router.get(
  '/operator/dashboard',
  [auth, requireVenueOperator, validate],
  async (req, res) => {
    try {
      const operatorUserId = req.userId;
      const result = await venueDashboardSync({ operatorUserId });
      res.json(result);
    } catch (error) {
      console.error('Concept get dashboard error:', error);
      res.status(500).json({ error: 'Failed to get dashboard' });
    }
  }
);

module.exports = router;


