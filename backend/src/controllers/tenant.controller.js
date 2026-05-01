const pool = require('../db');

// ─── Prorated rent helper ───────────────────────────────────────────────
// If joining_date is in the current month, prorate: rent * (daysLeft / daysInMonth)
function getProratedRent(monthly_rent, joining_date) {
  if (!monthly_rent || !joining_date) return { prorated: false, rent_due: monthly_rent };

  const today = new Date();
  const joined = new Date(joining_date);

  // Only prorate if joined in the current calendar month
  if (
    joined.getFullYear() === today.getFullYear() &&
    joined.getMonth() === today.getMonth()
  ) {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const joiningDay = joined.getDate();
    // Days from joining day to end of month (inclusive of joining day)
    const daysFromJoining = daysInMonth - joiningDay + 1;
    const prorated_amount = Math.round((parseFloat(monthly_rent) / daysInMonth) * daysFromJoining);
    return {
      prorated: true,
      joining_day: joiningDay,
      days_in_month: daysInMonth,
      days_charged: daysFromJoining,
      prorated_amount,
      rent_due: prorated_amount
    };
  }

  return { prorated: false, rent_due: parseFloat(monthly_rent) };
}

// List tenants belonging to the logged-in owner's hostel
exports.listTenants = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM TENANTS WHERE hostel_unique_username = $1 ORDER BY created_at DESC`,
      [req.hostelUsername]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTenant = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM TENANTS WHERE id = $1 AND hostel_unique_username = $2',
      [req.params.id, req.hostelUsername]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tenant fetching their own details (with prorated rent info)
exports.getTenantMe = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM TENANTS WHERE id = $1', [req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tenant details not found' });

    const tenant = rows[0];
    const prorateInfo = getProratedRent(tenant.monthly_rent, tenant.joining_date);

    res.json({ ...tenant, ...prorateInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTenant = async (req, res) => {
  try {
    const { name, room_number, monthly_rent, status, rent_due_day, deposit_amount } = req.body;

    const existing = await pool.query(
      'SELECT * FROM TENANTS WHERE id = $1 AND hostel_unique_username = $2',
      [req.params.id, req.hostelUsername]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    const t = existing.rows[0];

    // If room_number is changing, look up the new rent from ROOMS
    let newRent = monthly_rent || t.monthly_rent;
    if (room_number && room_number !== t.room_number) {
      const roomRes = await pool.query(
        'SELECT rent_amount FROM ROOMS WHERE hostel_unique_username = $1 AND room_number = $2',
        [req.hostelUsername, room_number]
      );
      if (roomRes.rows.length > 0) {
        newRent = parseFloat(roomRes.rows[0].rent_amount);
      }
    }

    const { rows } = await pool.query(
      `UPDATE TENANTS SET name=$1, room_number=$2, monthly_rent=$3, status=$4, rent_due_day=$5, deposit_amount=$6
       WHERE id=$7 AND hostel_unique_username=$8 RETURNING *`,
      [
        name || t.name,
        room_number !== undefined ? room_number : t.room_number,
        newRent,
        status || t.status,
        rent_due_day || t.rent_due_day,
        deposit_amount !== undefined ? deposit_amount : t.deposit_amount,
        req.params.id,
        req.hostelUsername
      ]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Owner: remove a tenant
exports.deleteTenant = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantRes = await client.query(
      'SELECT id FROM TENANTS WHERE id = $1 AND hostel_unique_username = $2',
      [req.params.id, req.hostelUsername]
    );
    if (tenantRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await client.query('DELETE FROM PAYMENTS WHERE tenant_id = $1', [req.params.id]);
    await client.query('DELETE FROM TENANTS WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ message: 'Tenant removed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Tenant: self-removal (leave hostel)
exports.tenantSelfRemove = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM PAYMENTS WHERE tenant_id = $1', [req.userId]);
    await client.query('DELETE FROM TENANTS WHERE id = $1', [req.userId]);
    await client.query('COMMIT');
    res.json({ message: 'You have been removed from the hostel successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};
