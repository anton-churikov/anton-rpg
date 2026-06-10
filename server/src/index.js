import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  // Don't exit - keep server running
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

import { getDb } from './db/database.js';
import authRouter from './routes/auth.js';
import playerRouter from './routes/player.js';
import { skillsRouter, questsRouter, tasksRouter, activityRouter, eventsRouter, timeBlocksRouter } from './routes/game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15*60*1000, max: 500, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Too many auth attempts' } });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ── INIT DB ───────────────────────────────────────────────────────────────────
getDb();
console.log('✅ Database initialized');

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRouter);
app.use('/api/player',     playerRouter);
app.use('/api/skills',     skillsRouter);
app.use('/api/quests',     questsRouter);
app.use('/api/tasks',      tasksRouter);
app.use('/api/activity',   activityRouter);
app.use('/api/events',      eventsRouter);
app.use('/api/timeblocks',  timeBlocksRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
});

// Serve frontend in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`⚔️  THE LIFE OF ANTON — Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
