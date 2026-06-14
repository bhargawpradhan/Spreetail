require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const settlementRoutes = require('./routes/settlements');
const importRoutes = require('./routes/import');
const supportRoutes = require('./routes/support');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const balanceRoutes = require('./routes/balances');
const { authenticateSocket } = require('./middleware/auth');
const { setupSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io to req for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Persist every API request so admins can inspect even small product activity.
app.use('/api', (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null;
    let userId = null;
    if (token) {
      try {
        userId = require('jsonwebtoken').verify(token, process.env.JWT_SECRET).userId;
      } catch {
        userId = null;
      }
    }
    require('./db/pool').query(
      'INSERT INTO activity_logs(user_id,method,path,status_code,duration_ms,metadata) VALUES($1,$2,$3,$4,$5,$6)',
      [userId, req.method, req.originalUrl, res.statusCode, Date.now() - startedAt, JSON.stringify({ userAgent: req.headers['user-agent'] || null })]
    ).catch((err) => console.error('Activity log failed:', err.message));
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/import', importRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/balances', balanceRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Socket.io auth middleware
io.use(authenticateSocket);
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };
