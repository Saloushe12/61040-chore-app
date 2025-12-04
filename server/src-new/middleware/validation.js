const { validationResult } = require('express-validator');

// Same as server/src/middleware/validation.js but local to src-new
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format error message for frontend compatibility
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({ 
      error: errorMessages.join(', '),
      errors: errors.array() // Also include detailed errors
    });
  }
  next();
};

module.exports = { validate };


