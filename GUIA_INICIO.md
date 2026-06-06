# ⚔️ THE LIFE OF ANTON — Guía Completa de Instalación y Despliegue

---

## ÍNDICE

1. [Requisitos previos](#requisitos)
2. [Instalación local (desarrollo)](#local)
3. [Primer arranque](#arranque)
4. [Despliegue en Railway](#railway) ← **Recomendado**
5. [Despliegue en Render](#render)
6. [Despliegue en VPS propio](#vps)
7. [Variables de entorno](#env)
8. [Estructura del proyecto](#estructura)
9. [Solución de problemas](#troubleshooting)

---

## 1. REQUISITOS PREVIOS {#requisitos}

| Herramienta | Versión mínima | Cómo instalar |
|-------------|----------------|---------------|
| **Node.js** | **22.0.0** (obligatorio) | https://nodejs.org |
| npm | 10+ | Viene con Node |
| Git | cualquiera | https://git-scm.com |

> ⚠️ **Node 22 es obligatorio.** La app usa `node:sqlite` que es nativo de Node 22.
> Verifica tu versión: `node --version`

---

## 2. INSTALACIÓN LOCAL {#local}

### Paso 1 — Descarga el proyecto

```bash
# Opción A: si tienes el ZIP
unzip anton_rpg_cloud.zip -d anton-rpg
cd anton-rpg

# Opción B: si tienes el repositorio en GitHub
git clone https://github.com/TU_USUARIO/anton-rpg.git
cd anton-rpg
```

### Paso 2 — Instala las dependencias

```bash
# Dependencias del servidor
cd server
npm install
cd ..

# Dependencias del cliente
cd client
npm install --legacy-peer-deps
cd ..
```

### Paso 3 — Crea el archivo de configuración

```bash
# Copia el ejemplo
cp .env.example .env
```

Edita `.env` con tus valores:

```env
NODE_ENV=development
JWT_SECRET=mi-secreto-super-largo-y-seguro-aqui-32chars
DB_PATH=./server/anton.db
PORT=3001
CLIENT_URL=http://localhost:5173
```

> 💡 `JWT_SECRET` debe tener al menos 32 caracteres. Genera uno así:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Paso 4 — Construye el frontend

```bash
cd client
npm run build
cd ..
```

Esto genera la carpeta `client/dist/` con el frontend compilado.

---

## 3. PRIMER ARRANQUE {#arranque}

### Modo producción (servidor único, todo en uno)

```bash
node --experimental-sqlite server/src/index.js
```

Abre tu navegador en: **http://localhost:3001**

Verás la pantalla de login. Crea una cuenta nueva y el juego se inicializa automáticamente con:
- 12 habilidades (React, TypeScript, SQL, Figma, Fitness...)
- 30 misiones
- 21 misiones principales
- Anton en nivel 7 con 1.350 XP

### Modo desarrollo (hot reload)

Necesitas **dos terminales**:

**Terminal 1 — Servidor:**
```bash
node --watch --experimental-sqlite server/src/index.js
```

**Terminal 2 — Cliente:**
```bash
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- El frontend en dev hace proxy automático de `/api` → `localhost:3001`

---

## 4. DESPLIEGUE EN RAILWAY ⭐ {#railway}

Railway es la opción más rápida. Te da una URL pública con HTTPS en ~5 minutos.

### Paso 1 — Sube el código a GitHub

```bash
git init
git add .
git commit -m "The Life of Anton - initial commit"

# Crea el repo en GitHub (necesitas tener la CLI instalada)
gh repo create anton-rpg --public --push
# O hazlo manualmente en github.com y luego:
# git remote add origin https://github.com/TU_USUARIO/anton-rpg.git
# git push -u origin main
```

### Paso 2 — Crea el proyecto en Railway

1. Ve a **https://railway.app** → crea una cuenta gratis
2. Clic en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Autoriza Railway a acceder a tu GitHub
5. Selecciona el repo **anton-rpg**
6. Railway detecta Node.js automáticamente

### Paso 3 — Añade un volumen persistente (para la base de datos)

> Sin esto, la base de datos se borra cada vez que deploys.

1. En tu proyecto Railway → clic en el servicio
2. Ve a la pestaña **"Volumes"**
3. Clic **"Add Volume"**
4. Mount path: `/app/data`
5. Size: `1 GB` (gratis en el plan Hobby)

### Paso 4 — Configura las variables de entorno

En Railway → tu servicio → pestaña **"Variables"**, añade:

```
NODE_ENV          = production
JWT_SECRET        = [genera uno aleatorio, mínimo 32 chars]
DB_PATH           = /app/data/anton.db
PORT              = 3001
CLIENT_URL        = https://[tu-app].up.railway.app
```

> Para obtener la URL de tu app, Railway la muestra en la pestaña "Settings" → "Domains"

### Paso 5 — Configura los comandos de build/start

En Railway → tu servicio → pestaña **"Settings"**:

```
Build Command:  npm run build
Start Command:  node --experimental-sqlite server/src/index.js
```

### Paso 6 — Despliega

Clic en **"Deploy"** o haz un push a main:

```bash
git push origin main
```

Railway construye y despliega automáticamente. En ~2 minutos tendrás:

**🎮 https://anton-rpg-production.up.railway.app**

---

## 5. DESPLIEGUE EN RENDER {#render}

Alternativa gratuita a Railway.

### Paso 1 — Crea el archivo render.yaml

Crea `/render.yaml` en la raíz del proyecto:

```yaml
services:
  - type: web
    name: anton-rpg
    env: node
    region: frankfurt
    plan: free
    buildCommand: cd server && npm install && cd ../client && npm install --legacy-peer-deps && npm run build
    startCommand: node --experimental-sqlite server/src/index.js
    disk:
      name: anton-data
      mountPath: /data
      sizeGB: 1
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: DB_PATH
        value: /data/anton.db
      - key: PORT
        value: 10000
```

### Paso 2 — Despliega en Render

1. Ve a **https://render.com** → New → Blueprint
2. Conecta tu repo de GitHub
3. Render lee el `render.yaml` automáticamente
4. Clic **"Apply"**

> ⚠️ El plan gratuito de Render "duerme" el servidor después de 15min de inactividad.
> El primer request puede tardar ~30 segundos en responder.

---

## 6. DESPLIEGUE EN VPS PROPIO {#vps}

Para DigitalOcean, Hetzner, Linode, etc.

### Requisitos del servidor

- Ubuntu 22.04 o 24.04
- 1 GB RAM mínimo
- Node.js 22

### Instalación en el servidor

```bash
# Conéctate al servidor
ssh root@tu-ip-servidor

# Instala Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Verifica
node --version  # debe ser v22.x.x

# Instala PM2 (gestor de procesos)
npm install -g pm2

# Instala Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Clona el proyecto
cd /opt
git clone https://github.com/TU_USUARIO/anton-rpg.git
cd anton-rpg

# Instala dependencias
cd server && npm install && cd ..
cd client && npm install --legacy-peer-deps && npm run build && cd ..

# Crea la carpeta para la base de datos
mkdir -p /data

# Crea el archivo .env
cat > .env << 'EOF'
NODE_ENV=production
JWT_SECRET=CAMBIA_ESTO_POR_UN_SECRETO_LARGO_Y_SEGURO
DB_PATH=/data/anton.db
PORT=3001
CLIENT_URL=https://tudominio.com
EOF

# Inicia con PM2
pm2 start "node --experimental-sqlite server/src/index.js" \
  --name "anton-rpg" \
  --cwd /opt/anton-rpg

# Guarda para que se reinicie solo si el servidor se apaga
pm2 save
pm2 startup
# Sigue las instrucciones que te muestra PM2
```

### Configura Nginx como proxy inverso

```bash
cat > /etc/nginx/sites-available/anton << 'EOF'
server {
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Activa el sitio
ln -s /etc/nginx/sites-available/anton /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL gratuito con Let's Encrypt
certbot --nginx -d tudominio.com -d www.tudominio.com
```

### Comandos útiles de PM2

```bash
pm2 status           # Ver estado
pm2 logs anton-rpg   # Ver logs en tiempo real
pm2 restart anton-rpg # Reiniciar
pm2 stop anton-rpg    # Parar
```

### Actualizar la app después de cambios

```bash
cd /opt/anton-rpg
git pull origin main
cd client && npm run build && cd ..
pm2 restart anton-rpg
```

---

## 7. VARIABLES DE ENTORNO {#env}

| Variable | Obligatoria | Valor por defecto | Descripción |
|----------|-------------|-------------------|-------------|
| `NODE_ENV` | No | `development` | `production` en prod |
| `JWT_SECRET` | **Sí** | — | Secreto para firmar tokens JWT. Mín. 32 chars |
| `DB_PATH` | No | `./server/anton.db` | Ruta al archivo SQLite |
| `PORT` | No | `3001` | Puerto del servidor |
| `CLIENT_URL` | No | `http://localhost:5173` | URL del frontend (para CORS) |

### Generar un JWT_SECRET seguro

```bash
# En terminal local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ejemplo de output:
# a3f8b2d914c756e0f2b8d3c9a1e7f456b8d2c4e6f0a1b3d5e7f9c2a4b6d8e0f2
```

---

## 8. ESTRUCTURA DEL PROYECTO {#estructura}

```
anton-rpg/
├── .env.example          # Plantilla de configuración
├── .env                  # Tu configuración (NO subir a git)
├── package.json          # Scripts raíz (build + start)
│
├── server/               # Backend Node.js + Express
│   ├── package.json
│   └── src/
│       ├── index.js          # Entrada principal del servidor
│       ├── db/
│       │   └── database.js   # SQLite: esquema y conexión
│       ├── middleware/
│       │   └── auth.js       # JWT verification
│       └── routes/
│           ├── auth.js       # /api/auth (signup, login, logout)
│           ├── player.js     # /api/player (perfil, XP)
│           └── game.js       # /api/skills, /api/quests, /api/tasks
│
├── client/               # Frontend React + Vite
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── dist/             # Build compilado (generado por npm run build)
│   └── src/
│       ├── App.jsx           # Shell principal + routing
│       ├── index.css         # SEGA RPG estilos globales
│       ├── main.jsx
│       ├── lib/
│       │   ├── api.js        # Cliente HTTP (fetch wrapper)
│       │   └── rpg.js        # Constantes RPG (XP, niveles, rangos)
│       ├── hooks/
│       │   └── useAuth.jsx   # Context de autenticación
│       ├── pages/
│       │   └── AuthPages.jsx # Login + Signup
│       └── components/
│           ├── PlayerPage.jsx
│           ├── SkillsPage.jsx
│           ├── QuestsPage.jsx
│           ├── TasksPage.jsx
│           ├── AchievementsPage.jsx
│           ├── Modals.jsx
│           ├── SyncIndicator.jsx
│           ├── XPBar.jsx
│           └── LevelUpFlash.jsx
│
└── DEPLOY.md             # Guía técnica de despliegue
```

---

## 9. SOLUCIÓN DE PROBLEMAS {#troubleshooting}

### ❌ Error: `node:sqlite` not found

```
Error: Cannot find module 'node:sqlite'
```

**Causa:** Tu versión de Node es menor a 22.
**Solución:**
```bash
# Verifica tu versión
node --version

# Si es menor que v22, actualiza:
# En macOS con homebrew:
brew install node@22

# En Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
```

### ❌ Error: `Cannot find module` al arrancar

```
Error: Cannot find module './routes/auth.js'
```

**Causa:** Faltan dependencias instaladas.
**Solución:**
```bash
cd server && npm install && cd ..
```

### ❌ Error: Puerto 3001 en uso

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solución:**
```bash
# Ver qué proceso usa el puerto
lsof -ti:3001

# Matarlo
kill $(lsof -ti:3001)

# O cambiar el puerto en .env:
PORT=3002
```

### ❌ El frontend no carga (pantalla en blanco)

**Causa:** El build del cliente no existe o está desactualizado.
**Solución:**
```bash
cd client
npm install --legacy-peer-deps
npm run build
cd ..
node --experimental-sqlite server/src/index.js
```

### ❌ Error 401 en todos los requests

**Causa:** El `JWT_SECRET` en `.env` cambió y los tokens existentes son inválidos.
**Solución:** Borra el token del navegador o haz logout y vuelve a iniciar sesión.

### ❌ La base de datos no persiste en Railway/Render

**Causa:** Olvidaste añadir el volumen persistente.
**Solución:** Revisa el Paso 3 de la guía de Railway/Render y añade el volumen.

### ❌ CORS error en producción

```
Access to fetch blocked by CORS policy
```

**Causa:** `CLIENT_URL` no coincide con la URL real de tu frontend.
**Solución:** Actualiza la variable `CLIENT_URL` en Railway/Render con la URL exacta de tu app (incluyendo `https://`).

---

## RESUMEN RÁPIDO

```bash
# INSTALAR
cd server && npm install && cd ../client && npm install --legacy-peer-deps && cd ..

# COMPILAR FRONTEND
cd client && npm run build && cd ..

# ARRANCAR (todo en uno)
node --experimental-sqlite server/src/index.js

# → Abre http://localhost:3001
# → Crea una cuenta nueva
# → El juego empieza con datos de ejemplo listos
```

---

*The Life of Anton — Every day is a quest. Every skill is a level.*
