// server.js
require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS — разрешаем только с GitHub Pages ──
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// ── Роуты ──
app.use('/api', require('./routes/user'));

// ── Health check ──
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ── MongoDB + старт ──
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
