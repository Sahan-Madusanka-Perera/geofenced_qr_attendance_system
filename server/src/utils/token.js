const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

/**
 * Generate a JWT for a user (student or lecturer).
 */
function generateToken(payload, expiresIn) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '24h',
  });
}

/**
 * Verify and decode a JWT.
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
