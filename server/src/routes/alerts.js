const express = require('express');
const { body } = require('express-validator');
const AlertSubscription = require('../models/AlertSubscription');
const Venue = require('../models/Venue');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Get user's alert subscriptions
router.get('/', auth, async (req, res) => {
  try {
    const subscriptions = await AlertSubscription.find({ userId: req.userId })
      .populate('venueId', 'name address location')
      .sort({ createdAt: -1 });

    res.json({ subscriptions });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create alert subscription
router.post(
  '/',
  [
    auth,
    body('venueId').isMongoId(),
    body('condition').isObject(),
    body('condition.waitBelowMinutes').optional().isInt({ min: 0 }),
    body('condition.crowdDensityIn').optional().isArray(),
    body('condition.eventTag').optional().isString(),
    validate
  ],
  async (req, res) => {
    try {
      const { venueId, condition } = req.body;

      // Check if venue exists
      const venue = await Venue.findById(venueId);
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      // Validate that at least one condition is set
      if (
        !condition.waitBelowMinutes &&
        (!condition.crowdDensityIn || condition.crowdDensityIn.length === 0) &&
        !condition.eventTag
      ) {
        return res.status(400).json({ error: 'At least one alert condition must be set' });
      }

      // Check if user already has an active subscription for this venue
      const existingSubscription = await AlertSubscription.findOne({
        userId: req.userId,
        venueId,
        active: true
      });

      if (existingSubscription) {
        return res.status(400).json({
          error: 'You already have an active alert for this venue. Update or deactivate it first.'
        });
      }

      const subscription = new AlertSubscription({
        userId: req.userId,
        venueId,
        condition
      });

      await subscription.save();

      res.status(201).json({ subscription });
    } catch (error) {
      console.error('Create alert error:', error);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }
);

// Update alert subscription
router.patch(
  '/:id',
  [
    auth,
    body('condition').optional().isObject(),
    body('active').optional().isBoolean(),
    validate
  ],
  async (req, res) => {
    try {
      const subscription = await AlertSubscription.findById(req.params.id);

      if (!subscription) {
        return res.status(404).json({ error: 'Alert subscription not found' });
      }

      // Check ownership
      if (subscription.userId.toString() !== req.userId.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this alert' });
      }

      const { condition, active } = req.body;

      if (condition) {
        // Validate that at least one condition is set
        if (
          !condition.waitBelowMinutes &&
          (!condition.crowdDensityIn || condition.crowdDensityIn.length === 0) &&
          !condition.eventTag
        ) {
          return res.status(400).json({ error: 'At least one alert condition must be set' });
        }
        subscription.condition = condition;
      }

      if (active !== undefined) {
        subscription.active = active;
      }

      await subscription.save();

      res.json({ subscription });
    } catch (error) {
      console.error('Update alert error:', error);
      res.status(500).json({ error: 'Failed to update alert' });
    }
  }
);

// Delete alert subscription
router.delete('/:id', auth, async (req, res) => {
  try {
    const subscription = await AlertSubscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: 'Alert subscription not found' });
    }

    // Check ownership
    if (subscription.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this alert' });
    }

    await AlertSubscription.deleteOne({ _id: req.params.id });

    res.json({ message: 'Alert subscription deleted successfully' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

module.exports = router;
