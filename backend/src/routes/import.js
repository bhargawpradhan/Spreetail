const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/reports', authenticate, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM import_reports ORDER BY imported_at DESC LIMIT 20');
    res.json({ reports: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/csv', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  try {
    const rows = parse(req.file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true });
    const anomalies = [];
    rows.forEach((row, index) => {
      if (!row.paid_by) anomalies.push({ row: index + 1, issue: 'missing paid_by', action: 'skipped or manual review' });
      if (!row.currency) anomalies.push({ row: index + 1, issue: 'missing currency', action: 'default INR' });
      if (Number(String(row.amount).replace(/,/g, '')) < 0) anomalies.push({ row: index + 1, issue: 'negative amount', action: 'import as refund' });
      if ((row.notes || '').toLowerCase().includes('settlement')) anomalies.push({ row: index + 1, issue: 'settlement-like row', action: 'record payment instead of expense' });
    });
    const report = await pool.query(
      'INSERT INTO import_reports(filename,total_rows,imported,skipped,anomalies,group_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.file.originalname, rows.length, rows.length, 0, JSON.stringify(anomalies), req.body.groupId || null]
    );
    res.status(201).json({ report: report.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Unable to parse CSV' });
  }
});

module.exports = router;
