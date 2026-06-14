const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const router = express.Router();

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#10b981','#06b6d4','#3b82f6'];

async function logAuthEvent({ userId = null, email, provider, eventType, success, metadata = {} }) {
  await pool.query(
    'INSERT INTO auth_events(user_id,email,provider,event_type,success,metadata) VALUES($1,$2,$3,$4,$5,$6)',
    [userId, email || null, provider, eventType, success, JSON.stringify(metadata)]
  );
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) {
      await logAuthEvent({ email, provider: 'password', eventType: 'signup', success: false, metadata: { reason: 'duplicate_email' } });
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const result = await pool.query(
      `INSERT INTO users(name,email,password_hash,avatar_color,role,auth_provider,last_login_at)
       VALUES($1,$2,$3,$4,$5,'password',NOW())
       RETURNING id,name,email,avatar_color,role,auth_provider,created_at`,
      [name.trim(), email.toLowerCase().trim(), hash, color, 'user']
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await logAuthEvent({ userId: user.id, email: user.email, provider: 'password', eventType: 'signup', success: true });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user) {
      await logAuthEvent({ email, provider: 'password', eventType: 'login', success: false, metadata: { reason: 'user_not_found' } });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.password_hash) {
      await logAuthEvent({ userId: user.id, email: user.email, provider: 'password', eventType: 'login', success: false, metadata: { reason: 'password_not_available' } });
      return res.status(401).json({ error: 'Use Google sign in for this account' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await logAuthEvent({ userId: user.id, email: user.email, provider: 'password', eventType: 'login', success: false, metadata: { reason: 'bad_password' } });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    await logAuthEvent({ userId: user.id, email: user.email, provider: 'password', eventType: 'login', success: true });
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user || user.role !== 'admin' || !user.password_hash) {
      await logAuthEvent({ userId: user?.id, email, provider: 'password', eventType: 'admin_login', success: false, metadata: { reason: 'not_admin_or_not_found' } });
      return res.status(403).json({ error: 'Admin access denied' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await logAuthEvent({ userId: user.id, email, provider: 'password', eventType: 'admin_login', success: false, metadata: { reason: 'bad_password' } });
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    await logAuthEvent({ userId: user.id, email: user.email, provider: 'password', eventType: 'admin_login', success: true });
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential required' });
  try {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured' });
    const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!tokenResponse.ok) return res.status(401).json({ error: 'Invalid Google credential' });
    const profile = await tokenResponse.json();
    if (profile.aud !== process.env.GOOGLE_CLIENT_ID || profile.email_verified !== 'true') {
      return res.status(401).json({ error: 'Google credential verification failed' });
    }
    const name = profile.name || profile.email.split('@')[0];
    const email = profile.email;
    const sub = profile.sub;
    const picture = profile.picture || null;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const existing = await pool.query('SELECT id FROM users WHERE email=$1 OR google_sub=$2', [email.toLowerCase().trim(), sub]);
    let result;
    if (existing.rows.length) {
      result = await pool.query(
        `UPDATE users SET name=$1, auth_provider='google', google_sub=COALESCE(google_sub,$2), last_login_at=NOW()
         WHERE id=$3 RETURNING id,name,email,avatar_color,role,auth_provider,created_at`,
        [name.trim(), sub, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO users(name,email,password_hash,avatar_color,role,auth_provider,google_sub,last_login_at)
         VALUES($1,$2,NULL,$3,'user','google',$4,NOW())
         RETURNING id,name,email,avatar_color,role,auth_provider,created_at`,
        [name.trim(), email.toLowerCase().trim(), color, sub]
      );
    }
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await logAuthEvent({ userId: user.id, email: user.email, provider: 'google', eventType: 'google_signin', success: true, metadata: { picture } });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    await logAuthEvent({ email: null, provider: 'google', eventType: 'google_signin', success: false, metadata: { reason: 'server_error' } });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
