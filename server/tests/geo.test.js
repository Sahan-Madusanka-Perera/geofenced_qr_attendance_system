/**
 * Integration tests for PostGIS geofence containment.
 * Requires a running PostGIS database.
 */
const test = require('node:test');
const assert = require('node:assert');
const pool = require('../src/config/db');
const geo = require('../src/services/geo.service');

// A ~55m square near the University of Sri Jayewardenepura, as [lng, lat].
const SQUARE = [
  [79.9020, 6.8520],
  [79.9025, 6.8520],
  [79.9025, 6.8525],
  [79.9020, 6.8525],
  [79.9020, 6.8520],
];

let classroomId;

test.before(async () => {
  const room = await geo.createClassroom('CI Test Hall', 'CI Building', SQUARE);
  classroomId = room.id;
});

test.after(async () => {
  if (classroomId) {
    await pool.query('DELETE FROM classrooms WHERE id = $1', [classroomId]);
  }
  await pool.end();
});

test('creating a classroom derives the polygon centroid', async () => {
  const { rows } = await pool.query(
    'SELECT center_lat, center_lng FROM classrooms WHERE id = $1',
    [classroomId]
  );
  assert.ok(Math.abs(rows[0].center_lat - 6.8521) < 0.001);
  assert.ok(Math.abs(rows[0].center_lng - 79.9021) < 0.001);
});

test('a point inside the polygon is accepted', async () => {
  assert.strictEqual(
    await geo.isInsideGeofence(classroomId, 6.85225, 79.90225),
    true
  );
});

test('a point outside the polygon is rejected', async () => {
  // ~1km north-east of the fence.
  assert.strictEqual(
    await geo.isInsideGeofence(classroomId, 6.8620, 79.9120),
    false
  );
});

test('a point just beyond the boundary is rejected', async () => {
  assert.strictEqual(
    await geo.isInsideGeofence(classroomId, 6.85260, 79.90225),
    false
  );
});

test('an unknown classroom raises rather than silently passing', async () => {
  await assert.rejects(
    () => geo.isInsideGeofence(999999, 6.8522, 79.9022),
    /Classroom not found/
  );
});

test('listing classrooms returns parsed GeoJSON geometry', async () => {
  const rooms = await geo.getAllClassrooms();
  const room = rooms.find((r) => r.id === classroomId);

  assert.strictEqual(room.geofence.type, 'Polygon');
  assert.strictEqual(room.geofence.coordinates[0].length, SQUARE.length);
});
