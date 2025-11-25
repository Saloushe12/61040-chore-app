const express = require('express');
const { body } = require('express-validator');
const WaitReport = require('../models/WaitReport');
const VibeReport = require('../models/VibeReport');
const Venue = require('../models/Venue');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { verifyGeofence } = require('../services/geofence');
const { triggerAlertsForVenue } = require('../services/notifications');

const router = express.Router();

// Submit wait report
router.post(
  '/wait',
  [
    auth,
    body('venueId').isMongoId(),
    body('reportedWaitMinutes').isInt({ min: 0, max: 300 }),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    validate
  ],
  async (req, res) => {
    try {
      const { venueId, reportedWaitMinutes, latitude, longitude } = req.body;

      // Check if venue exists
      const venue = await Venue.findById(venueId);
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      // Check for recent report from this user (prevent spam)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const recentReport = await WaitReport.findOne({
        userId: req.userId,
        venueId,
        createdAt: { $gte: threeHoursAgo }
      });

      if (recentReport) {
        return res.status(429).json({
          error: 'You already submitted a report for this venue recently. Please wait before submitting another.'
        });
      }

      // Verify geofence
      const userLocation = { latitude, longitude };
      const geofenceResult = verifyGeofence(userLocation, venue.location);

      const report = new WaitReport({
        venueId,
        userId: req.userId,
        reportedWaitMinutes,
        geofenceVerified: geofenceResult.verified,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      });

      await report.save();

      // Trigger alerts if geofence verified
      if (geofenceResult.verified) {
        const io = req.app.get('io');
        if (io) {
          await triggerAlertsForVenue(venueId, io);

          // Broadcast update to venue subscribers
          io.to(`venue-${venueId}`).emit('venue-update', {
            venueId,
            type: 'wait-report',
            reportId: report._id
          });
        }
      }

      res.status(201).json({
        report,
        geofence: geofenceResult,
        message: geofenceResult.verified
          ? 'Report submitted successfully'
          : `Report submitted but not verified. You are ${geofenceResult.distance}m from venue (max ${geofenceResult.radius}m)`
      });
    } catch (error) {
      console.error('Submit wait report error:', error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  }
);

// Submit vibe report
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
    validate
  ],
  async (req, res) => {
    try {
      const { venueId, crowdDensity, noiseLevel, energyLevel, musicTags, latitude, longitude } = req.body;

      // Check if venue exists
      const venue = await Venue.findById(venueId);
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      // Verify geofence
      const userLocation = { latitude, longitude };
      const geofenceResult = verifyGeofence(userLocation, venue.location);

      const report = new VibeReport({
        venueId,
        userId: req.userId,
        crowdDensity,
        noiseLevel,
        energyLevel,
        musicTags,
        geofenceVerified: geofenceResult.verified,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      });

      await report.save();

      // Trigger alerts if geofence verified
      if (geofenceResult.verified) {
        const io = req.app.get('io');
        if (io) {
          await triggerAlertsForVenue(venueId, io);

          // Broadcast update to venue subscribers
          io.to(`venue-${venueId}`).emit('venue-update', {
            venueId,
            type: 'vibe-report',
            reportId: report._id
          });
        }
      }

      res.status(201).json({
        report,
        geofence: geofenceResult,
        message: geofenceResult.verified
          ? 'Report submitted successfully'
          : `Report submitted but not verified. You are ${geofenceResult.distance}m from venue (max ${geofenceResult.radius}m)`
      });
    } catch (error) {
      console.error('Submit vibe report error:', error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  }
);

// Get user's report history
router.get('/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const waitReports = await WaitReport.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('venueId', 'name address');

    const vibeReports = await VibeReport.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('venueId', 'name address');

    res.json({
      waitReports,
      vibeReports
    });
  } catch (error) {
    console.error('Get report history error:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
    }
  }
);

module.exports = router;
