const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all groups for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*, COUNT(DISTINCT gm2.user_id) as member_count,
              json_agg(json_build_object('id',u.id,'name',u.name,'avatar_color',u.avatar_color)) FILTER (WHERE u.id IS NOT NULL) as members
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1 AND gm.is_active = true
       LEFT JOIN group_members gm2 ON gm2.group_id = g.id AND gm2.is_active = true
       LEFT JOIN users u ON u.id = gm2.user_id
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    res.json({ groups: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create group
router.post('/', authenticate, async (req, res) => {
  const { name, description, memberIds = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const g = await client.query(
      'INSERT INTO groups(name,description,created_by) VALUES($1,$2,$3) RETURNING *',
      [name.trim(), description || null, req.user.id]
    );
    const groupId = g.rows[0].id;
    // Add creator
    const allMembers = [req.user.id, ...memberIds.filter(id => id !== req.user.id)];
    for (const uid of allMembers) {
      await client.query(
        'INSERT INTO group_members(group_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [groupId, uid]
      );
    }
    await client.query('COMMIT');
    const full = await pool.query(
      `SELECT g.*, json_agg(json_build_object('id',u.id,'name',u.name,'avatar_color',u.avatar_color)) as members
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.is_active = true
       LEFT JOIN users u ON u.id = gm.user_id
       WHERE g.id = $1 GROUP BY g.id`,
      [groupId]
    );
    res.status(201).json({ group: full.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get single group
router.get('/:id', authenticate, async (req, res) => {
  try {
    const membership = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND is_active=true',
      [req.params.id, req.user.id]
    );
    if (!membership.rows.length) return res.status(403).json({ error: 'Not a member' });
    const result = await pool.query(
      `SELECT g.*, json_agg(DISTINCT jsonb_build_object('id',u.id,'name',u.name,'email',u.email,'avatar_color',u.avatar_color)) FILTER (WHERE u.id IS NOT NULL) as members
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.is_active = true
       LEFT JOIN users u ON u.id = gm.user_id
       WHERE g.id = $1 GROUP BY g.id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Group not found' });
    res.json({ group: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update group
router.patch('/:id', authenticate, async (req, res) => {
  const { name, description } = req.body;
  try {
    const check = await pool.query('SELECT created_by FROM groups WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Not found' });
    if (check.rows[0].created_by !== req.user.id) return res.status(403).json({ error: 'Only group creator can edit' });
    const result = await pool.query(
      'UPDATE groups SET name=COALESCE($1,name), description=COALESCE($2,description) WHERE id=$3 RETURNING *',
      [name, description, req.params.id]
    );
    res.json({ group: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add member
router.post('/:id/members', authenticate, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    await pool.query(
      'INSERT INTO group_members(group_id,user_id) VALUES($1,$2) ON CONFLICT(group_id,user_id) DO UPDATE SET is_active=true, left_at=NULL',
      [req.params.id, userId]
    );
    const user = await pool.query('SELECT id,name,email,avatar_color FROM users WHERE id=$1', [userId]);
    res.status(201).json({ member: user.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove member
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE group_members SET is_active=false, left_at=NOW() WHERE group_id=$1 AND user_id=$2',
      [req.params.id, req.params.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get group balances
router.get('/:id/balances', authenticate, async (req, res) => {
  try {
    const { calculateGroupBalances } = require('../utils/balances');
    const balances = await calculateGroupBalances(req.params.id);
    res.json({ balances });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
