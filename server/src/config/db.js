const { Pool } = require('pg');

const pool = new Pool({
  // Use connection string if available (for Neon/Render)
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'attendance_db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'attendance_secret_2024',
    }),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

module.exports = pool;
