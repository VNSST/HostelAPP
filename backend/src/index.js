require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
require('./cron/rent_reminder'); // Initialize cron job

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://manapgrent.in', 'http://manapgrent.in'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Temporary DB setup endpoint
app.get('/api/setup-db', async (req, res) => {
  const pool = require('./db');
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS OWNERS (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        locality VARCHAR(255) NOT NULL,
        hostel_unique_username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ROOMS (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hostel_unique_username VARCHAR(100) NOT NULL REFERENCES OWNERS(hostel_unique_username) ON DELETE CASCADE,
        room_number VARCHAR(50) NOT NULL,
        rent_amount NUMERIC(10, 2) NOT NULL CHECK (rent_amount > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(hostel_unique_username, room_number)
      );

      CREATE TABLE IF NOT EXISTS TENANTS (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hostel_unique_username VARCHAR(100) NOT NULL REFERENCES OWNERS(hostel_unique_username) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        room_number VARCHAR(50),
        monthly_rent NUMERIC(10, 2),
        joining_date DATE DEFAULT CURRENT_DATE,
        deposit_amount NUMERIC(10, 2) DEFAULT 0,
        rent_due_day INTEGER DEFAULT 1 CHECK (rent_due_day >= 1 AND rent_due_day <= 31),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(hostel_unique_username, phone)
      );

      CREATE TABLE IF NOT EXISTS PAYMENTS (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES TENANTS(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('UPI', 'CASH')),
        payment_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
        screenshot_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.send("<h1>Database Tables Created Successfully! 🎉</h1><p>You can now close this tab and go to <a href='/admin/signup'>Sign Up</a>.</p>");
  } catch (error) {
    res.status(500).send("<h1>Error creating tables</h1><p>" + error.message + "</p>");
  }
});

// API routes
app.use('/api', apiRoutes);

// Explicit 404 handler for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve landing page assets
app.use('/assets', express.static(path.join(__dirname, '../../frontend/landing/assets')));

// Landing page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/landing/index.html'));
});

// Serve built React frontend
app.use(express.static(path.join(__dirname, '../../frontend/portal/dist')));

// Fallback for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/portal/dist/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Mana PG Rent Server running on port ${PORT}`);
});
