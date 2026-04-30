# RosterGHP Frontend

Static frontend for the RosterGHP hybrid architecture. Hosted on GitHub Pages, talks to your home backend via JWT-authenticated API calls.

## Deploy to GitHub Pages

### 1. Create a new GitHub repository

Name it something like `RosterGHP-Frontend` or `roster-viewer`.

### 2. Push these files to the repo

```bash
cd /path/to/RosterGHP/frontend
git init
git remote add origin https://github.com/rosterpqc/YOUR-REPO-NAME.git
git add .
git commit -m "Initial frontend"
git push -u origin main
```

### 3. Enable GitHub Pages

- Go to repo Settings → Pages
- Source: Deploy from a branch
- Branch: `main` / `root`
- Click Save

Your site will be live at:
```
https://rosterpqc.github.io/YOUR-REPO-NAME/
```

### 4. Configure the API endpoint

Edit `js/api.js` and change:
```javascript
const API_BASE_URL = 'http://127.0.0.1:8501';
```

to your actual backend URL:
```javascript
const API_BASE_URL = 'https://your-tunnel-domain.com';
```

Commit and push:
```bash
git add js/api.js
git commit -m "Update API endpoint"
git push
```

## Backend Tunnel Options

You need a public URL for your home backend. Options:

### Option A: Cloudflare Tunnel (temporary, changes on restart)
```bash
cd /path/to/RosterGHP
./tunnel.sh start-cf
```
Copy the `*.trycloudflare.com` URL into `js/api.js`.

### Option B: playit.gg (persistent, free account)
```bash
cd /path/to/RosterGHP
./tunnel.sh setup-playit   # one-time
./tunnel.sh start-playit   # each time
```
Configure tunnel at https://playit.gg/account to point to `localhost:8501`.

### Option C: Cloudflare Named Tunnel (persistent, most reliable)
Follow Cloudflare's docs to create a named tunnel with a permanent subdomain.

## Features

- 🔑 JWT login (token stored in localStorage)
- 🌅 Dark / light theme toggle (persisted)
- 📅 Month selector with corporation month labels
- 👤 User switcher (view other coworkers' rosters)
- 📊 Week filter (Week 1–5)
- ✈️ Flight badges with route info
- 📉 iCal export button
- 📊 CSV export button
- ⚙️ Settings panel (aliases, aircraft, read-only)
- 📱 Responsive layout

## Local Development

```bash
cd /path/to/RosterGHP/frontend
python3 -m http.server 8080
```

Open http://localhost:8080

The backend must also be running on http://127.0.0.1:8501 for API calls to work.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  GitHub Pages (Static Frontend)            │
│  rosterpqc.github.io/...                   │
└──────────────────────────────────────────────────┘
                    │
                    ▼  HTTPS + CORS + JWT Bearer
                    │
┌──────────────────────────────────────────────────┐
│  Home Server (FastHTML Backend)            │
│  localhost:8501 ← Cloudflare Tunnel        │
│  /api/* → JSON API                         │
│  / (HTML) → Admin UI                       │
└──────────────────────────────────────────────────┘
                    │
                    ▼  SQLite
                    │
┌──────────────────────────────────────────────────┐
│  SQLite Database                            │
│  roster_history.db                          │
└──────────────────────────────────────────────────┘
```

## Security Notes

- JWT tokens expire after 7 days (configurable in backend `config.py`)
- Token is stored in `localStorage` — this is standard for SPAs
- CORS is restricted to `*.github.io` and `localhost` origins
- API routes are read-only — no upload, edit, or delete endpoints exposed
