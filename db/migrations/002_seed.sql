-- ============================================================
-- QR Attendance System — Seed Data for Development
-- ============================================================

-- Password for all seed accounts: "password123" (bcrypt hash)
-- $2a$10$rQEY0tVS3bGsCdH.H3x7Vu8Zx8l7oQ8yG5V4bZ9wE7kA1dF3iC6uW

-- 1. Sample Lecturer
INSERT INTO lecturers (employee_id, full_name, email, password_hash, department) VALUES
('LEC001', 'Dr. Sarah Williams', 'sarah.williams@uni.edu', '$2a$10$kp4MPCFu9uayuFKQPxrS6O4Tl42M4QRlzimJqMt9BsYbEtW8osmy2', 'Computer Science'),
('LEC002', 'Prof. James Kumar', 'james.kumar@uni.edu', '$2a$10$kp4MPCFu9uayuFKQPxrS6O4Tl42M4QRlzimJqMt9BsYbEtW8osmy2', 'Electrical Engineering')
ON CONFLICT (employee_id) DO NOTHING;

-- 2. Sample Classrooms with geofence polygons
-- This creates a ~50m polygon around a sample location (University of Colombo area)
INSERT INTO classrooms (name, building, geofence, center_lat, center_lng, radius_meters) VALUES
(
    'Lecture Hall A',
    'Main Building',
    ST_SetSRID(ST_GeomFromText('POLYGON((
        79.8585 6.9025,
        79.8590 6.9025,
        79.8590 6.9030,
        79.8585 6.9030,
        79.8585 6.9025
    ))'), 4326),
    6.90275,
    79.85875,
    50
),
(
    'Lab Room 201',
    'Engineering Block',
    ST_SetSRID(ST_GeomFromText('POLYGON((
        79.8595 6.9035,
        79.8600 6.9035,
        79.8600 6.9040,
        79.8595 6.9040,
        79.8595 6.9035
    ))'), 4326),
    6.90375,
    79.85975,
    40
)
ON CONFLICT DO NOTHING;

-- 3. Sample Courses
INSERT INTO courses (code, name, department, lecturer_id) VALUES
('CS3020', 'Software Engineering', 'Computer Science', 1),
('CS3045', 'Database Systems', 'Computer Science', 1),
('EE2010', 'Digital Electronics', 'Electrical Engineering', 2)
ON CONFLICT (code) DO NOTHING;

-- 4. Sample Students
INSERT INTO students (reg_number, full_name, email, password_hash, department) VALUES
('2021CS001', 'Amal Perera', 'amal.p@stu.uni.edu', '$2a$10$kp4MPCFu9uayuFKQPxrS6O4Tl42M4QRlzimJqMt9BsYbEtW8osmy2', 'Computer Science'),
('2021CS002', 'Nisha Fernando', 'nisha.f@stu.uni.edu', '$2a$10$kp4MPCFu9uayuFKQPxrS6O4Tl42M4QRlzimJqMt9BsYbEtW8osmy2', 'Computer Science'),
('2021CS003', 'Kavin Silva', 'kavin.s@stu.uni.edu', '$2a$10$kp4MPCFu9uayuFKQPxrS6O4Tl42M4QRlzimJqMt9BsYbEtW8osmy2', 'Computer Science'),
('2021EE001', 'Dilshan Rajapaksha', 'dilshan.r@stu.uni.edu', '$2a$10$kp4MPCFu9uayuFKQPxrS6O4Tl42M4QRlzimJqMt9BsYbEtW8osmy2', 'Electrical Engineering'),
('2021EE002', 'Sachini De Silva', 'sachini.d@stu.uni.edu', '$2a$10$kp4MPCFu9uayuFKQPxrS6O4Tl42M4QRlzimJqMt9BsYbEtW8osmy2', 'Electrical Engineering')
ON CONFLICT (reg_number) DO NOTHING;

-- 5. Enrollments
INSERT INTO enrollments (student_id, course_id) VALUES
(1, 1), (1, 2),   -- Amal -> CS3020, CS3045
(2, 1), (2, 2),   -- Nisha -> CS3020, CS3045
(3, 1),            -- Kavin -> CS3020
(4, 3),            -- Dilshan -> EE2010
(5, 3)             -- Sachini -> EE2010
ON CONFLICT (student_id, course_id) DO NOTHING;

-- 6. Sample Past Sessions (for analytics testing)
INSERT INTO sessions (course_id, classroom_id, lecturer_id, session_date, start_time, end_time, is_active) VALUES
(1, 1, 1, '2026-06-02', '2026-06-02 09:00:00+05:30', '2026-06-02 10:00:00+05:30', false),
(1, 1, 1, '2026-06-04', '2026-06-04 09:00:00+05:30', '2026-06-04 10:00:00+05:30', false),
(1, 1, 1, '2026-06-06', '2026-06-06 09:00:00+05:30', '2026-06-06 10:00:00+05:30', false),
(1, 1, 1, '2026-06-09', '2026-06-09 09:00:00+05:30', '2026-06-09 10:00:00+05:30', false),
(1, 1, 1, '2026-06-11', '2026-06-11 09:00:00+05:30', '2026-06-11 10:00:00+05:30', false),
(2, 1, 1, '2026-06-03', '2026-06-03 14:00:00+05:30', '2026-06-03 15:00:00+05:30', false),
(2, 1, 1, '2026-06-10', '2026-06-10 14:00:00+05:30', '2026-06-10 15:00:00+05:30', false),
(3, 2, 2, '2026-06-02', '2026-06-02 11:00:00+05:30', '2026-06-02 12:00:00+05:30', false),
(3, 2, 2, '2026-06-05', '2026-06-05 11:00:00+05:30', '2026-06-05 12:00:00+05:30', false),
(3, 2, 2, '2026-06-09', '2026-06-09 11:00:00+05:30', '2026-06-09 12:00:00+05:30', false);

-- 7. Sample Attendance Records
INSERT INTO attendance (session_id, student_id, geo_verified, device_verified) VALUES
-- Amal: 4/5 sessions for CS3020 (80%)
(1, 1, true, true), (2, 1, true, true), (3, 1, true, true), (4, 1, true, true),
-- Nisha: 3/5 sessions for CS3020 (60%)
(1, 2, true, true), (3, 2, true, true), (5, 2, true, true),
-- Kavin: 5/5 sessions for CS3020 (100%)
(1, 3, true, true), (2, 3, true, true), (3, 3, true, true), (4, 3, true, true), (5, 3, true, true),
-- Amal: 2/2 sessions for CS3045 (100%)
(6, 1, true, true), (7, 1, true, true),
-- Nisha: 1/2 sessions for CS3045 (50%)
(6, 2, true, true),
-- Dilshan: 2/3 sessions for EE2010 (67%)
(8, 4, true, true), (9, 4, true, true),
-- Sachini: 3/3 sessions for EE2010 (100%)
(8, 5, true, true), (9, 5, true, true), (10, 5, true, true);
