const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/group/:groupId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, payer.name AS paid_by_name, receiver.name AS paid_to_name
       FROM settlements s
       LEFT JOIN users payer ON payer.id = s.paid_by
       LEFT JOIN users receiver ON receiver.id = s.paid_to
       WHERE s.group_id=$1 ORDER BY s.date DESC, s.created_at DESC`,
      [req.params.groupId]
    );
    res.json({ settlements: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { groupId, paidBy, paidTo, amount, currency = 'INR', date, notes } = req.body;
  if (!groupId || !paidBy || !paidTo || !amount) return res.status(400).json({ error: 'Missing settlement fields' });
  try {
    const result = await pool.query(
      `INSERT INTO settlements(group_id,paid_by,paid_to,amount,currency,date,notes,created_by)
       VALUES($1,$2,$3,$4,$5,COALESCE($6,CURRENT_DATE),$7,$8) RETURNING *`,
      [groupId, paidBy, paidTo, amount, currency, date || null, notes || null, req.user.id]
    );
    res.status(201).json({ settlement: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
