const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/messages', authenticate, async (req, res) => {
  try {
    const params = [];
    let filter = '';
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      filter = 'WHERE sm.sender_id=$1 OR sm.recipient_id=$1 OR sm.recipient_id IS NULL';
    }
    const result = await pool.query(
      `SELECT sm.*, sender.name AS sender_name, sender.email AS sender_email, recipient.name AS recipient_name
       FROM support_messages sm
       LEFT JOIN users sender ON sender.id = sm.sender_id
       LEFT JOIN users recipient ON recipient.id = sm.recipient_id
       ${filter}
       ORDER BY sm.created_at ASC`,
      params
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/messages', authenticate, async (req, res) => {
  const { content, recipientId = null, metadata = {} } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'content required' });
  try {
    const result = await pool.query(
      `INSERT INTO support_messages(sender_id,recipient_id,sender_role,content,metadata)
       VALUES($1,$2,$3,$4,$5)
       RETURNING *`,
      [req.user.id, recipientId, req.user.role === 'admin' ? 'admin' : 'user', content.trim(), JSON.stringify(metadata)]
    );
    await pool.query(
      'INSERT INTO audit_events(user_id,event_type,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
      [req.user.id, 'support_message_created', 'support_message', result.rows[0].id, JSON.stringify({ contentLength: content.trim().length })]
    );
    req.io.emit('support:message', result.rows[0]);
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
