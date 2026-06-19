require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimit');
const { authenticate } = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/auth.routes');
const sessionRoutes = require('./routes/session.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const qrRoutes = require('./routes/qr.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const geofenceRoutes = require('./routes/geofence.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Global Middleware ─────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);

// Simple cookie parser (lightweight, no dependency)
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      req.cookies[name] = rest.join('=');
    });
  }
  next();
});

// ── Health Check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────
// Auth routes (register/login don't need authentication)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/geofences', geofenceRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ── Start Server ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║    🎓 QR Attendance System — API Server       ║
  ║    Port: ${PORT}                                 ║
  ║    Environment: ${process.env.NODE_ENV || 'development'}               ║
  ╚═══════════════════════════════════════════════╝
  `);
});

module.exports = app;
