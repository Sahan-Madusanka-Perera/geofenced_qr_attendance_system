const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getAllClassrooms, createClassroom, updateClassroomGeofence } = require('../services/geo.service');

const router = express.Router();

/**
 * GET /api/geofences
 * List all classrooms with their geofence polygons.
 */
router.get('/', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const classrooms = await getAllClassrooms();
    res.json({ classrooms });
  } catch (err) {
    console.error('Geofences fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

/**
 * POST /api/geofences
 * Create a new classroom with a geofence polygon.
 * Body: { name, building, coordinates: [[lng, lat], ...] }
 */
router.post('/', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const { name, building, coordinates } = req.body;

    if (!name || !coordinates || coordinates.length < 4) {
      return res.status(400).json({
        error: 'Name and at least 4 coordinates are required (polygon must be closed)',
      });
    }

    const classroom = await createClassroom(name, building, coordinates);
    res.status(201).json({ message: 'Classroom created', classroom });
  } catch (err) {
    console.error('Create geofence error:', err);
    res.status(500).json({ error: 'Failed to create classroom' });
  }
});

/**
 * PUT /api/geofences/:id
 * Update a classroom's geofence polygon.
 */
router.put('/:id', authenticate, authorize('lecturer'), async (req, res) => {
  try {
    const { coordinates } = req.body;

    if (!coordinates || coordinates.length < 4) {
      return res.status(400).json({
        error: 'At least 4 coordinates are required (polygon must be closed)',
      });
    }

    await updateClassroomGeofence(req.params.id, coordinates);
    res.json({ message: 'Geofence updated' });
  } catch (err) {
    console.error('Update geofence error:', err);
    res.status(500).json({ error: 'Failed to update geofence' });
  }
});

module.exports = router;
