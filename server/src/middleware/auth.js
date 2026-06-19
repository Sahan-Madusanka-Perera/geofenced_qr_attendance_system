const { verifyToken } = require('../utils/token');

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header or cookie.
 */
function authenticate(req, res, next) {
  let token = null;

  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Fallback to cookie
  if (!token && req.cookies) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-based authorization middleware.
 * @param  {...string} roles - Allowed roles ('student', 'lecturer')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
