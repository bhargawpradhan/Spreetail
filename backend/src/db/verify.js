require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./pool');

const requiredTables = [
  'users',
  'auth_events',
  'groups',
  'group_members',
  'expenses',
  'expense_splits',
  'settlements',
  'messages',
  'support_messages',
  'audit_events',
  'activity_logs',
  'import_reports'
];

async function verify() {
  try {
    const server = await pool.query('SELECT current_database() AS database, version() AS version');
    console.log(`Connected to database: ${server.rows[0].database}`);

    const tables = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema='public' AND table_name = ANY($1::text[])`,
      [requiredTables]
    );
    const found = new Set(tables.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((table) => !found.has(table));
    if (missing.length) throw new Error(`Missing tables: ${missing.join(', ')}`);

    for (const table of requiredTables) {
      const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count}`);
    }

    console.log('Database verification complete.');
  } finally {
    await pool.end();
  }
}

verify().catch((err) => {
  console.error('Database verification failed:', err.message);
  process.exitCode = 1;
});
