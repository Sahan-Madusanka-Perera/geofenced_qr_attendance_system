-- ============================================================
-- QR Attendance System — Core Schema
-- ============================================================

-- Ensure PostGIS is available
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. Students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id              SERIAL PRIMARY KEY,
    reg_number      VARCHAR(50) UNIQUE NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    device_fingerprint VARCHAR(64),
    department      VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_reg ON students(reg_number);
CREATE INDEX IF NOT EXISTS idx_students_fingerprint ON students(device_fingerprint);

-- ============================================================
-- 2. Lecturers
-- ============================================================
CREATE TABLE IF NOT EXISTS lecturers (
    id              SERIAL PRIMARY KEY,
    employee_id     VARCHAR(50) UNIQUE NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    department      VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Classrooms (with PostGIS geofence polygons)
-- ============================================================
CREATE TABLE IF NOT EXISTS classrooms (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    building        VARCHAR(100),
    geofence        GEOMETRY(Polygon, 4326) NOT NULL,
    center_lat      DOUBLE PRECISION,
    center_lng      DOUBLE PRECISION,
    radius_meters   FLOAT DEFAULT 50,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_geofence ON classrooms USING GIST(geofence);

-- A room is uniquely identified by its name within a building. Also lets the
-- seed data be re-applied without creating duplicate classrooms.
CREATE UNIQUE INDEX IF NOT EXISTS idx_classrooms_name_building
    ON classrooms(name, building);

-- ============================================================
-- 4. Courses
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    department      VARCHAR(100),
    lecturer_id     INTEGER REFERENCES lecturers(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. Lecture Sessions (each class meeting)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id              SERIAL PRIMARY KEY,
    course_id       INTEGER REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    classroom_id    INTEGER REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
    lecturer_id     INTEGER REFERENCES lecturers(id) ON DELETE CASCADE NOT NULL,
    session_date    DATE NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    active_token    VARCHAR(512),
    token_expires   TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sessions_course ON sessions(course_id);

-- A course cannot meet twice in the same room at the same instant. Also keeps
-- the seed data idempotent when migrations are re-applied.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_unique_slot
    ON sessions(course_id, classroom_id, start_time);

-- ============================================================
-- 6. Course Enrollments
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE,
    course_id       INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- ============================================================
-- 7. Attendance Records
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    check_in_time   TIMESTAMPTZ DEFAULT NOW(),
    gps_latitude    DOUBLE PRECISION,
    gps_longitude   DOUBLE PRECISION,
    geo_verified    BOOLEAN DEFAULT false,
    device_verified BOOLEAN DEFAULT false,
    token_used      VARCHAR(512),
    ip_address      INET,
    UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
