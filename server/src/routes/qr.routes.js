const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyToken } = require('../utils/token');
const { addSSEClient, removeSSEClient, generateQRToken, activeSessions } = require('../services/qr.service');

const router = express.Router();

/**
 * SSE-specific auth middleware.
 * EventSource API cannot set custom headers, so we accept token via query param.
 */
function sseAuth(req, res, next) {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * GET /api/qr/stream/:sessionId
 * SSE endpoint for receiving live QR code updates.
 */
router.get('/stream/:sessionId', sseAuth, authorize('lecturer'), (req, res) => {
  const sessionId = parseInt(req.params.sessionId);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Send initial keepalive
  res.write(`data: ${JSON.stringify({ connected: true, sessionId })}\n\n`);

  // Register client
  const added = addSSEClient(sessionId, res);
  if (!added) {
    res.write(`data: ${JSON.stringify({ error: 'Session QR rotation not active' })}\n\n`);
    res.end();
    return;
  }

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(sessionId, res);
  });
});

/**
 * GET /api/qr/active-sessions
 * List all currently active QR rotation sessions.
 */
router.get('/active-sessions', authenticate, authorize('lecturer'), (req, res) => {
  const sessions = Array.from(activeSessions.keys());
  res.json({ activeSessions: sessions });
});

module.exports = router;
