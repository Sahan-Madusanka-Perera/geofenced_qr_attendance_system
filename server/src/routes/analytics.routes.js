const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getStudentStats, getCourseStats, getStudentSessionHistory } = require('../services/analytics.service');
const { generateCSV, generateExcel } = require('../utils/export');
const pool = require('../config/db');

const router = express.Router();

/**
 * GET /api/analytics/student
 * Get attendance statistics for the authenticated student.
 */
router.get('/student', authenticate, authorize('student'), async (req, res) => {
  try {
    const stats = await getStudentStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error('Student stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/analytics/student/history/:courseId
 * Get session-by-session attendance history for a student in a course.
 */
router.get('/student/history/:courseId', authenticate, authorize('student'), async (req, res) => {
  try {
    const history = await getStudentSessionHistory(req.user.id, req.params.courseId);
    res.json({ history });
  } catch (err) {
    console.error('Session history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/analytics/course/:courseId
 * Get attendance breakdown for a course (lecturer view).
 */
router.get('/course/:courseId', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const stats = await getCourseStats(req.params.courseId);
    res.json({ students: stats });
  } catch (err) {
    console.error('Course stats error:', err);
    res.status(500).json({ error: 'Failed to fetch course statistics' });
  }
});

/**
 * GET /api/analytics/export/csv/:courseId
 * Download attendance report as CSV.
 */
router.get('/export/csv/:courseId', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const courseResult = await pool.query(
      'SELECT code, name FROM courses WHERE id = $1', [courseId]
    );
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const stats = await getCourseStats(courseId);
    const csv = generateCSV(stats, courseResult.rows[0].name);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${courseResult.rows[0].code}_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

/**
 * GET /api/analytics/export/excel/:courseId
 * Download attendance report as Excel.
 */
router.get('/export/excel/:courseId', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const courseResult = await pool.query(
      'SELECT code, name FROM courses WHERE id = $1', [courseId]
    );
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const stats = await getCourseStats(courseId);
    const buffer = await generateExcel(stats, courseResult.rows[0].name, courseResult.rows[0].code);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${courseResult.rows[0].code}_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

/**
 * GET /api/analytics/courses
 * Get all courses for the authenticated lecturer.
 */
router.get('/courses', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, code, name, department FROM courses WHERE lecturer_id = $1 ORDER BY code',
      [req.user.id]
    );
    res.json({ courses: result.rows });
  } catch (err) {
    console.error('Courses fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

module.exports = router;
