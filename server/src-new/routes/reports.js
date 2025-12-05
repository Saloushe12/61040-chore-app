const express = require('express');
const { body } = require('express-validator');
const { auth, requireVenueOperator } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { verifyGeofence } = require('../services/geofence');
const { triggerAlertsForVenue } = require('../services/notifications');

const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');
const VenueConcept = require('../concepts/VenueConcept');
const {
  buildUserContributionHistorySync,
} = require('../syncs/UserContributionHistorySync');

const router = express.Router();

const waitReportConcept = new WaitReportConcept();
const vibeReportConcept = new VibeReportConcept();
const venueConcept = new VenueConcept();
const contributionHistorySync = buildUserContributionHistorySync({
  waitReportConcept,
  vibeReportConcept,
});

// Submit wait report (concept-based storage, same flow)
// Supports anonymous reporting: userId is optional if user provides displayName
router.post(
  '/wait',
  [
    body('venueId').isMongoId(),
    body('reportedWaitMinutes')
      .toInt()
      .isInt({ min: 0, max: 300 })
      .withMessage('Wait time must be an integer between 0 and 300 minutes'),
    body('latitude')
      .toFloat()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be a number between -90 and 90'),
    body('longitude')
      .toFloat()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be a number between -180 and 180'),
    body('displayName').optional().trim(),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId, reportedWaitMinutes, latitude, longitude, displayName } = req.body;
      
      // Support anonymous reporting: userId is optional
      // If authenticated, use userId; otherwise require displayName for pseudonym
      const userId = req.userId ? req.userId.toString() : null;
      if (!userId && !displayName) {
        return res.status(400).json({ 
          error: 'Either authentication or displayName is required for anonymous reporting' 
        });
      }

      // Check if venue exists in concept storage
      const [venue] = await venueConcept._getVenueDetails({ venueId });
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      // Spam prevention: check for recent report from this user (3 hours)
      // Only check if user is authenticated
      if (userId) {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const hasRecentReport = await waitReportConcept._hasRecentReportForVenue({
          userId,
          venueId,
          since: threeHoursAgo,
        });

        if (hasRecentReport) {
          return res.status(429).json({
            error:
              'You already submitted a report for this venue recently. Please wait before submitting another.',
          });
        }
      }

      // Verify geofence using existing service
      const userLocation = { latitude, longitude };
      // For compatibility, construct a pseudo-venueLocation object with coordinates
      const venueLocation = {
        coordinates: [venue.location.lon, venue.location.lat],
      };
      const geofenceResult = verifyGeofence(userLocation, venueLocation);

      const { reportId } = await waitReportConcept.submitWaitReport({
        userId: userId || null, // null for anonymous reports
        venueId,
        reportedWaitMinutes,
        geofenceVerified: geofenceResult.verified,
        location: { lat: latitude, lon: longitude },
        displayName: displayName || undefined,
      });

      // Trigger alerts if geofence verified
      if (geofenceResult.verified) {
        const io = req.app.get('io');
        if (io) {
          await triggerAlertsForVenue(venueId, io);

          io.to(`venue-${venueId}`).emit('venue-update', {
            venueId,
            type: 'wait-report',
            reportId,
          });
        }
      }

      res.status(201).json({
        reportId,
        geofence: geofenceResult,
        message: geofenceResult.verified
          ? 'Report submitted successfully'
          : `Report submitted but not verified. You are ${geofenceResult.distance}m from venue (max ${geofenceResult.radius}m)`,
      });
    } catch (error) {
      console.error('Concept submit wait report error:', error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  }
);

// Submit venue wait override (operator only)
router.post(
  '/wait/override',
  [
    auth,
    requireVenueOperator,
    body('venueId').isMongoId(),
    body('waitMinutes')
      .toInt()
      .isInt({ min: 0, max: 300 })
      .withMessage('Wait time must be an integer between 0 and 300 minutes'),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId, waitMinutes } = req.body;
      const operatorUserId = req.userId;

      // Verify operator owns this venue
      const [venue] = await venueConcept._getVenueDetails({ venueId });
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }
      if (venue.operatorUserId !== operatorUserId) {
        return res.status(403).json({ error: 'You do not have permission to override wait times for this venue' });
      }

      const { reportId } = await waitReportConcept.submitVenueWaitOverride({
        operatorUserId,
        venueId,
        waitMinutes,
      });

      // Broadcast update
      const io = req.app.get('io');
      if (io) {
        await triggerAlertsForVenue(venueId, io);
        io.to(`venue-${venueId}`).emit('venue-update', {
          venueId,
          type: 'wait-override',
          reportId,
        });
      }

      res.status(201).json({
        reportId,
        message: 'Wait time override submitted successfully',
      });
    } catch (error) {
      console.error('Concept submit wait override error:', error);
      res.status(500).json({ error: 'Failed to submit wait override' });
    }
  }
);

// Submit vibe report (concept-based storage)
// Supports anonymous reporting: userId is optional if user provides displayName
router.post(
  '/vibe',
  [
    body('venueId')
      .isMongoId()
      .withMessage('Invalid venue ID'),
    body('displayName').optional().trim(),
    body('crowdDensity')
      .isIn(['low', 'medium', 'high'])
      .withMessage('Crowd density must be one of: low, medium, high'),
    body('noiseLevel')
      .isIn(['chill', 'moderate', 'loud'])
      .withMessage('Noise level must be one of: chill, moderate, loud'),
    body('energyLevel')
      .isIn(['low', 'medium', 'hype'])
      .withMessage('Energy level must be one of: low, medium, hype'),
    body('musicTags')
      .isArray({ min: 0 })
      .withMessage('Music tags must be an array')
      .custom((tags) => {
        // Allow empty array or array of strings
        if (!Array.isArray(tags)) {
          throw new Error('Music tags must be an array');
        }
        // Validate each tag is a string (optional validation)
        return true;
      }),
    body('latitude')
      .toFloat()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be a number between -90 and 90'),
    body('longitude')
      .toFloat()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be a number between -180 and 180'),
    validate,
  ],
  async (req, res) => {
    try {
      console.log('Vibe report submission:', {
        venueId: req.body.venueId,
        crowdDensity: req.body.crowdDensity,
        noiseLevel: req.body.noiseLevel,
        energyLevel: req.body.energyLevel,
        musicTags: req.body.musicTags,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      });

      const {
        venueId,
        crowdDensity,
        noiseLevel,
        energyLevel,
        musicTags,
        latitude,
        longitude,
        displayName,
      } = req.body;
      
      // Support anonymous reporting: userId is optional
      // If authenticated, use userId; otherwise require displayName for pseudonym
      const userId = req.userId ? req.userId.toString() : null;
      if (!userId && !displayName) {
        return res.status(400).json({ 
          error: 'Either authentication or displayName is required for anonymous reporting' 
        });
      }

      const [venue] = await venueConcept._getVenueDetails({ venueId });
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      const userLocation = { latitude, longitude };
      const venueLocation = {
        coordinates: [venue.location.lon, venue.location.lat],
      };
      const geofenceResult = verifyGeofence(userLocation, venueLocation);

      const { reportId } = await vibeReportConcept.submitVibeReport({
        userId: userId || null, // null for anonymous reports
        venueId,
        crowdDensity,
        noiseLevel,
        energyLevel,
        musicTags,
        geofenceVerified: geofenceResult.verified,
        location: { lat: latitude, lon: longitude },
        displayName: displayName || undefined,
      });

      if (geofenceResult.verified) {
        const io = req.app.get('io');
        if (io) {
          await triggerAlertsForVenue(venueId, io);

          io.to(`venue-${venueId}`).emit('venue-update', {
            venueId,
            type: 'vibe-report',
            reportId,
          });
        }
      }

      res.status(201).json({
        reportId,
        geofence: geofenceResult,
        message: geofenceResult.verified
          ? 'Report submitted successfully'
          : `Report submitted but not verified. You are ${geofenceResult.distance}m from venue (max ${geofenceResult.radius}m)`,
      });
    } catch (error) {
      console.error('Concept submit vibe report error:', error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  }
);

// Get user's report history (concept-based sync)
router.get('/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const { waitReports, vibeReports } = await contributionHistorySync({
      userId: req.userId.toString(),
      limit,
    });

    res.json({
      waitReports,
      vibeReports,
    });
  } catch (error) {
    console.error('Concept get report history error:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

module.exports = router;


