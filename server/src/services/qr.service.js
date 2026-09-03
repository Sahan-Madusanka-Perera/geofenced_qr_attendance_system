const crypto = require('crypto');
const QRCode = require('qrcode');
const pool = require('../config/db');

const ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
const TOKEN_TTL = parseInt(process.env.QR_TOKEN_TTL_SECONDS || '15');
const REFRESH_INTERVAL = parseInt(process.env.QR_REFRESH_INTERVAL_MS || '10000');

// Map of sessionId -> { interval, clients: Set<res> }
const activeSessions = new Map();

/**
 * Encrypt session data into a token string.
 */
function encryptToken(sessionId) {
  const payload = JSON.stringify({
    sid: sessionId,
    ts: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex'),
  });

  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Combine IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a scanned QR token back to its payload.
 */
function decryptToken(token) {
  try {
    const parts = token.split(':');
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

/**
 * Generate a new QR token for a session, store it, and return QR as data URL.
 */
async function generateQRToken(sessionId) {
  const token = encryptToken(sessionId);
  const expiresAt = new Date(Date.now() + TOKEN_TTL * 1000);

  // Store in DB
  await pool.query(
    'UPDATE sessions SET active_token = $1, token_expires = $2 WHERE id = $3',
    [token, expiresAt, sessionId]
  );

  // The QR encodes a URL that the student's phone will open
  const checkInUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/checkin?token=${encodeURIComponent(token)}`;

  const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#00000000', // Transparent background
    },
    errorCorrectionLevel: 'M',
  });

  return { token, qrDataUrl, expiresAt, checkInUrl };
}

/**
 * Validate a scanned token against the database.
 * Returns { valid, sessionId, error }
 */
async function validateToken(token) {
  const payload = decryptToken(token);
  if (!payload) {
    return { valid: false, error: 'Invalid token format' };
  }

  const result = await pool.query(
    'SELECT id, course_id, classroom_id, is_active, token_expires FROM sessions WHERE id = $1',
    [payload.sid]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: 'Session not found' };
  }

  const session = result.rows[0];

  if (!session.is_active) {
    return { valid: false, error: 'Session is not active' };
  }

  if (new Date() > new Date(session.token_expires)) {
    return { valid: false, error: 'Token has expired — the QR code has already refreshed' };
  }

  return {
    valid: true,
    sessionId: session.id,
    courseId: session.course_id,
    classroomId: session.classroom_id,
  };
}

/**
 * Start the QR rotation for a session. Pushes new QR to all SSE clients.
 */
function startQRRotation(sessionId) {
  if (activeSessions.has(sessionId)) {
    return; // Already running
  }

  const sessionData = {
    clients: new Set(),
    interval: null,
    // The payload currently on screen. A projector opened mid-cycle gets
    // this immediately instead of staring at nothing until the next tick.
    lastPayload: null,
  };

  const pushUpdate = async () => {
    try {
      const { qrDataUrl, expiresAt } = await generateQRToken(sessionId);
      const data = JSON.stringify({
        qr: qrDataUrl,
        expiresAt: expiresAt.toISOString(),
        refreshInterval: REFRESH_INTERVAL,
        // The token outlives the rotation (15s vs 10s) so a scan begun just
        // before a turn still clears. The projector counts against this.
        tokenTtl: TOKEN_TTL,
      });
      sessionData.lastPayload = data;

      for (const client of sessionData.clients) {
        client.write(`data: ${data}\n\n`);
      }
    } catch (err) {
      console.error(`QR rotation error for session ${sessionId}:`, err);
    }
  };

  // Push immediately, then on interval
  pushUpdate();
  sessionData.interval = setInterval(pushUpdate, REFRESH_INTERVAL);
  activeSessions.set(sessionId, sessionData);
}

/**
 * Stop QR rotation for a session.
 */
function stopQRRotation(sessionId) {
  const sessionData = activeSessions.get(sessionId);
  if (sessionData) {
    clearInterval(sessionData.interval);
    // Notify clients that session ended
    for (const client of sessionData.clients) {
      client.write(`data: ${JSON.stringify({ ended: true })}\n\n`);
      client.end();
    }
    activeSessions.delete(sessionId);
  }
}

/**
 * Add an SSE client to receive QR updates for a session.
 */
function addSSEClient(sessionId, res) {
  const sessionData = activeSessions.get(sessionId);
  if (sessionData) {
    sessionData.clients.add(res);
    if (sessionData.lastPayload) {
      res.write(`data: ${sessionData.lastPayload}\n\n`);
    }
    return true;
  }
  return false;
}

/**
 * Remove an SSE client.
 */
function removeSSEClient(sessionId, res) {
  const sessionData = activeSessions.get(sessionId);
  if (sessionData) {
    sessionData.clients.delete(res);
  }
}

module.exports = {
  generateQRToken,
  validateToken,
  decryptToken,
  startQRRotation,
  stopQRRotation,
  addSSEClient,
  removeSSEClient,
  activeSessions,
};
