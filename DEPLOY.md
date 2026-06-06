# ⚔️ THE LIFE OF ANTON — Cloud Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CLIENT (React + Vite)               │
│  Press Start 2P · VT323 · SEGA RPG Aesthetic        │
│  Auth → Player → Skills → Quests → Missions         │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS API calls
┌──────────────────────▼──────────────────────────────┐
│              SERVER (Node.js + Express)              │
│  JWT Auth · Rate Limiting · Helmet · CORS            │
│  /api/auth  /api/player  /api/skills                │
│  /api/quests  /api/tasks  /api/activity             │
└──────────────────────┬──────────────────────────────┘
                       │ SQL queries
┌──────────────────────▼──────────────────────────────┐
│                  DATABASE (SQLite)                   │
│  users · player_profiles · skills · quests          │
│  tasks · sessions · activity_log · inventory        │
└─────────────────────────────────────────────────────┘
```

---

## Option A — Railway (Recommended, One-Click)

Railway runs backend + SQLite together on one service, no separate DB needed.

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
gh repo create anton-rpg --public --push
```

### Step 2 — Deploy to Railway
1. Go to [railway.app](https://railway.app) → New Project
2. **Deploy from GitHub repo** → select your repo
3. Railway auto-detects Node.js

### Step 3 — Set Environment Variables in Railway
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
DB_PATH=/app/data/anton.db
CLIENT_URL=https://your-app.up.railway.app
PORT=3001
```

### Step 4 — Add Persistent Volume
In Railway project settings:
- **Volumes** → Add Volume
- Mount path: `/app/data`
- This ensures the SQLite DB survives deploys

### Step 5 — Build Command
```
npm run build
```

### Step 6 — Start Command
```
node --experimental-sqlite server/src/index.js
```

Railway gives you: `https://your-app.up.railway.app` ✅

---

## Option B — Render

### render.yaml (add to repo root)
```yaml
services:
  - type: web
    name: anton-rpg
    env: node
    buildCommand: npm run build
    startCommand: node --experimental-sqlite server/src/index.js
    disk:
      name: anton-data
      mountPath: /opt/render/project/src/data
      sizeGB: 1
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: DB_PATH
        value: /opt/render/project/src/data/anton.db
```

---

## Option C — VPS (DigitalOcean / Hetzner)

```bash
# On server
git clone https://github.com/you/anton-rpg
cd anton-rpg
npm install
npm run build
mkdir -p /data

# Create .env
cat > .env << EOF
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
DB_PATH=/data/anton.db
PORT=3001
CLIENT_URL=https://yourdomain.com
EOF

# PM2 for process management
npm install -g pm2
pm2 start "node --experimental-sqlite server/src/index.js" --name anton
pm2 save && pm2 startup

# Nginx reverse proxy
# /etc/nginx/sites-available/anton
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# SSL with Let's Encrypt
certbot --nginx -d yourdomain.com
```

---

## Option D — Fly.io

```bash
fly launch --name anton-rpg
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly volumes create anton_data --size 1
fly deploy
```

**fly.toml:**
```toml
app = "anton-rpg"
[build]
  [build.args]
    NODE_VERSION = "22"
[mounts]
  source = "anton_data"
  destination = "/data"
[env]
  DB_PATH = "/data/anton.db"
  NODE_ENV = "production"
[[services]]
  http_checks = []
  internal_port = 3001
  protocol = "tcp"
  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80
  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

---

## PostgreSQL Migration (Neon/Supabase)

To switch from SQLite → PostgreSQL for larger scale:

1. Install: `npm install pg drizzle-orm drizzle-kit`
2. Replace `DatabaseSync` in `server/src/db/database.js` with drizzle-pg
3. Set `DATABASE_URL=postgresql://...` in environment
4. Run: `drizzle-kit push`

Schema is already designed for PostgreSQL compatibility.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Min 32 chars random string |
| `DB_PATH` | ✅ | Path to SQLite file |
| `PORT` | Optional | Default: 3001 |
| `NODE_ENV` | Optional | `production` for prod |
| `CLIENT_URL` | Optional | Frontend URL for CORS |

---

## API Reference

### Auth
```
POST /api/auth/signup   { email, password, name }
POST /api/auth/login    { email, password }
POST /api/auth/logout   (Bearer token)
GET  /api/auth/me       (Bearer token)
```

### Game Data (all require Bearer token)
```
GET/POST        /api/skills
PATCH/DELETE    /api/skills/:id
POST            /api/skills/:id/xp      { amount }

GET/POST        /api/quests
PATCH/DELETE    /api/quests/:id

GET/POST        /api/tasks
PATCH/DELETE    /api/tasks/:id

GET             /api/player
PATCH           /api/player
POST            /api/player/achievements { achievementId }

GET             /api/activity
GET             /api/health
```

---

## Integration Test Results (29/29 ✅)

- ✅ Signup + JWT issuance
- ✅ XP=1350 seed data
- ✅ Streak=5 seed data  
- ✅ 5 pre-unlocked achievements
- ✅ Server alive post-signup
- ✅ 12 skills seeded
- ✅ 30 tasks seeded
- ✅ 21 quests seeded
- ✅ Player XP accurate
- ✅ Quest+skillName SQL join
- ✅ Tasks sorted epic→hard→normal→easy
- ✅ Task completion awards XP (+250 epic)
- ✅ xpAwarded in response
- ✅ completedAt timestamp set
- ✅ Quest completion awards XP
- ✅ Cross-session token difference
- ✅ XP synced cross-session (2100 = 2100)
- ✅ Task completion synced
- ✅ Quest completion synced
- ✅ User data isolation (no ID overlap)
- ✅ User2 seeded with 12 skills
- ✅ Cross-user write blocked (404)
- ✅ Create skill (XP=0)
- ✅ Update skill notes
- ✅ Delete skill
- ✅ Epic task XP=250
- ✅ Boss quest XP=500
- ✅ Logout invalidates token (401)
- ✅ No-token request blocked (401)
