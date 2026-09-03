/**
 * Integration tests asserting the migrations produced the schema the
 * application expects. Requires a running PostGIS database.
 */
const test = require('node:test');
const assert = require('node:assert');
const pool = require('../src/config/db');

test.after(() => pool.end());

test('the PostGIS extension is installed', async () => {
  const { rows } = await pool.query(
    "SELECT extname FROM pg_extension WHERE extname = 'postgis'"
  );
  assert.strictEqual(rows.length, 1);
});

test('every application table exists', async () => {
  const expected = [
    'attendance', 'classrooms', 'courses',
    'enrollments', 'lecturers', 'sessions', 'students',
  ];
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [expected]
  );
  assert.deepStrictEqual(rows.map((r) => r.table_name).sort(), expected);
});

test('the geofence column is a SRID 4326 polygon', async () => {
  const { rows } = await pool.query(
    `SELECT type, srid FROM geometry_columns
     WHERE f_table_name = 'classrooms' AND f_geometry_column = 'geofence'`
  );
  assert.strictEqual(rows[0].type, 'POLYGON');
  assert.strictEqual(rows[0].srid, 4326);
});

test('the geofence column carries a GIST index', async () => {
  const { rows } = await pool.query(
    `SELECT indexdef FROM pg_indexes
     WHERE tablename = 'classrooms' AND indexname = 'idx_classrooms_geofence'`
  );
  assert.strictEqual(rows.length, 1);
  assert.match(rows[0].indexdef, /USING gist/i);
});

test('a student cannot be checked into the same session twice', async () => {
  const { rows } = await pool.query(
    `SELECT conname FROM pg_constraint
     WHERE conrelid = 'attendance'::regclass AND contype = 'u'`
  );
  assert.ok(rows.length >= 1, 'attendance should hold a unique constraint');
});
