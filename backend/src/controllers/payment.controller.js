const pool = require('../db');

exports.submitPayment = async (req, res) => {
  try {
    const { amount, payment_mode } = req.body;

    // Validate payment_mode
    if (!payment_mode || !['UPI', 'CASH'].includes(payment_mode)) {
      return res.status(400).json({ error: 'payment_mode must be UPI or CASH' });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    let screenshot_url = null;
    if (req.file) {
      screenshot_url = `/uploads/${req.file.filename}`;
    }

    // JWT id is the tenant's own ID in the TENANTS table
    const tenantRes = await pool.query('SELECT id, monthly_rent FROM TENANTS WHERE id = $1', [req.userId]);
    if (tenantRes.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    const tenant = tenantRes.rows[0];

    // Amount mismatch warning (non-blocking)
    let warning = null;
    if (tenant.monthly_rent && parseFloat(amount) !== parseFloat(tenant.monthly_rent)) {
      warning = `Amount ₹${amount} does not match expected rent ₹${tenant.monthly_rent}`;
    }

    const { rows } = await pool.query(
      `INSERT INTO PAYMENTS (tenant_id, amount, payment_mode, payment_date, status, screenshot_url)
       VALUES ($1, $2, $3, CURRENT_DATE, 'PENDING', $4) RETURNING *`,
      [tenant.id, parseFloat(amount), payment_mode, screenshot_url]
    );

    const response = { ...rows[0] };
    if (warning) response.warning = warning;

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTenantPayments = async (req, res) => {
  try {
    // JWT id is the tenant's own ID
    const { rows } = await pool.query(
      'SELECT * FROM PAYMENTS WHERE tenant_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE PAYMENTS SET status = 'VERIFIED' WHERE id = $1 AND status = 'PENDING' RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No pending payment found with this ID' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectPayment = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE PAYMENTS SET status = 'REJECTED' WHERE id = $1 AND status = 'PENDING' RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No pending payment found with this ID' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
