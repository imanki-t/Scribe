import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'scribe-secret-key-2025-change-in-prod';
const JWT_EXPIRES = '30d';
const COOKIE_NAME = 'scribe_session';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(cors({ origin: isDev ? ['http://localhost:3000','http://localhost:5173'] : false, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

if (!isDev) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
}

// ══ MODELS ══════════════════════════════════════════════════

const userSchema = new mongoose.Schema({
  username:      { type: String, required: true, unique: true, trim: true },
  password:      { type: String, default: '' },
  displayName:   { type: String, default: '' },
  email:         { type: String, default: '', lowercase: true, trim: true },
  avatar:        { type: String, default: '' },
  accentColor:   { type: String, default: '#f59e0b' },
  googleId:      { type: String, default: null },
  settings:      { type: mongoose.Schema.Types.Mixed, default: {} },
  streak:        { type: Number, default: 0 },
  lastWriteDate: { type: String, default: null },
  totalWords:    { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now },
  lastSeen:      { type: Date, default: Date.now },
});

const folderSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  color:    { type: String, default: '#f59e0b' },
  order:    { type: Number, default: 0 },
}, { timestamps: true });

const versionSchema = new mongoose.Schema({
  content: String, title: String, savedAt: { type: Date, default: Date.now },
});

const noteSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, default: 'Untitled Note', trim: true },
  content:    { type: String, default: '' },
  folderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  tags:       [{ type: String, trim: true }],
  isPinned:   { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  color:      { type: String, default: null },
  wordCount:  { type: Number, default: 0 },
  charCount:  { type: Number, default: 0 },
  images:     [{ id: String, data: String, mimeType: String, name: String }],
  versions:   { type: [versionSchema], default: [] },
  isPublic:   { type: Boolean, default: false },
  shareToken: { type: String, default: null },
  template:   { type: String, default: null },
}, { timestamps: true });

noteSchema.index({ userId: 1, updatedAt: -1 });

const User   = mongoose.model('User',   userSchema);
const Folder = mongoose.model('Folder', folderSchema);
const Note   = mongoose.model('Note',   noteSchema);

// ══ DB ══════════════════════════════════════════════════════
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/scribe';
mongoose.connect(MONGO_URI).then(() => console.log('✅ MongoDB connected')).catch(e => console.error('❌', e.message));

// ══ AUTH HELPERS ════════════════════════════════════════════
const signToken = (userId, username) => jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
const setCookie = (res, token) => res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: !isDev, sameSite: isDev ? 'lax' : 'strict', maxAge: 30*24*60*60*1000, path: '/' });
const clearCookie = (res) => res.clearCookie(COOKIE_NAME, { path: '/' });
const fmtUser = (u) => ({ id: u._id.toString(), username: u.username, displayName: u.displayName || u.username, email: u.email || '', avatar: u.avatar || '', accentColor: u.accentColor || '#f59e0b', streak: u.streak || 0, totalWords: u.totalWords || 0, settings: u.settings || {}, hasGoogle: !!u.googleId, createdAt: u.createdAt });

function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const p = jwt.verify(token, JWT_SECRET);
    req.userId = p.userId; req.username = p.username; next();
  } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

async function updateStreak(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    if (user.lastWriteDate === today) return;
    const yest = new Date(Date.now()-86400000).toISOString().split('T')[0];
    await User.findByIdAndUpdate(userId, { lastWriteDate: today, streak: user.lastWriteDate === yest ? (user.streak||0)+1 : 1 });
  } catch {}
}

// ══ AUTH ROUTES ═════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return res.status(400).json({ error: 'Invalid username format' });
    if (await User.findOne({ username: username.toLowerCase() })) return res.status(409).json({ error: 'Username already taken' });
    const user = await User.create({ username: username.toLowerCase(), password: await bcrypt.hash(password, 12), displayName: displayName || username });
    const token = signToken(user._id.toString(), user.username);
    setCookie(res, token);
    res.json({ user: fmtUser(user), token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username?.toLowerCase() });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    user.lastSeen = new Date(); await user.save();
    const token = signToken(user._id.toString(), user.username);
    setCookie(res, token);
    res.json({ user: fmtUser(user), token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/logout', (req, res) => { clearCookie(res); res.json({ success: true }); });

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) { clearCookie(res); return res.status(401).json({ error: 'Not found' }); }
    res.json(fmtUser(user));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const allowed = ['displayName','accentColor','email','avatar','settings'];
    const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json(fmtUser(user));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });
    const user = await User.findById(req.userId);
    if (user.password && !await bcrypt.compare(currentPassword, user.password)) return res.status(401).json({ error: 'Wrong current password' });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Google OAuth
app.get('/api/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(501).json({ error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env' });
  const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: `${APP_URL}/api/auth/google/callback`, response_type: 'code', scope: 'openid email profile', access_type: 'offline', prompt: 'select_account' });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/api/auth/google/callback', async (req, res) => {
  if (req.query.error) return res.redirect('/app?error=google_denied');
  try {
    const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: req.query.code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: `${APP_URL}/api/auth/google/callback`, grant_type: 'authorization_code' }) });
    const td = await tr.json();
    if (!td.access_token) throw new Error('No token');
    const ur = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${td.access_token}` } });
    const { sub: gid, email, name, picture } = await ur.json();
    let user = await User.findOne({ $or: [{ googleId: gid }, { email: email?.toLowerCase() }] });
    if (!user) {
      let un = (email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,28);
      let s = 1; while (await User.findOne({ username: un })) un = `${un}${s++}`;
      user = await User.create({ username: un, googleId: gid, email: email?.toLowerCase(), displayName: name, avatar: picture });
    } else { user.googleId = gid; if (picture) user.avatar = picture; user.lastSeen = new Date(); await user.save(); }
    setCookie(res, signToken(user._id.toString(), user.username));
    res.redirect('/');
  } catch (err) { console.error('Google OAuth error:', err); res.redirect('/app?error=google_failed'); }
});

// ══ STATS ═══════════════════════════════════════════════════

app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const [notes, folders, user] = await Promise.all([Note.find({ userId: req.userId }), Folder.find({ userId: req.userId }), User.findById(req.userId)]);
    res.json({
      noteCount: notes.length, folderCount: folders.length,
      pinnedCount: notes.filter(n=>n.isPinned).length,
      favoriteCount: notes.filter(n=>n.isFavorite).length,
      totalWords: notes.reduce((a,n)=>a+(n.wordCount||0),0),
      totalChars: notes.reduce((a,n)=>a+(n.charCount||0),0),
      streak: user?.streak || 0,
      readingTime: Math.ceil(notes.reduce((a,n)=>a+(n.wordCount||0),0) / 200),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══ FOLDERS ══════════════════════════════════════════════════

app.get('/api/folders', authMiddleware, async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.userId }).sort({ order:1, createdAt:1 });
    const counts = await Note.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(req.userId) } }, { $group: { _id: '$folderId', count: { $sum: 1 } } }]);
    const cm = Object.fromEntries(counts.map(x=>[String(x._id), x.count]));
    res.json(folders.map(f=>({ ...f.toObject(), noteCount: cm[String(f._id)]||0 })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/folders', authMiddleware, async (req, res) => {
  try { res.json(await Folder.create({ ...req.body, userId: req.userId })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/folders/:id', authMiddleware, async (req, res) => {
  try {
    const f = await Folder.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
    if (!f) return res.status(404).json({ error: 'Not found' });
    res.json(f);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/folders/:id', authMiddleware, async (req, res) => {
  try {
    const f = await Folder.findOne({ _id: req.params.id, userId: req.userId });
    if (!f) return res.status(404).json({ error: 'Not found' });
    await Note.updateMany({ folderId: req.params.id, userId: req.userId }, { folderId: null });
    await Folder.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══ NOTES ════════════════════════════════════════════════════

const noteProjection = { content:1, title:1, folderId:1, tags:1, isPinned:1, isFavorite:1, color:1, wordCount:1, charCount:1, isPublic:1, shareToken:1, template:1, createdAt:1, updatedAt:1 };

app.get('/api/notes', authMiddleware, async (req, res) => {
  try {
    const q = { userId: req.userId };
    if (req.query.folderId !== undefined) q.folderId = req.query.folderId === 'null' ? null : req.query.folderId;
    if (req.query.tag) q.tags = req.query.tag;
    if (req.query.favorite === 'true') q.isFavorite = true;
    res.json(await Note.find(q, noteProjection).sort({ isPinned:-1, updatedAt:-1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notes/all', authMiddleware, async (req, res) => {
  try { res.json(await Note.find({ userId: req.userId }, { content:0, images:0, versions:0 }).sort({ isPinned:-1, updatedAt:-1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notes/recent', authMiddleware, async (req, res) => {
  try { res.json(await Note.find({ userId: req.userId }, { content:0, images:0, versions:0 }).sort({ updatedAt:-1 }).limit(8)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) return res.status(404).json({ error: 'Not found' });
    const obj = note.toObject();
    obj.versionCount = (obj.versions||[]).length;
    delete obj.images; delete obj.versions;
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notes', authMiddleware, async (req, res) => {
  try {
    const { title='Untitled Note', content='', folderId=null, tags=[], color=null, template=null } = req.body;
    const wc = content.trim().split(/\s+/).filter(Boolean).length;
    const note = await Note.create({ userId: req.userId, title, content, folderId, tags, color, template, wordCount: wc, charCount: content.length });
    updateStreak(req.userId);
    const obj = note.toObject(); delete obj.images; delete obj.versions;
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) return res.status(404).json({ error: 'Not found' });
    const { content, title, ...rest } = req.body;
    if (content !== undefined && content !== note.content) {
      const wc = content.trim().split(/\s+/).filter(Boolean).length;
      const diff = Math.abs(wc-(note.wordCount||0));
      if (diff > 5 || note.versions.length===0) {
        note.versions.push({ content: note.content, title: note.title, savedAt: new Date() });
        if (note.versions.length > 10) note.versions = note.versions.slice(-10);
      }
      note.content=content; note.wordCount=wc; note.charCount=content.length;
      updateStreak(req.userId);
    }
    if (title !== undefined) note.title = title;
    Object.assign(note, rest);
    await note.save();
    const obj = note.toObject(); obj.versionCount=(obj.versions||[]).length; delete obj.images; delete obj.versions;
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const r = await Note.deleteOne({ _id: req.params.id, userId: req.userId });
    if (!r.deletedCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/notes/:id/move', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { folderId: req.body.folderId||null }, { new: true });
    if (!note) return res.status(404).json({ error: 'Not found' });
    const obj = note.toObject(); delete obj.images; delete obj.versions; res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Version history
app.get('/api/notes/:id/versions', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) return res.status(404).json({ error: 'Not found' });
    res.json((note.versions||[]).slice().reverse().map((v,i) => ({ index:i, title:v.title, savedAt:v.savedAt, wordCount:v.content?.split(/\s+/).filter(Boolean).length||0, preview:v.content?.slice(0,120)||'' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notes/:id/versions/:idx', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) return res.status(404).json({ error: 'Not found' });
    const v = (note.versions||[]).slice().reverse()[parseInt(req.params.idx)];
    if (!v) return res.status(404).json({ error: 'Version not found' });
    res.json({ content: v.content, title: v.title, savedAt: v.savedAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Share
app.post('/api/notes/:id/share', authMiddleware, async (req, res) => {
  try {
    const update = req.body.enable ? { isPublic:true, shareToken:uuidv4() } : { isPublic:false, shareToken:null };
    const note = await Note.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, update, { new: true });
    if (!note) return res.status(404).json({ error: 'Not found' });
    res.json({ isPublic: note.isPublic, shareToken: note.shareToken });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/shared/:token', async (req, res) => {
  try {
    const note = await Note.findOne({ shareToken: req.params.token, isPublic: true });
    if (!note) return res.status(404).json({ error: 'Not found' });
    res.json({ title: note.title, content: note.content, updatedAt: note.updatedAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Images
app.post('/api/notes/:id/images', authMiddleware, async (req, res) => {
  try {
    const { data, mimeType, name } = req.body;
    const id = uuidv4();
    await Note.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { $push: { images: { id, data, mimeType, name } } });
    res.json({ id, url: `/api/notes/${req.params.id}/images/${id}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notes/:id/images/:imgId', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    const img = note?.images.find(i => i.id === req.params.imgId);
    if (!img) return res.status(404).end();
    res.setHeader('Content-Type', img.mimeType);
    res.send(Buffer.from(img.data, 'base64'));
  } catch { res.status(404).end(); }
});

// ══ SEARCH ═══════════════════════════════════════════════════

app.get('/api/search', authMiddleware, async (req, res) => {
  try {
    const { q, folderId, tag, caseSensitive } = req.query;
    if (!q?.trim()) return res.json([]);
    const query = { userId: req.userId };
    if (folderId) query.folderId = folderId;
    if (tag) query.tags = tag;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), caseSensitive ? 'g' : 'gi');
    const notes = await Note.find(query, { title:1, content:1, folderId:1, tags:1, isPinned:1, isFavorite:1, wordCount:1, updatedAt:1, createdAt:1 }).sort({ updatedAt:-1 }).limit(40);
    res.json(notes.filter(n=>re.test(n.title)||re.test(n.content)).map(n => {
      const idx = n.content.search(re);
      return { ...n.toObject(), snippet: idx>=0 ? n.content.slice(Math.max(0,idx-40),idx+100).replace(/\n/g,' ') : n.content.slice(0,120) };
    }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tags', authMiddleware, async (req, res) => {
  try {
    const r = await Note.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(req.userId) } }, { $unwind: '$tags' }, { $group: { _id:'$tags', count:{$sum:1} } }, { $sort:{count:-1} }]);
    res.json(r.map(x=>({ name:x._id, count:x.count })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══ WEBSOCKET ════════════════════════════════════════════════

const rooms = new Map();
const WS_COLORS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#ec4899','#f97316'];

wss.on('connection', (ws) => {
  let room = null, info = null;
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'join_note': {
          if (room) { rooms.get(room)?.delete(info); bcast(room,{type:'peer_left',userId:info?.userId},ws); }
          room = msg.noteId;
          const r = rooms.get(room) || new Set(); rooms.set(room, r);
          const taken = [...r].map(c=>c.color);
          const color = WS_COLORS.find(c=>!taken.includes(c)) || WS_COLORS[0];
          info = { ws, userId: msg.userId||uuidv4(), userName: msg.userName||'Guest', color, noteId: msg.noteId };
          r.add(info);
          bcast(room,{type:'peer_joined',userId:info.userId,userName:info.userName,color},ws);
          ws.send(JSON.stringify({type:'peers',peers:[...r].filter(c=>c!==info).map(c=>({userId:c.userId,userName:c.userName,color:c.color}))}));
          break;
        }
        case 'note_update': bcast(room,{type:'note_update',title:msg.title,content:msg.content,tags:msg.tags,userId:info?.userId},ws); break;
        case 'cursor_update': bcast(room,{type:'cursor_update',position:msg.position,userId:info?.userId,color:info?.color},ws); break;
        case 'leave_note': if(room&&info){rooms.get(room)?.delete(info);bcast(room,{type:'peer_left',userId:info.userId},ws);room=null;} break;
      }
    } catch {}
  });
  ws.on('close', () => { if(room&&info){rooms.get(room)?.delete(info);bcast(room,{type:'peer_left',userId:info.userId},ws);} });
});

function bcast(noteId, msg, except) {
  const r = rooms.get(noteId); if (!r) return;
  const s = JSON.stringify(msg);
  for (const c of r) if (c.ws!==except && c.ws.readyState===WebSocket.OPEN) c.ws.send(s);
}

// ══ SPA FALLBACK ══════════════════════════════════════════════
if (!isDev) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`✅ Scribe server on :${PORT}`));
