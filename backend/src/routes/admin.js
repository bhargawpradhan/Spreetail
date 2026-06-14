const express = require('express');
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/overview', async (_req, res) => {
  try {
    const [users, groups, expenses, settlements, supportMessages, auditEvents, authEvents, activityLogs, imports] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query('SELECT COUNT(*)::int AS count FROM groups'),
      pool.query('SELECT COUNT(*)::int AS count FROM expenses'),
      pool.query('SELECT COUNT(*)::int AS count FROM settlements'),
      pool.query('SELECT COUNT(*)::int AS count FROM support_messages'),
      pool.query('SELECT COUNT(*)::int AS count FROM audit_events'),
      pool.query('SELECT COUNT(*)::int AS count FROM auth_events'),
      pool.query('SELECT COUNT(*)::int AS count FROM activity_logs'),
      pool.query('SELECT COUNT(*)::int AS count FROM import_reports')
    ]);
    res.json({
      counts: {
        users: users.rows[0].count,
        groups: groups.rows[0].count,
        expenses: expenses.rows[0].count,
        settlements: settlements.rows[0].count,
        supportMessages: supportMessages.rows[0].count,
        auditEvents: auditEvents.rows[0].count,
        authEvents: authEvents.rows[0].count,
        activityLogs: activityLogs.rows[0].count,
        importReports: imports.rows[0].count
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/everything', async (_req, res) => {
  try {
    const [users, groups, members, expenses, splits, settlements, messages, support, audit, auth, activity, imports] = await Promise.all([
      pool.query('SELECT id,name,email,avatar_color,role,auth_provider,last_login_at,created_at FROM users ORDER BY created_at DESC LIMIT 200'),
      pool.query('SELECT * FROM groups ORDER BY created_at DESC LIMIT 200'),
      pool.query('SELECT * FROM group_members ORDER BY joined_at DESC LIMIT 500'),
      pool.query('SELECT * FROM expenses ORDER BY created_at DESC LIMIT 500'),
      pool.query('SELECT * FROM expense_splits LIMIT 1000'),
      pool.query('SELECT * FROM settlements ORDER BY created_at DESC LIMIT 500'),
      pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 500'),
      pool.query(`SELECT sm.*, u.name AS sender_name, u.email AS sender_email
                  FROM support_messages sm
                  LEFT JOIN users u ON u.id = sm.sender_id
                  ORDER BY sm.created_at DESC LIMIT 500`),
      pool.query(`SELECT ae.*, u.name AS user_name, u.email AS user_email
                  FROM audit_events ae
                  LEFT JOIN users u ON u.id = ae.user_id
                  ORDER BY ae.created_at DESC LIMIT 500`),
      pool.query('SELECT * FROM auth_events ORDER BY created_at DESC LIMIT 500'),
      pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500'),
      pool.query('SELECT * FROM import_reports ORDER BY imported_at DESC LIMIT 100')
    ]);
    res.json({
      users: users.rows,
      groups: groups.rows,
      groupMembers: members.rows,
      expenses: expenses.rows,
      expenseSplits: splits.rows,
      settlements: settlements.rows,
      expenseMessages: messages.rows,
      supportMessages: support.rows,
      auditEvents: audit.rows,
      authEvents: auth.rows,
      activityLogs: activity.rows,
      importReports: imports.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
