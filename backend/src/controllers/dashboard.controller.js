const pool = require('../db');

exports.getSummary = async (req, res) => {
  try {
    const hostel = req.hostelUsername;

    const tenantsRes = await pool.query(
      `SELECT COUNT(*) as count FROM TENANTS WHERE status = 'active' AND hostel_unique_username = $1`,
      [hostel]
    );
    const total_tenants = parseInt(tenantsRes.rows[0].count, 10);

    const roomsRes = await pool.query(
      `SELECT COUNT(*) as count FROM ROOMS WHERE hostel_unique_username = $1`,
      [hostel]
    );
    const total_rooms = parseInt(roomsRes.rows[0].count, 10);

    const amountRes = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN p.status = 'VERIFIED' THEN p.amount ELSE 0 END), 0) as total_collected_amount,
        COUNT(CASE WHEN p.status = 'VERIFIED' THEN 1 END) as total_paid,
        COUNT(CASE WHEN p.status = 'PENDING' THEN 1 END) as total_pending
      FROM PAYMENTS p
      JOIN TENANTS t ON p.tenant_id = t.id
      WHERE t.hostel_unique_username = $1
        AND EXTRACT(MONTH FROM p.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM p.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [hostel]);

    res.json({
      total_tenants,
      total_rooms,
      total_paid: parseInt(amountRes.rows[0].total_paid || 0, 10),
      total_pending: parseInt(amountRes.rows[0].total_pending || 0, 10),
      total_collected_amount: parseFloat(amountRes.rows[0].total_collected_amount || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPaymentsList = async (req, res) => {
  try {
    const hostel = req.hostelUsername;

    const { rows } = await pool.query(`
      SELECT p.*, t.name as tenant_name, t.room_number, t.phone as tenant_phone
      FROM PAYMENTS p
      JOIN TENANTS t ON p.tenant_id = t.id
      WHERE t.hostel_unique_username = $1
      ORDER BY p.created_at DESC
    `, [hostel]);
    
    const VERIFIED = rows.filter(r => r.status === 'VERIFIED');
    const CASH_PENDING = rows.filter(r => r.status === 'PENDING' && r.payment_mode === 'CASH');
    const UPI_PENDING = rows.filter(r => r.status === 'PENDING' && r.payment_mode === 'UPI');
    const REJECTED = rows.filter(r => r.status === 'REJECTED');

    res.json({ VERIFIED, CASH_PENDING, UPI_PENDING, REJECTED });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
