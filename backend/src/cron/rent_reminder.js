const cron = require('node-cron');
const pool = require('../db');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running daily rent check...');
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // 1-indexed
    const currentYear = today.getFullYear();

    const { rows: tenants } = await pool.query("SELECT * FROM TENANTS WHERE status = 'active'");
    
    for (const tenant of tenants) {
      const dueDay = parseInt(tenant.rent_due_day, 10);

      // Check if this tenant already has a VERIFIED/PENDING payment for the current month
      const { rows: payments } = await pool.query(
        `SELECT id FROM PAYMENTS WHERE tenant_id = $1
         AND EXTRACT(MONTH FROM payment_date) = $2
         AND EXTRACT(YEAR FROM payment_date) = $3
         AND status IN ('VERIFIED', 'PENDING')`,
        [tenant.id, currentMonth, currentYear]
      );

      if (payments.length > 0) continue; // Already paid or pending

      if (dueDay === currentDay) {
        console.log(`[DUE] Rent due today for: ${tenant.name} (${tenant.phone}) - Room ${tenant.room_number} - ₹${tenant.monthly_rent}`);
      } else if (dueDay < currentDay) {
        console.log(`[OVERDUE] Rent overdue for: ${tenant.name} (${tenant.phone}) - Room ${tenant.room_number} - ₹${tenant.monthly_rent}`);
      }
    }

  } catch (error) {
    console.error('[CRON] Error in rent reminder:', error.message);
  }
});

console.log('[CRON] Rent reminder job scheduled (daily at midnight)');
