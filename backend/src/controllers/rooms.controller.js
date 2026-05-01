const pool = require('../db');

// Public: fetch rooms for a hostel (used by tenant signup dropdown)
exports.getRoomsPublic = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const { rows } = await pool.query(
      'SELECT room_number, rent_amount FROM ROOMS WHERE hostel_unique_username = $1 ORDER BY room_number ASC',
      [hostelId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Owner: list all rooms for their hostel
exports.listRooms = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.room_number, r.rent_amount,
              COUNT(t.id) FILTER (WHERE t.status = 'active') AS tenant_count
       FROM ROOMS r
       LEFT JOIN TENANTS t ON t.hostel_unique_username = r.hostel_unique_username AND t.room_number = r.room_number AND t.status = 'active'
       WHERE r.hostel_unique_username = $1
       GROUP BY r.id, r.room_number, r.rent_amount
       ORDER BY r.room_number ASC`,
      [req.hostelUsername]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Owner: add a room
exports.addRoom = async (req, res) => {
  try {
    const { room_number, rent_amount } = req.body;
    if (!room_number || !rent_amount) {
      return res.status(400).json({ error: 'room_number and rent_amount are required' });
    }
    if (isNaN(parseFloat(rent_amount)) || parseFloat(rent_amount) <= 0) {
      return res.status(400).json({ error: 'rent_amount must be a positive number' });
    }

    // Check duplicate room in same hostel
    const exists = await pool.query(
      'SELECT id FROM ROOMS WHERE hostel_unique_username = $1 AND room_number = $2',
      [req.hostelUsername, room_number.trim()]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: `Room "${room_number}" already exists in your hostel` });
    }

    const { rows } = await pool.query(
      'INSERT INTO ROOMS (hostel_unique_username, room_number, rent_amount) VALUES ($1, $2, $3) RETURNING *',
      [req.hostelUsername, room_number.trim(), parseFloat(rent_amount)]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Owner: update a room's rent
exports.updateRoom = async (req, res) => {
  try {
    const { rent_amount } = req.body;
    if (!rent_amount || isNaN(parseFloat(rent_amount)) || parseFloat(rent_amount) <= 0) {
      return res.status(400).json({ error: 'rent_amount must be a positive number' });
    }

    const { rows } = await pool.query(
      'UPDATE ROOMS SET rent_amount = $1 WHERE id = $2 AND hostel_unique_username = $3 RETURNING *',
      [parseFloat(rent_amount), req.params.id, req.hostelUsername]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Owner: delete a room
exports.deleteRoom = async (req, res) => {
  try {
    // Prevent deletion if active tenants are in this room
    const tenantCheck = await pool.query(
      `SELECT COUNT(*) FROM TENANTS t
       JOIN ROOMS r ON r.id = $1 AND r.hostel_unique_username = $2 AND t.room_number = r.room_number
       WHERE t.status = 'active'`,
      [req.params.id, req.hostelUsername]
    );
    if (parseInt(tenantCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete room with active tenants. Remove or reassign tenants first.' });
    }

    const { rows } = await pool.query(
      'DELETE FROM ROOMS WHERE id = $1 AND hostel_unique_username = $2 RETURNING *',
      [req.params.id, req.hostelUsername]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Owner: bulk add rooms (used during registration)
exports.bulkAddRooms = async (req, res) => {
  try {
    const { hostel_unique_username, rooms } = req.body;
    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: 'rooms array is required' });
    }

    const inserted = [];
    for (const r of rooms) {
      if (!r.room_number || !r.rent_amount) continue;
      try {
        const result = await pool.query(
          'INSERT INTO ROOMS (hostel_unique_username, room_number, rent_amount) VALUES ($1, $2, $3) ON CONFLICT (hostel_unique_username, room_number) DO NOTHING RETURNING *',
          [hostel_unique_username, r.room_number.trim(), parseFloat(r.rent_amount)]
        );
        if (result.rows.length > 0) inserted.push(result.rows[0]);
      } catch (e) { /* skip duplicates */ }
    }
    res.status(201).json({ inserted: inserted.length, rooms: inserted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
