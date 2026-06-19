const pool = require('../config/db');

/**
 * Get attendance statistics for a single student across all enrolled courses.
 * @param {number} studentId
 */
async function getStudentStats(studentId) {
  const result = await pool.query(
    `SELECT
       c.id AS course_id,
       c.code AS course_code,
       c.name AS course_name,
       c.department,
       COUNT(DISTINCT s.id) AS total_classes,
       COUNT(DISTINCT a.session_id) AS classes_attended,
       CASE
         WHEN COUNT(DISTINCT s.id) = 0 THEN 0
         ELSE ROUND(COUNT(DISTINCT a.session_id)::numeric / COUNT(DISTINCT s.id) * 100, 1)
       END AS attendance_pct
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN sessions s ON s.course_id = c.id AND s.is_active = false
     LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = e.student_id
     WHERE e.student_id = $1
     GROUP BY c.id, c.code, c.name, c.department
     ORDER BY c.code`,
    [studentId]
  );

  // Calculate overall stats
  const courses = result.rows;
  const totalClasses = courses.reduce((sum, c) => sum + parseInt(c.total_classes), 0);
  const totalAttended = courses.reduce((sum, c) => sum + parseInt(c.classes_attended), 0);
  const overallPct = totalClasses > 0
    ? Math.round((totalAttended / totalClasses) * 1000) / 10
    : 0;

  return {
    courses: courses.map(c => ({
      ...c,
      total_classes: parseInt(c.total_classes),
      classes_attended: parseInt(c.classes_attended),
      attendance_pct: parseFloat(c.attendance_pct),
      // Calculate how many more classes can be missed or must be attended
      ...calculateSafetyMargin(parseInt(c.classes_attended), parseInt(c.total_classes)),
    })),
    overall: {
      total_classes: totalClasses,
      classes_attended: totalAttended,
      attendance_pct: overallPct,
      ...calculateSafetyMargin(totalAttended, totalClasses),
    },
  };
}

/**
 * Calculate the safety margin for 80% threshold.
 */
function calculateSafetyMargin(attended, total) {
  if (total === 0) {
    return { can_miss: 0, must_attend: 0, status: 'no_data' };
  }

  const currentPct = (attended / total) * 100;

  if (currentPct >= 80) {
    // How many more can they miss while staying ≥80%?
    // (attended) / (total + X) >= 0.8  =>  X <= (attended / 0.8) - total
    const canMiss = Math.floor(attended / 0.8 - total);
    return {
      can_miss: Math.max(0, canMiss),
      must_attend: 0,
      status: 'safe',
    };
  } else {
    // How many consecutive classes must they attend to reach 80%?
    // (attended + Y) / (total + Y) >= 0.8  =>  Y >= (0.8 * total - attended) / 0.2
    const mustAttend = Math.ceil((0.8 * total - attended) / 0.2);
    return {
      can_miss: 0,
      must_attend: Math.max(0, mustAttend),
      status: 'at_risk',
    };
  }
}

/**
 * Get attendance breakdown for a course (lecturer view).
 * @param {number} courseId
 */
async function getCourseStats(courseId) {
  const result = await pool.query(
    `SELECT
       s.id AS student_id,
       s.reg_number,
       s.full_name,
       s.department,
       COUNT(a.id) AS classes_attended,
       (SELECT COUNT(*) FROM sessions WHERE course_id = $1 AND is_active = false) AS total_classes,
       CASE
         WHEN (SELECT COUNT(*) FROM sessions WHERE course_id = $1 AND is_active = false) = 0 THEN 0
         ELSE ROUND(
           COUNT(a.id)::numeric /
           (SELECT COUNT(*) FROM sessions WHERE course_id = $1 AND is_active = false) * 100,
           1
         )
       END AS attendance_pct
     FROM students s
     JOIN enrollments e ON e.student_id = s.id AND e.course_id = $1
     LEFT JOIN attendance a ON a.student_id = s.id
       AND a.session_id IN (SELECT id FROM sessions WHERE course_id = $1 AND is_active = false)
     GROUP BY s.id, s.reg_number, s.full_name, s.department
     ORDER BY s.reg_number`,
    [courseId]
  );

  return result.rows.map(r => ({
    ...r,
    classes_attended: parseInt(r.classes_attended),
    total_classes: parseInt(r.total_classes),
    attendance_pct: parseFloat(r.attendance_pct),
  }));
}

/**
 * Get session history for a student in a specific course.
 */
async function getStudentSessionHistory(studentId, courseId) {
  const result = await pool.query(
    `SELECT
       s.id AS session_id,
       s.session_date,
       s.start_time,
       CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS attended,
       a.check_in_time,
       a.geo_verified,
       a.device_verified
     FROM sessions s
     LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = $1
     WHERE s.course_id = $2 AND s.is_active = false
     ORDER BY s.session_date DESC`,
    [studentId, courseId]
  );

  return result.rows;
}

module.exports = {
  getStudentStats,
  getCourseStats,
  getStudentSessionHistory,
  calculateSafetyMargin,
};
