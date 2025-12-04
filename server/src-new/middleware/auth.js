const jwt = require('jsonwebtoken');
const UserConcept = require('../concepts/UserConcept');

const userConcept = new UserConcept();

// Concept-based auth middleware: verifies JWT and loads user via UserConcept
const auth = async (req, res, next) => {
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
  } catch (error) {
    console.error('Concept auth error:', error);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Optional auth - doesn't fail if no token, but attaches user if present
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [user] = await userConcept._getUserDetails({ userId: decoded.userId });
      if (user) {
        req.user = user;
        req.userId = user.userId;
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
  if (!req.user || req.user.role !== 'venue_operator') {
    return res.status(403).json({ error: 'Venue operator access required' });
  }
  next();
};

module.exports = { auth, optionalAuth, requireVenueOperator };


