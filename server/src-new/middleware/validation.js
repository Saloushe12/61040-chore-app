const { validationResult } = require('express-validator');

// Same as server/src/middleware/validation.js but local to src-new
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format error message for frontend compatibility
    const errorMessages = errors.array().map(err => {
      // Include field name and value for debugging
      const fieldValue = req.body[err.param];
      return err.msg || `${err.param}: Invalid value (received: ${JSON.stringify(fieldValue)})`;
    });
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    return res.status(400).json({ 
      error: errorMessages.join(', '),
      errors: errors.array() // Also include detailed errors
    });
  }
  next();
};

module.exports = { validate };


