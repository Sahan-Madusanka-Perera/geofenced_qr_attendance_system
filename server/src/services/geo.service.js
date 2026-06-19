const pool = require('../config/db');

/**
 * Check if a GPS point falls inside a classroom's geofence polygon.
 * @param {number} classroomId
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<boolean>}
 */
async function isInsideGeofence(classroomId, latitude, longitude) {
  const result = await pool.query(
    `SELECT ST_Contains(
       c.geofence,
       ST_SetSRID(ST_Point($1, $2), 4326)
     ) AS inside
     FROM classrooms c
     WHERE c.id = $3`,
    [longitude, latitude, classroomId]  // Note: ST_Point takes (lng, lat)
  );

  if (result.rows.length === 0) {
    throw new Error('Classroom not found');
  }

  return result.rows[0].inside;
}

/**
 * Get all classrooms with their geofence center points.
 */
async function getAllClassrooms() {
  const result = await pool.query(
    `SELECT id, name, building, center_lat, center_lng, radius_meters,
       ST_AsGeoJSON(geofence) as geofence_geojson
     FROM classrooms
     ORDER BY name`
  );
  return result.rows.map(row => ({
    ...row,
    geofence: JSON.parse(row.geofence_geojson),
  }));
}

/**
 * Create a new classroom with a geofence polygon from GeoJSON coordinates.
 * @param {string} name
 * @param {string} building
 * @param {Array} coordinates - Array of [lng, lat] arrays forming a closed polygon
 * @returns {Promise<Object>}
 */
async function createClassroom(name, building, coordinates) {
  // Calculate center point
  const lats = coordinates.map(c => c[1]);
  const lngs = coordinates.map(c => c[0]);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  const coordStr = coordinates.map(c => `${c[0]} ${c[1]}`).join(', ');
  
  const result = await pool.query(
    `INSERT INTO classrooms (name, building, geofence, center_lat, center_lng)
     VALUES ($1, $2, ST_SetSRID(ST_GeomFromText('POLYGON((' || $3 || '))'), 4326), $4, $5)
     RETURNING id, name, building, center_lat, center_lng`,
    [name, building, coordStr, centerLat, centerLng]
  );

  return result.rows[0];
}

/**
 * Update a classroom's geofence.
 */
async function updateClassroomGeofence(classroomId, coordinates) {
  const lats = coordinates.map(c => c[1]);
  const lngs = coordinates.map(c => c[0]);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  const coordStr = coordinates.map(c => `${c[0]} ${c[1]}`).join(', ');

  await pool.query(
    `UPDATE classrooms 
     SET geofence = ST_SetSRID(ST_GeomFromText('POLYGON((' || $1 || '))'), 4326),
         center_lat = $2, center_lng = $3
     WHERE id = $4`,
    [coordStr, centerLat, centerLng, classroomId]
  );
}

module.exports = {
  isInsideGeofence,
  getAllClassrooms,
  createClassroom,
  updateClassroomGeofence,
};
