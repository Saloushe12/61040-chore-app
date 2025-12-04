const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const UserConcept = require('../concepts/UserConcept');

const router = express.Router();
const userConcept = new UserConcept();

// Helper to build a user object for responses from concept storage
async function getUserPayload(userId) {
  const [user] = await userConcept._getUserDetails({ userId });
  if (!user) return null;
  // Match existing auth route payload as closely as possible
  return {
    _id: user.userId,
    role: user.role,
    displayName: user.displayName || null,
    homeArea: user.homeArea || null,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
  };
}

// Local auth middleware using JWT + UserConcept instead of Mongoose User
const authConcept = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [user] = await userConcept._getUserDetails({ userId: decoded.userId });

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    req.user = user;
    req.userId = user.userId;
    req.token = token;
    next();
  } catch (err) {
    console.error('Concept auth error:', err);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Register new user using UserConcept
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('displayName').optional().trim(),
    body('role').optional().isIn(['patron', 'venue_operator']),
    body('homeArea').optional().trim(),
    validate,
  ],
  async (req, res) => {
    try {
      const { email, password, displayName, role, homeArea } = req.body;

      // Use concept to register
      console.log('Registration attempt:', { email, displayName, role });
      
      const result = await userConcept.register({
        email,
        password,
        displayName,
        role,
      });

      if (result.error) {
        console.log('Registration failed:', result.error);
        return res.status(400).json({ error: result.error });
      }

      const userId = result.userId;
      console.log('User registered successfully, userId:', userId);

      // If homeArea provided, update profile
      if (homeArea) {
        await userConcept.updateProfile({ userId, homeArea });
      }

      const userPayload = await getUserPayload(userId);
      
      if (!userPayload) {
        console.error('Failed to get user payload after registration, userId:', userId);
        return res.status(500).json({ error: 'Registration succeeded but failed to retrieve user data' });
      }

      // Generate JWT
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not set in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      res.status(201).json({
        user: userPayload,
        token,
      });
    } catch (error) {
      console.error('Concept registration error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: error.message || 'Registration failed' });
    }
  }
);

// Login using UserConcept.authenticate
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
    validate,
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log('Login attempt:', { email });
      
      const result = await userConcept.authenticate({ email, password });
      if (result.error) {
        console.log('Authentication failed:', result.error);
        return res.status(401).json({ error: result.error });
      }

      const userId = result.userId;
      console.log('Authentication successful, userId:', userId);
      
      const userPayload = await getUserPayload(userId);
      if (!userPayload) {
        console.error('Failed to get user payload after authentication, userId:', userId);
        return res.status(500).json({ error: 'Authentication succeeded but failed to retrieve user data' });
      }

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not set in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      res.json({
        user: userPayload,
        token,
      });
    } catch (error) {
      console.error('Concept login error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: error.message || 'Login failed' });
    }
  }
);

// Get current user using concept-based auth
router.get('/me', authConcept, async (req, res) => {
  try {
    const userPayload = await getUserPayload(req.userId);
    res.json({ user: userPayload });
  } catch (error) {
    console.error('Concept /me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update profile using UserConcept
router.patch(
  '/me',
  [
    authConcept,
    body('displayName').optional().trim(),
    body('homeArea').optional().trim(),
    validate,
  ],
  async (req, res) => {
    try {
      const { displayName, homeArea } = req.body;

      await userConcept.updateProfile({
        userId: req.userId,
        displayName,
        homeArea,
      });

      const userPayload = await getUserPayload(req.userId);

      res.json({ user: userPayload });
    } catch (error) {
      console.error('Concept profile update error:', error);
      res.status(500).json({ error: 'Profile update failed' });
    }
  }
);

module.exports = router;


