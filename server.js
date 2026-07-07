require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { initSchema } = require('./db/pool');
const registerRoutes = require('./routes/register');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: restrict to your real website domain in production.
// Set ALLOWED_ORIGIN in your environment, e.g. https://topgunshit.com
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

app.use(helmet());
app.use(express.json({ limit: '20kb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', registerRoutes);
app.use('/api', adminRoutes);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ result: 'error', message: 'Not found.' });
});

// Central error handler (catches anything unexpected, e.g. bad JSON body)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(400).json({ result: 'error', message: 'Invalid request.' });
});

async function start() {
  try {
    await initSchema();
    app.listen(PORT, () => {
      console.log(`TOPGUNS backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
