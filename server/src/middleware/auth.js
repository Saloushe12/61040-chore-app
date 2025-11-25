const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Update last active timestamp
    user.lastActiveAt = new Date();
    await user.save();

    req.user = user;
    req.userId = user._id;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Optional auth - doesn't fail if no token, but attaches user if present
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user) {
        req.user = user;
        req.userId = user._id;
        req.token = token;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Check if user is a venue operator
const requireVenueOperator = (req, res, next) => {
  if (req.user.role !== 'venue_operator') {
    return res.status(403).json({ error: 'Venue operator access required' });
  }
  next();
};

module.exports = { auth, optionalAuth, requireVenueOperator };
