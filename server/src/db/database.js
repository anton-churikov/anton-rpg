import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../anton.db');

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS player_profiles (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      displayName TEXT NOT NULL DEFAULT 'PLAYER',
      totalXP INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      lastActiveDate TEXT,
      unlockedAchievements TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Tech',
      xp INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      resources TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'main',
      status TEXT NOT NULL DEFAULT 'active',
      relatedSkillId TEXT REFERENCES skills(id) ON DELETE SET NULL,
      xpReward INTEGER NOT NULL DEFAULT 200,
      deadline TEXT,
      completedAt TEXT,
      lastCompletedDate TEXT,
      totalCompletions INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'todo',
      relatedSkillId TEXT REFERENCES skills(id) ON DELETE SET NULL,
      xpReward INTEGER NOT NULL DEFAULT 50,
      dueDate TEXT,
      completedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#1a6bff',
      relatedSkillId TEXT REFERENCES skills(id) ON DELETE SET NULL,
      relatedQuestId TEXT REFERENCES quests(id) ON DELETE SET NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      xpEarned INTEGER NOT NULL DEFAULT 0,
      relatedId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      itemType TEXT NOT NULL,
      itemId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      metadata TEXT NOT NULL DEFAULT '{}',
      acquiredAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_rewards (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rewardDate TEXT NOT NULL,
      xpAwarded INTEGER NOT NULL DEFAULT 0,
      claimedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_skills_user    ON skills(userId);
    CREATE INDEX IF NOT EXISTS idx_quests_user    ON quests(userId);
    CREATE INDEX IF NOT EXISTS idx_tasks_user     ON tasks(userId);
    CREATE INDEX IF NOT EXISTS idx_events_user    ON events(userId);
    CREATE INDEX IF NOT EXISTS idx_events_date    ON events(userId, date);
    CREATE INDEX IF NOT EXISTS idx_activity_user  ON activity_log(userId);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(userId);
    CREATE TABLE IF NOT EXISTS time_blocks (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#1a6bff',
      startHour REAL NOT NULL,
      duration REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'work',
      relatedTaskId TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      dayOfWeek INTEGER,
      date TEXT,
      isTemplate INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_timeblocks_user ON time_blocks(userId);
    CREATE INDEX IF NOT EXISTS idx_timeblocks_date ON time_blocks(userId, date);

  `);

  // Migrate: add new columns to existing DBs without breaking them
  try { db.exec(`ALTER TABLE quests ADD COLUMN lastCompletedDate TEXT`); } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS time_blocks (id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#1a6bff', startHour REAL NOT NULL, duration REAL NOT NULL, category TEXT NOT NULL DEFAULT 'work', relatedTaskId TEXT, dayOfWeek INTEGER, date TEXT, isTemplate INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')), updatedAt TEXT NOT NULL DEFAULT (datetime('now')))`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_timeblocks_user ON time_blocks(userId)`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_timeblocks_date ON time_blocks(userId, date)`); } catch {}
  // events table — may not exist in older deployments
  try { db.exec(`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, startTime TEXT NOT NULL, endTime TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#1a6bff', relatedSkillId TEXT, relatedQuestId TEXT, createdAt TEXT NOT NULL DEFAULT (datetime('now')), updatedAt TEXT NOT NULL DEFAULT (datetime('now')))`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_events_user ON events(userId)`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_events_date ON events(userId, date)`); } catch {}
  // activity_log — may not exist in older deployments
  try { db.exec(`CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL, description TEXT NOT NULL, xpEarned INTEGER NOT NULL DEFAULT 0, relatedId TEXT, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(userId)`); } catch {}

  // Coins & Cosmetic Shop — additive only, safe on existing DBs
  try { db.exec(`ALTER TABLE player_profiles ADD COLUMN coins INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE player_profiles ADD COLUMN equipped TEXT NOT NULL DEFAULT '{}'`); } catch {}
  try { db.exec(`ALTER TABLE activity_log ADD COLUMN coinsEarned INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(userId)`); } catch {}
}

export default getDb;
