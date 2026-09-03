const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { checkinLimiter } = require('../middleware/rateLimit');
const { validateToken } = require('../services/qr.service');
const { isInsideGeofence } = require('../services/geo.service');
const { verifyFingerprint } = require('../services/fingerprint.service');

const router = express.Router();

/**
 * Course and room labels for a session. The client prints these onto the
 * student's boarding pass, so they come from the record rather than from
 * anything the phone sent us.
 */
async function getSessionDetails(sessionId) {
  const { rows } = await pool.query(
    `SELECT c.code AS course_code, c.name AS course_name,
            r.name AS classroom_name, r.building
       FROM sessions s
       JOIN courses c ON c.id = s.course_id
       JOIN classrooms r ON r.id = s.classroom_id
      WHERE s.id = $1`,
    [sessionId]
  );
  return rows[0] || {};
}

/**
 * POST /api/attendance/checkin
 * The main check-in endpoint. Validates: token → fingerprint → geofence → duplicate.
 */
router.post('/checkin', authenticate, authorize('student'), checkinLimiter, async (req, res) => {
  try {
    const { token, latitude, longitude, fingerprint } = req.body;
    const studentId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'QR token is required' });
    }

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'GPS location is required. Please enable location access.' });
    }

    // ── Step 1: Validate QR Token ────────────────────────────────────
    const tokenResult = await validateToken(token);
    if (!tokenResult.valid) {
      return res.status(400).json({
        error: tokenResult.error,
        step: 'token_validation',
      });
    }

    const { sessionId, courseId, classroomId } = tokenResult;

    // ── Step 2: Check enrollment ─────────────────────────────────────
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'You are not enrolled in this course',
        step: 'enrollment_check',
      });
    }

    // ── Step 3: Verify Device Fingerprint ────────────────────────────
    let deviceVerified = false;
    if (fingerprint) {
      const fpResult = await verifyFingerprint(studentId, fingerprint);
      if (!fpResult.verified) {
        return res.status(403).json({
          error: fpResult.error,
          step: 'device_verification',
        });
      }
      deviceVerified = true;
    }

    // ── Step 4: Geofence Validation ──────────────────────────────────
    let geoVerified = false;
    try {
      geoVerified = await isInsideGeofence(classroomId, latitude, longitude);
    } catch (geoErr) {
      console.error('Geofence check error:', geoErr);
    }

    if (!geoVerified) {
      return res.status(403).json({
        error: 'You appear to be outside the classroom. Check-in rejected.',
        step: 'geofence_check',
      });
    }

    // ── Step 5: Check for duplicate ──────────────────────────────────
    const duplicateCheck = await pool.query(
      'SELECT id, check_in_time FROM attendance WHERE session_id = $1 AND student_id = $2',
      [sessionId, studentId]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(200).json({
        message: 'You have already checked in for this session',
        alreadyCheckedIn: true,
        boardingPass: {
          ...(await getSessionDetails(sessionId)),
          checkedInAt: duplicateCheck.rows[0].check_in_time,
          geoVerified,
          deviceVerified,
        },
      });
    }

    // ── Step 6: Record Attendance ────────────────────────────────────
    const ipAddress = req.ip || req.connection.remoteAddress;

    await pool.query(
      `INSERT INTO attendance (session_id, student_id, gps_latitude, gps_longitude, geo_verified, device_verified, token_used, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [sessionId, studentId, latitude, longitude, geoVerified, deviceVerified, token, ipAddress]
    );

    res.status(201).json({
      message: 'Attendance recorded',
      alreadyCheckedIn: false,
      boardingPass: {
        ...(await getSessionDetails(sessionId)),
        checkedInAt: new Date().toISOString(),
        geoVerified,
        deviceVerified,
      },
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Check-in failed. Please try again.' });
  }
});

module.exports = router;
