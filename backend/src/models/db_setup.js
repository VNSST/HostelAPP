const pool = require('../db');

const setupDatabase = async () => {
  try {
    console.log('Running DB setup...');

    await pool.query(`
      DROP TABLE IF EXISTS PAYMENTS CASCADE;
      DROP TABLE IF EXISTS TENANTS CASCADE;
      DROP TABLE IF EXISTS ROOMS CASCADE;
      DROP TABLE IF EXISTS OWNERS CASCADE;
    `);
    console.log('Old tables dropped.');

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

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error setting up DB:', error.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

setupDatabase();
