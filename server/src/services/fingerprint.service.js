const pool = require('../config/db');

/**
 * Register a device fingerprint for a student.
 * Rules:
 *  1. A student can only have one fingerprint.
 *  2. A fingerprint can only be bound to one student.
 * @param {number} studentId
 * @param {string} fingerprint - Hashed device fingerprint from FingerprintJS
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function registerFingerprint(studentId, fingerprint) {
  // Check if this fingerprint is already registered to another student
  const existing = await pool.query(
    'SELECT id, reg_number FROM students WHERE device_fingerprint = $1 AND id != $2',
    [fingerprint, studentId]
  );

  if (existing.rows.length > 0) {
    return {
      success: false,
      error: `This device is already registered to another student (${existing.rows[0].reg_number}). One device per student only.`,
    };
  }

  // Bind fingerprint to student
  await pool.query(
    'UPDATE students SET device_fingerprint = $1, updated_at = NOW() WHERE id = $2',
    [fingerprint, studentId]
  );

  return { success: true };
}

/**
 * Verify that a submitted fingerprint matches the student's registered device.
 * @param {number} studentId
 * @param {string} fingerprint
 * @returns {Promise<{ verified: boolean, error?: string }>}
 */
async function verifyFingerprint(studentId, fingerprint) {
  const result = await pool.query(
    'SELECT device_fingerprint FROM students WHERE id = $1',
    [studentId]
  );

  if (result.rows.length === 0) {
    return { verified: false, error: 'Student not found' };
  }

  const stored = result.rows[0].device_fingerprint;

  // If no fingerprint registered yet, accept and bind it
  if (!stored) {
    await registerFingerprint(studentId, fingerprint);
    return { verified: true };
  }

  if (stored !== fingerprint) {
    return {
      verified: false,
      error: 'Device mismatch — you must use the same device you registered with',
    };
  }

  return { verified: true };
}

module.exports = { registerFingerprint, verifyFingerprint };
