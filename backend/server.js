const express = require('express');
const cors = require('cors');
require('dotenv').config();

const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';

const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const configuredOrigin = process.env.FRONTEND_URL;

const corsOptions = {
  origin: (origin, cb) => {
    if (ENV !== 'production' && (!origin || localhostRegex.test(origin))) {
      return cb(null, true);
    }
    if (origin && configuredOrigin && origin.startsWith(configuredOrigin)) {
      return cb(null, true);
    }
    if (!origin) {
      return cb(null, ENV !== 'production');
    }
    return cb(new Error('CORS not allowed for: ' + origin), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${req.headers['content-length'] ? `(${req.headers['content-length']}b)` : ''} origin=${req.headers.origin || 'none'}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    service: 'FormSahay Backend',
    version: '1.0.0',
    status: 'healthy',
    env: ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      chat: 'POST /api/chat',
    },
    gemini_api_key: process.env.GEMINI_API_KEY ? '✅ configured' : (process.env.GOOGLE_API_KEY ? '✅ (via GOOGLE_API_KEY)' : '❌ MISSING'),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ai: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ? 'ready' : 'no-api-key',
  });
});

app.use('/api/chat', chatRouter);

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err && err.stack ? err.stack : err);
  if (err && /CORS/.test(err.message)) {
    return res.status(403).json({ success: false, error: err.message });
  }
  res.status(500).json({ success: false, error: 'Internal Server Error', detail: ENV === 'development' ? (err && err.message || '') : undefined });
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.listen(PORT, () => {
  const apiBase = `http://localhost:${PORT}`;
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           🚀  FormSahay Backend  STARTED                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Port        : ${String(PORT).padEnd(45)}║`);
  console.log(`║  Env         : ${String(ENV).padEnd(45)}║`);
  console.log(`║  Health      : ${String(apiBase + '/api/health').padEnd(45)}║`);
  console.log(`║  Chat API    : ${String(apiBase + '/api/chat').padEnd(45)}║`);
  console.log(`║  Gemini Key  : ${(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? '✅ Configured' : '❌ MISSING').padEnd(45)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});
