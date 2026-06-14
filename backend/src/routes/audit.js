const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  const { eventType, entityType = null, entityId = null, metadata = {} } = req.body;
  if (!eventType) return res.status(400).json({ error: 'eventType required' });
  try {
    const result = await pool.query(
      'INSERT INTO audit_events(user_id,event_type,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, eventType, entityType, entityId, JSON.stringify(metadata)]
    );
    res.status(201).json({ event: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
