const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken } = require('../utils/token');
const { registerFingerprint } = require('../services/fingerprint.service');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * POST /api/auth/register
 * Student registration with device fingerprint binding.
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { regNumber, fullName, email, password, department, fingerprint } = req.body;

    if (!regNumber || !fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if reg_number already exists
    const existingReg = await pool.query(
      'SELECT id FROM students WHERE reg_number = $1', [regNumber]
    );
    if (existingReg.rows.length > 0) {
      return res.status(409).json({ error: 'Registration number already registered' });
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      'SELECT id FROM students WHERE email = $1', [email]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if fingerprint is already bound to another student
    if (fingerprint) {
      const existingFp = await pool.query(
        'SELECT id, reg_number FROM students WHERE device_fingerprint = $1',
        [fingerprint]
      );
      if (existingFp.rows.length > 0) {
        return res.status(409).json({
          error: `This device is already registered to student ${existingFp.rows[0].reg_number}. One device per student only.`
        });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert student
    const result = await pool.query(
      `INSERT INTO students (reg_number, full_name, email, password_hash, department, device_fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, reg_number, full_name, email, department`,
      [regNumber, fullName, email, passwordHash, department || null, fingerprint || null]
    );

    const student = result.rows[0];

    // Generate JWT
    const token = generateToken({
      id: student.id,
      regNumber: student.reg_number,
      role: 'student',
    });

    res.status(201).json({
      message: 'Registration successful',
      user: student,
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Student or lecturer login.
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { identifier, password, role, fingerprint } = req.body;
    // identifier = reg_number (student) or employee_id (lecturer)

    if (!identifier || !password || !role) {
      return res.status(400).json({ error: 'Identifier, password, and role are required' });
    }

    let user;
    if (role === 'student') {
      const result = await pool.query(
        'SELECT id, reg_number, full_name, email, password_hash, device_fingerprint, department FROM students WHERE reg_number = $1',
        [identifier]
      );
      user = result.rows[0];
    } else if (role === 'lecturer') {
      const result = await pool.query(
        'SELECT id, employee_id, full_name, email, password_hash, department FROM lecturers WHERE employee_id = $1',
        [identifier]
      );
      user = result.rows[0];
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // For students, verify device fingerprint
    if (role === 'student' && fingerprint) {
      if (user.device_fingerprint && user.device_fingerprint !== fingerprint) {
        return res.status(403).json({
          error: 'Device mismatch — you must log in from the device you registered with',
        });
      }
      // If no fingerprint was registered yet, bind it now
      if (!user.device_fingerprint) {
        await registerFingerprint(user.id, fingerprint);
      }
    }

    const token = generateToken({
      id: user.id,
      regNumber: user.reg_number || user.employee_id,
      role,
    });

    const { password_hash, device_fingerprint, ...safeUser } = user;

    res.json({
      message: 'Login successful',
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

const { authenticate } = require('../middleware/auth');

/**
 * GET /api/auth/me
 * Get current authenticated user profile.
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { id, role } = req.user;
    let user;

    if (role === 'student') {
      const result = await pool.query(
        'SELECT id, reg_number, full_name, email, department FROM students WHERE id = $1',
        [id]
      );
      user = result.rows[0];
    } else {
      const result = await pool.query(
        'SELECT id, employee_id, full_name, email, department FROM lecturers WHERE id = $1',
        [id]
      );
      user = result.rows[0];
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: { ...user, role } });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
