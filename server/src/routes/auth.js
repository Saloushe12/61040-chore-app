const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('displayName').optional().trim(),
    body('role').optional().isIn(['patron', 'venue_operator']),
    validate
  ],
  async (req, res) => {
    try {
      const { email, password, displayName, role, homeArea } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Create user
      const user = new User({
        email,
        passwordHash: password, // Will be hashed by pre-save hook
        displayName,
        role: role || 'patron',
        homeArea
      });

      await user.save();

      // Generate JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });

      res.status(201).json({
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
    validate
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });

      res.json({
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// Update profile
router.patch(
  '/me',
  [
    auth,
    body('displayName').optional().trim(),
    body('homeArea').optional().trim(),
    validate
  ],
  async (req, res) => {
    try {
      const { displayName, homeArea } = req.body;

      if (displayName !== undefined) req.user.displayName = displayName;
      if (homeArea !== undefined) req.user.homeArea = homeArea;

      await req.user.save();

      res.json({ user: req.user.toJSON() });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Profile update failed' });
    }
  }
);

module.exports = router;
