const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new Hostel Owner
exports.registerOwner = async (req, res) => {
  try {
    const { name, city, locality, hostel_unique_username, email, phone, password } = req.body;

    if (!name || !city || !locality || !hostel_unique_username || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate hostel_unique_username format (lowercase, alphanumeric + underscore only)
    if (!/^[a-z0-9_]+$/.test(hostel_unique_username)) {
      return res.status(400).json({ error: 'Hostel username must be lowercase with only letters, numbers, and underscores' });
    }

    // Check hostel_unique_username uniqueness
    const existingUsername = await pool.query('SELECT id FROM OWNERS WHERE hostel_unique_username = $1', [hostel_unique_username]);
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: 'This hostel username is already taken' });
    }

    const existingEmail = await pool.query('SELECT id FROM OWNERS WHERE email = $1', [email.toLowerCase()]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const existingPhone = await pool.query('SELECT id FROM OWNERS WHERE phone = $1', [phone]);
    if (existingPhone.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this phone number already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO OWNERS (name, city, locality, hostel_unique_username, email, phone, password)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, hostel_unique_username, email, phone`,
      [name, city, locality, hostel_unique_username, email.toLowerCase(), phone, hashed]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A user with this email, phone, or hostel username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Register a new Tenant
exports.registerTenant = async (req, res) => {
  try {
    const { hostel_unique_username, name, email, phone, password, room_number } = req.body;

    if (!hostel_unique_username || !name || !email || !phone || !password || !room_number) {
      return res.status(400).json({ error: 'All fields including room selection are required' });
    }

    // Verify that the hostel exists
    const hostelRes = await pool.query('SELECT id FROM OWNERS WHERE hostel_unique_username = $1', [hostel_unique_username]);
    if (hostelRes.rows.length === 0) {
      return res.status(404).json({ error: 'No hostel found with this username. Please check with your hostel owner.' });
    }

    // Validate room exists in this hostel and get rent
    const roomRes = await pool.query(
      'SELECT room_number, rent_amount FROM ROOMS WHERE hostel_unique_username = $1 AND room_number = $2',
      [hostel_unique_username, room_number]
    );
    if (roomRes.rows.length === 0) {
      return res.status(400).json({ error: `Room "${room_number}" does not exist in this hostel. Please select a valid room.` });
    }
    const monthly_rent = parseFloat(roomRes.rows[0].rent_amount);

    // Check duplicate: same hostel_unique_username + phone combo
    const existingCombo = await pool.query(
      'SELECT id FROM TENANTS WHERE hostel_unique_username = $1 AND phone = $2',
      [hostel_unique_username, phone]
    );
    if (existingCombo.rows.length > 0) {
      return res.status(400).json({ error: 'A tenant with this phone number is already registered at this hostel' });
    }

    // Check email globally unique
    const existingEmail = await pool.query('SELECT id FROM TENANTS WHERE email = $1', [email.toLowerCase()]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `INSERT INTO TENANTS (hostel_unique_username, name, email, phone, password, room_number, monthly_rent, joining_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, hostel_unique_username, name, email, phone, room_number, monthly_rent, joining_date`,
      [hostel_unique_username, name, email.toLowerCase(), phone, hashed, room_number, monthly_rent, today]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A tenant with this email or phone already exists at this hostel' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Login — supports both email and phone for both owners and tenants
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Phone and password are required' });
    }

    const loginId = identifier.trim().toLowerCase();

    // Try OWNERS table first
    let userQuery;
    if (loginId.includes('@')) {
      userQuery = await pool.query('SELECT * FROM OWNERS WHERE email = $1', [loginId]);
    } else {
      userQuery = await pool.query('SELECT * FROM OWNERS WHERE phone = $1', [loginId]);
    }

    if (userQuery.rows.length > 0) {
      const owner = userQuery.rows[0];
      const isMatch = await bcrypt.compare(password, owner.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { id: owner.id, role: 'OWNER', hostel_unique_username: owner.hostel_unique_username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ token, role: 'OWNER', id: owner.id, name: owner.name, hostel_unique_username: owner.hostel_unique_username });
    }

    // Try TENANTS table
    if (loginId.includes('@')) {
      userQuery = await pool.query('SELECT * FROM TENANTS WHERE email = $1', [loginId]);
    } else {
      userQuery = await pool.query('SELECT * FROM TENANTS WHERE phone = $1', [loginId]);
    }

    if (userQuery.rows.length > 0) {
      const tenant = userQuery.rows[0];
      const isMatch = await bcrypt.compare(password, tenant.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { id: tenant.id, role: 'TENANT', hostel_unique_username: tenant.hostel_unique_username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ token, role: 'TENANT', id: tenant.id, name: tenant.name, hostel_unique_username: tenant.hostel_unique_username });
    }

    return res.status(404).json({ error: 'No account found with this email or phone' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Owner profile
exports.getOwnerProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, city, locality, hostel_unique_username, email, phone, created_at FROM OWNERS WHERE id = $1',
      [req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Owner not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tenant profile
exports.getTenantProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, hostel_unique_username, name, email, phone, room_number, monthly_rent, joining_date, status, created_at FROM TENANTS WHERE id = $1',
      [req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
