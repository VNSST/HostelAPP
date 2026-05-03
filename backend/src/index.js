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
