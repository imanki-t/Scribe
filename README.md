# ✍️ Scribe

A beautiful, fast, full-featured note-taking app. Modern UI, real-time collaboration, version history, public sharing, Google Auth, and more.

## ✨ Features

| Feature | Details |
|---|---|
| 🎨 **New UI** | Dark/light/system themes, custom accent colors, animated auth page with mouse-tracking characters |
| 🔐 **Auth** | Cookie-based JWT sessions, Google OAuth, password change |
| 🔗 **URL routing** | `/app` = auth, `/note/:id` = specific note, `/shared/:token` = public view |
| 📝 **Rich editor** | Markdown with live toolbar, split/preview/edit modes, typewriter mode, focus mode |
| 📜 **Version history** | Last 10 auto-saves per note, restore any version |
| 🔗 **Public sharing** | One-click shareable links for any note |
| ⭐ **Favorites** | Star/pin notes separately |
| 📋 **Templates** | Blank, Meeting Notes, Daily Journal, To-Do, Brainstorm |
| 🔍 **Search** | Instant full-text search with highlighted snippets |
| 🏷️ **Tags** | Tag notes, browse by tag in sidebar |
| 📊 **Stats** | Word count, streak, reading time, notes count |
| 👥 **Real-time collab** | WebSocket-based presence & live updates |
| 📁 **Folders** | Nested folders with color coding, note counts |
| 📤 **Export** | Download notes as `.md` files |
| 🖼️ **Images** | Upload images directly into notes |
| ⌨️ **Keyboard shortcuts** | Ctrl+K search, Ctrl+, settings, Ctrl+\\ sidebar |
| 📱 **Mobile** | Fully responsive, mobile-friendly layout |

## 🚀 Quick Start

```bash
# 1. Copy env file and fill in values
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start dev server (runs frontend + backend concurrently)
npm run dev
```

Then open **http://localhost:3000**

## 🔧 Setup

### MongoDB
- **Local**: Install MongoDB and use `mongodb://localhost:27017/scribe`  
- **Atlas**: Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas) and use the connection string

### Google OAuth (optional)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Copy Client ID and Secret into `.env`

## 📦 Production Build

```bash
npm run build   # builds frontend to /dist
npm start       # serves frontend + API from Express
```

## 🗂️ Project Structure

```
scribe/
├── server/
│   └── index.mjs         # Express + WebSocket server
├── src/
│   ├── App.tsx            # Router + auth guard
│   ├── components/
│   │   ├── AuthPage.tsx   # Animated login/register
│   │   ├── Editor.tsx     # Main note editor
│   │   ├── Header.tsx     # Top nav
│   │   ├── Sidebar.tsx    # Notes list + folders
│   │   ├── Modals.tsx     # Search, Folder, Version, Settings modals
│   │   └── ToastProvider.tsx
│   ├── context/
│   │   ├── AppContext.tsx  # Global app state
│   │   └── AuthContext.tsx # Cookie-based auth
│   ├── services/
│   │   ├── api.ts         # All API calls
│   │   └── socket.ts      # WebSocket client
│   ├── types.ts
│   └── index.css          # Complete design system
├── .env.example
└── vite.config.ts
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Open search |
| `Ctrl+,` | Open settings |
| `Ctrl+\` | Toggle sidebar |
| `Ctrl+N` | New note |
| `Esc` | Close any modal / exit focus mode |
| `Tab` | Indent in editor |
