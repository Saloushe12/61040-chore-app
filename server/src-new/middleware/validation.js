const { validationResult } = require('express-validator');

// Same as server/src/middleware/validation.js but local to src-new
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { validate };


