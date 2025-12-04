const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
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
router.post(
  '/wait',
  [
    auth,
    body('venueId').isMongoId(),
    body('reportedWaitMinutes').isInt({ min: 0, max: 300 }),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId, reportedWaitMinutes, latitude, longitude } = req.body;

      // Check if venue exists in concept storage
      const [venue] = await venueConcept._getVenueDetails({ venueId });
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      // Spam prevention: check for recent report from this user (3 hours)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const hasRecentReport = await waitReportConcept._hasRecentReportForVenue({
        userId: req.userId.toString(),
        venueId,
        since: threeHoursAgo,
      });

      if (hasRecentReport) {
        return res.status(429).json({
          error:
            'You already submitted a report for this venue recently. Please wait before submitting another.',
        });
      }

      // Verify geofence using existing service
      const userLocation = { latitude, longitude };
      // For compatibility, construct a pseudo-venueLocation object with coordinates
      const venueLocation = {
        coordinates: [venue.location.lon, venue.location.lat],
      };
      const geofenceResult = verifyGeofence(userLocation, venueLocation);

      const { reportId } = await waitReportConcept.submitWaitReport({
        userId: req.userId.toString(),
        venueId,
        reportedWaitMinutes,
        geofenceVerified: geofenceResult.verified,
        location: { lat: latitude, lon: longitude },
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

// Submit vibe report (concept-based storage)
router.post(
  '/vibe',
  [
    auth,
    body('venueId').isMongoId(),
    body('crowdDensity').isIn(['low', 'medium', 'high']),
    body('noiseLevel').isIn(['chill', 'moderate', 'loud']),
    body('energyLevel').isIn(['low', 'medium', 'hype']),
    body('musicTags').isArray(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    validate,
  ],
  async (req, res) => {
    try {
      const {
        venueId,
        crowdDensity,
        noiseLevel,
        energyLevel,
        musicTags,
        latitude,
        longitude,
      } = req.body;

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
        userId: req.userId.toString(),
        venueId,
        crowdDensity,
        noiseLevel,
        energyLevel,
        musicTags,
        geofenceVerified: geofenceResult.verified,
        location: { lat: latitude, lon: longitude },
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


