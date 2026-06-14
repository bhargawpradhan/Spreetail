const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Search users by name or email
router.get('/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });
  try {
    const result = await pool.query(
      `SELECT id, name, email, avatar_color FROM users
       WHERE (LOWER(name) LIKE $1 OR LOWER(email) LIKE $1) AND id != $2
       LIMIT 10`,
      [`%${q.toLowerCase()}%`, req.user.id]
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.patch('/me', authenticate, async (req, res) => {
  const { name, avatar_color } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name=COALESCE($1,name), avatar_color=COALESCE($2,avatar_color) WHERE id=$3 RETURNING id,name,email,avatar_color',
      [name, avatar_color, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
