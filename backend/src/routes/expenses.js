const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

async function assertGroupMember(groupId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND is_active=true',
    [groupId, userId]
  );
  return result.rows.length > 0;
}

function computeSplits(amount, splitType, splits) {
  if (!Array.isArray(splits) || !splits.length) return [];
  const total = Number(amount);
  if (splitType === 'unequal') {
    return splits.map((split) => ({ userId: split.userId, owed: Number(split.amount || 0) }));
  }
  if (splitType === 'percentage') {
    const pctTotal = splits.reduce((sum, split) => sum + Number(split.percentage || 0), 0) || 100;
    return splits.map((split) => ({ userId: split.userId, owed: total * Number(split.percentage || 0) / pctTotal, percentage: split.percentage }));
  }
  if (splitType === 'share') {
    const shareTotal = splits.reduce((sum, split) => sum + Number(split.shares || 0), 0) || splits.length;
    return splits.map((split) => ({ userId: split.userId, owed: total * Number(split.shares || 1) / shareTotal, shares: split.shares || 1 }));
  }
  return splits.map((split) => ({ userId: split.userId, owed: total / splits.length }));
}

// GET /api/expenses/mine  –  all expenses the current user paid or is split-into, across every group they belong to
router.get('/mine', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT e.*,
              json_build_object('id', payer.id, 'name', payer.name, 'avatar_color', payer.avatar_color) AS payer,
              COALESCE(json_agg(json_build_object('user_id', es.user_id, 'owed_amount', es.owed_amount, 'raw_percentage', es.raw_percentage, 'raw_shares', es.raw_shares)) FILTER (WHERE es.id IS NOT NULL), '[]') AS splits,
              g.name AS group_name
       FROM expenses e
       LEFT JOIN users payer ON payer.id = e.paid_by
       LEFT JOIN expense_splits es ON es.expense_id = e.id
       LEFT JOIN groups g ON g.id = e.group_id
       WHERE e.paid_by = $1
          OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = $1)
       GROUP BY e.id, payer.id, g.name
       ORDER BY e.date DESC, e.created_at DESC`,
      [req.user.id]
    );
    res.json({ expenses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/group/:groupId', authenticate, async (req, res) => {
  try {
    if (!(await assertGroupMember(req.params.groupId, req.user.id))) return res.status(403).json({ error: 'Not a member' });
    const result = await pool.query(
      `SELECT e.*,
              json_build_object('id', payer.id, 'name', payer.name, 'avatar_color', payer.avatar_color) AS payer,
              COALESCE(json_agg(json_build_object('user_id', es.user_id, 'owed_amount', es.owed_amount, 'raw_percentage', es.raw_percentage, 'raw_shares', es.raw_shares)) FILTER (WHERE es.id IS NOT NULL), '[]') AS splits
       FROM expenses e
       LEFT JOIN users payer ON payer.id = e.paid_by
       LEFT JOIN expense_splits es ON es.expense_id = e.id
       WHERE e.group_id=$1
       GROUP BY e.id, payer.id
       ORDER BY e.date DESC, e.created_at DESC`,
      [req.params.groupId]
    );
    res.json({ expenses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { groupId, description, amount, currency = 'INR', paidBy, splitType = 'equal', date, notes, splits = [] } = req.body;
  if (!groupId || !description || !amount || !paidBy) return res.status(400).json({ error: 'Missing required expense fields' });
  const client = await pool.connect();
  try {
    if (!(await assertGroupMember(groupId, req.user.id))) return res.status(403).json({ error: 'Not a member' });
    await client.query('BEGIN');
    const expense = await client.query(
      `INSERT INTO expenses(group_id, description, amount, currency, paid_by, split_type, date, notes, created_by)
       VALUES($1,$2,$3,$4,$5,$6,COALESCE($7,CURRENT_DATE),$8,$9)
       RETURNING *`,
      [groupId, description.trim(), amount, currency, paidBy, splitType, date || null, notes || null, req.user.id]
    );
    for (const split of computeSplits(amount, splitType, splits)) {
      await client.query(
        'INSERT INTO expense_splits(expense_id,user_id,owed_amount,raw_percentage,raw_shares) VALUES($1,$2,$3,$4,$5)',
        [expense.rows[0].id, split.userId, split.owed.toFixed(4), split.percentage || null, split.shares || null]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ expense: expense.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.name, u.avatar_color FROM messages m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.expense_id=$1 ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/messages', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    const result = await pool.query(
      'INSERT INTO messages(expense_id,user_id,content) VALUES($1,$2,$3) RETURNING *',
      [req.params.id, req.user.id, content.trim()]
    );
    req.io.to(`expense:${req.params.id}`).emit('expense:message', result.rows[0]);
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
