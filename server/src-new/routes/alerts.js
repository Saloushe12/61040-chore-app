const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const AlertSubscriptionConcept = require('../concepts/AlertSubscriptionConcept');
const VenueConcept = require('../concepts/VenueConcept');
const {
  buildUserAlertsSync,
} = require('../syncs/UserAlertsSync');

const router = express.Router();

const alertConcept = new AlertSubscriptionConcept();
const venueConcept = new VenueConcept();
const userAlertsSync = buildUserAlertsSync({ alertConcept });

// Get user's alert subscriptions via sync
router.get('/', auth, async (req, res) => {
  try {
    const { subscriptions } = await userAlertsSync({
      userId: req.userId.toString(),
    });
    res.json({ subscriptions });
  } catch (error) {
    console.error('Concept get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create alert subscription using concept
router.post(
  '/',
  [
    auth,
    body('venueId').isMongoId(),
    body('condition').isObject(),
    body('condition.waitBelowMinutes').optional().isInt({ min: 0 }),
    body('condition.crowdDensityIn').optional().isArray(),
    body('condition.eventTag').optional().isString(),
    validate,
  ],
  async (req, res) => {
    try {
      const { venueId, condition } = req.body;

      // Check venue exists (concept storage)
      const [venue] = await venueConcept._getVenueDetails({ venueId });
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }

      const result = await alertConcept.createAlertSubscription({
        userId: req.userId.toString(),
        venueId,
        condition,
      });

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json({ subscriptionId: result.subscriptionId });
    } catch (error) {
      console.error('Concept create alert error:', error);
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
    validate,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { condition, active } = req.body;

      const result = await alertConcept.updateAlertSubscription({
        subscriptionId: id,
        condition,
        active,
      });

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ subscriptionId: id });
    } catch (error) {
      console.error('Concept update alert error:', error);
      res.status(500).json({ error: 'Failed to update alert' });
    }
  }
);

// Delete (deactivate) alert subscription
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await alertConcept.deactivateAlertSubscription({
      subscriptionId: id,
    });

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ message: 'Alert subscription deactivated successfully' });
  } catch (error) {
    console.error('Concept delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

module.exports = router;


