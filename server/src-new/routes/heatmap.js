const express = require('express');
const { query } = require('express-validator');
const { optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  buildHeatmapSync,
} = require('../syncs/HeatmapSync');
const WaitReportConcept = require('../concepts/WaitReportConcept');
const VibeReportConcept = require('../concepts/VibeReportConcept');

const router = express.Router();

const waitReportConcept = new WaitReportConcept();
const vibeReportConcept = new VibeReportConcept();

const heatmapSync = buildHeatmapSync({
  waitReportConcept,
  vibeReportConcept,
});

// Get heatmap data
router.get(
  '/',
  [
    optionalAuth,
    query('minLat').isFloat({ min: -90, max: 90 }),
    query('maxLat').isFloat({ min: -90, max: 90 }),
    query('minLon').isFloat({ min: -180, max: 180 }),
    query('maxLon').isFloat({ min: -180, max: 180 }),
    query('gridSize').optional().isInt({ min: 5, max: 50 }),
    query('timeWindowMinutes').optional().isInt({ min: 1, max: 1440 }),
    validate,
  ],
  async (req, res) => {
    try {
      const { minLat, maxLat, minLon, maxLon, gridSize, timeWindowMinutes } = req.query;
      const areaBounds = {
        minLat: parseFloat(minLat),
        maxLat: parseFloat(maxLat),
        minLon: parseFloat(minLon),
        maxLon: parseFloat(maxLon),
      };
      const result = await heatmapSync({
        areaBounds,
        gridSize: gridSize ? parseInt(gridSize, 10) : undefined,
        timeWindowMinutes: timeWindowMinutes ? parseInt(timeWindowMinutes, 10) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error('Concept get heatmap error:', error);
      res.status(500).json({ error: 'Failed to get heatmap' });
    }
  }
);

module.exports = router;

