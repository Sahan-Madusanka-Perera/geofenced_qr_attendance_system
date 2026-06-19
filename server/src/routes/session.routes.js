const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { startQRRotation, stopQRRotation } = require('../services/qr.service');

const router = express.Router();

/**
 * GET /api/sessions
 * List sessions for a lecturer or get active sessions.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, id } = req.user;
    let result;

    if (role === 'lecturer') {
      result = await pool.query(
        `SELECT s.*, c.code AS course_code, c.name AS course_name,
                cl.name AS classroom_name, cl.building
         FROM sessions s
         JOIN courses c ON c.id = s.course_id
         JOIN classrooms cl ON cl.id = s.classroom_id
         WHERE s.lecturer_id = $1
         ORDER BY s.session_date DESC, s.start_time DESC`,
        [id]
      );
    } else {
      // Students: return active sessions for their enrolled courses
      result = await pool.query(
        `SELECT s.*, c.code AS course_code, c.name AS course_name,
                cl.name AS classroom_name, cl.building
         FROM sessions s
         JOIN courses c ON c.id = s.course_id
         JOIN classrooms cl ON cl.id = s.classroom_id
         JOIN enrollments e ON e.course_id = s.course_id AND e.student_id = $1
         WHERE s.is_active = true
         ORDER BY s.start_time DESC`,
        [id]
      );
    }

    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * POST /api/sessions
 * Create and start a new session.
 */
router.post('/', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const { courseId, classroomId } = req.body;
    const lecturerId = req.user.id;

    if (!courseId || !classroomId) {
      return res.status(400).json({ error: 'courseId and classroomId are required' });
    }

    // Verify lecturer owns the course
    const courseCheck = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND lecturer_id = $2',
      [courseId, lecturerId]
    );
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this course' });
    }

    const result = await pool.query(
      `INSERT INTO sessions (course_id, classroom_id, lecturer_id, session_date, start_time, is_active)
       VALUES ($1, $2, $3, CURRENT_DATE, NOW(), true)
       RETURNING *`,
      [courseId, classroomId, lecturerId]
    );

    const session = result.rows[0];

    // Start QR rotation
    startQRRotation(session.id);

    res.status(201).json({ message: 'Session started', session });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * PATCH /api/sessions/:id/stop
 * Stop an active session.
 */
router.patch('/:id/stop', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const sessionId = req.params.id;

    await pool.query(
      `UPDATE sessions SET is_active = false, end_time = NOW(), active_token = NULL
       WHERE id = $1 AND lecturer_id = $2`,
      [sessionId, req.user.id]
    );

    // Stop QR rotation
    stopQRRotation(parseInt(sessionId));

    res.json({ message: 'Session stopped' });
  } catch (err) {
    console.error('Stop session error:', err);
    res.status(500).json({ error: 'Failed to stop session' });
  }
});

/**
 * GET /api/sessions/:id/attendees
 * Get list of students who checked in for a session.
 */
router.get('/:id/attendees', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.reg_number, s.full_name, s.department,
              a.check_in_time, a.geo_verified, a.device_verified
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       WHERE a.session_id = $1
       ORDER BY a.check_in_time ASC`,
      [req.params.id]
    );

    res.json({ attendees: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Attendees error:', err);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

module.exports = router;
