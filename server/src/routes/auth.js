import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/database.js';
import { generateToken } from '../middleware/auth.js';
import { formatProfile } from '../profile.js';

const router = Router();

function updateStreak(db, userId, now) {
  const profile = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(userId);
  if (!profile) return;
  const today = now.split('T')[0];
  if (profile.lastActiveDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = profile.lastActiveDate === yesterday ? (profile.streak || 0) + 1 : 1;
  db.prepare('UPDATE player_profiles SET streak=?, lastActiveDate=?, updatedAt=? WHERE userId=?')
    .run(newStreak, today, now, userId);
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email?.trim() || !password || !name?.trim()) {
    return res.status(400).json({ error: 'Email, contraseña y nombre son obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Este email ya está en uso' });

  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(password, 10);
  } catch (err) {
    console.error('bcrypt error:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }

  const userId    = uuid();
  const profileId = uuid();
  const sessionId = uuid();
  const now       = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Create user — completely clean, XP=0, no seed data
  db.prepare('INSERT INTO users (id, email, passwordHash, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, email.toLowerCase().trim(), passwordHash, name.trim(), now, now);

  db.prepare('INSERT INTO player_profiles (id, userId, displayName, totalXP, streak, unlockedAchievements, createdAt, updatedAt) VALUES (?, ?, ?, 0, 0, ?, ?, ?)')
    .run(profileId, userId, name.trim().toUpperCase(), '[]', now, now);

  // Create session
  const token = generateToken(userId);
  db.prepare('INSERT INTO sessions (id, userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, userId, token, expiresAt, now);

  const user    = db.prepare('SELECT id, email, name, createdAt FROM users WHERE id = ?').get(userId);
  const profile = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(userId);

  res.status(201).json({ token, user, profile: formatProfile(profile) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña obligatorios' });

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

  let valid;
  try {
    valid = await bcrypt.compare(password, user.passwordHash);
  } catch {
    return res.status(500).json({ error: 'Error del servidor' });
  }
  if (!valid) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

  const token     = generateToken(user.id);
  const sessionId = uuid();
  const now       = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO sessions (id, userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, user.id, token, expiresAt, now);

  updateStreak(db, user.id, now);

  const profile = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    profile: formatProfile(profile)
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (token) getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  const db  = getDb();
  const now = new Date().toISOString();
  const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expiresAt > ?').get(token, now);
  if (!session) return res.status(401).json({ error: 'Sesión expirada' });
  const user    = db.prepare('SELECT id, email, name, createdAt FROM users WHERE id = ?').get(session.userId);
  const profile = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(session.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user, profile: formatProfile(profile) });
});

export default router;
