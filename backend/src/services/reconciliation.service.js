const pool = require('../db');
const fs = require('fs');
const csv = require('csv-parser');

exports.reconcileBankStatement = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a CSV file' });
  }

  const results = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('error', (err) => {
      // Clean up uploaded file on read error
      try { fs.unlinkSync(filePath); } catch (_) {}
      return res.status(400).json({ error: 'Failed to parse CSV: ' + err.message });
    })
    .on('end', async () => {
      // Clean up uploaded file
      try { fs.unlinkSync(filePath); } catch (_) {}

      if (results.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty or has no valid rows' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Fetch all pending UPI payments
        const { rows: pendingPayments } = await client.query(
          `SELECT id, amount, upi_reference_id, payment_date FROM PAYMENTS 
           WHERE status = 'PENDING' AND payment_mode = 'UPI'`
        );

        let verifiedCount = 0;
        const matchedTxIndices = new Set(); // prevent one bank tx from matching multiple payments

        for (const payment of pendingPayments) {
          const matchIndex = results.findIndex((tx, idx) => {
            if (matchedTxIndices.has(idx)) return false; // already used

            const txAmount = parseFloat(tx.amount || 0);
            const pAmount = parseFloat(payment.amount);
            if (Math.abs(txAmount - pAmount) > 0.01) return false; // tolerance for float comparison

            // Check reference ID matching
            const refId = payment.upi_reference_id;
            if (refId) {
              const descMatch = (tx.description || '').toLowerCase().includes(refId.toLowerCase());
              const refMatch = (tx.reference_id || '').toLowerCase().includes(refId.toLowerCase());
              if (descMatch || refMatch) return true;
            }

            // Fallback: Same amount within ±2 days
            const txDate = new Date(tx.date);
            const pDate = new Date(payment.payment_date);
            if (isNaN(txDate.getTime()) || isNaN(pDate.getTime())) return false;
            const diffDays = Math.abs((txDate - pDate) / (1000 * 60 * 60 * 24));
            
            return diffDays <= 2;
          });

          if (matchIndex !== -1) {
            matchedTxIndices.add(matchIndex);
            await client.query(
              `UPDATE PAYMENTS SET status = 'VERIFIED' WHERE id = $1`,
              [payment.id]
            );
            verifiedCount++;
          }
        }

        await client.query('COMMIT');
        res.json({
          message: 'Reconciliation complete',
          verifiedCount,
          totalPendingProcessed: pendingPayments.length,
          totalBankTransactions: results.length
        });
      } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
      } finally {
        client.release();
      }
    });
};
