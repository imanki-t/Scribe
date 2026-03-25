import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Folder as FolderIcon, Clock, Tag, FileText,
  Check, Loader2, History, RotateCcw, Eye,
  Settings, Sliders, Type, Moon, Sun, Monitor, Palette,
  ChevronRight, Save, Lock, User, Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';
import { api } from '../services/api';
import { SearchResult, Theme, DEFAULT_SETTINGS, FontFamily } from '../types';
import { formatDistanceToNow, format } from 'date-fns';

/* ── Backdrop ── */
function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div className="modal-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   SEARCH MODAL
════════════════════════════════════════════ */
export function SearchModal() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.search(q);
        setResults(r); setSelected(0);
      } catch {} finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const close = useCallback(() => dispatch({ type: 'SET_SEARCH_OPEN', open: false }), [dispatch]);

  const pick = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_NOTE', id }); navigate(`/note/${id}`); close();
  }, [dispatch, navigate, close]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[selected]) pick(results[selected]._id);
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [results, selected, pick, close]);

  function highlightSnippet(text: string) {
    if (!q.trim()) return text;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
    return text.replace(re, m => `<mark>${m}</mark>`);
  }

  return (
    <Backdrop onClose={close}>
      <motion.div className="search-modal"
        initial={{ opacity: 0, y: -20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>

        <div className="search-input-row">
          <Search size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
          <input ref={inputRef} className="search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search your notes…" />
          {loading && <Loader2 size={13} className="spin" style={{ color: 'var(--fg-muted)' }} />}
          {q && !loading && <button className="search-clear" onClick={() => setQ('')}><X size={12} /></button>}
          <kbd className="search-esc">Esc</kbd>
        </div>

        {results.length > 0 && (
          <div className="search-results">
            {results.map((r, i) => (
              <button key={r._id} className={`search-result ${selected === i ? 'selected' : ''}`} onClick={() => pick(r._id)} onMouseEnter={() => setSelected(i)}>
                <FileText size={12} style={{ flexShrink: 0, opacity: 0.4 }} />
                <div className="search-result-body">
                  <span className="search-result-title" dangerouslySetInnerHTML={{ __html: highlightSnippet(r.title || 'Untitled') }} />
                  {r.snippet && <p className="search-result-snippet" dangerouslySetInnerHTML={{ __html: highlightSnippet(r.snippet) }} />}
                  <div className="search-result-meta">
                    {r.tags.map(t => <span key={t} className="search-result-tag">#{t}</span>)}
                    <span>{formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <ChevronRight size={10} style={{ opacity: 0.3 }} />
              </button>
            ))}
          </div>
        )}
        {q && !loading && results.length === 0 && (
          <div className="search-empty">
            <Search size={28} style={{ opacity: 0.15 }} />
            <p>No notes found for "{q}"</p>
          </div>
        )}
        {!q && (
          <div className="search-hint">
            <p>Start typing to search all your notes</p>
            <div className="search-kbd-hint">
              <kbd>↑↓</kbd> navigate <kbd>↵</kbd> open <kbd>Esc</kbd> close
            </div>
          </div>
        )}
      </motion.div>
    </Backdrop>
  );
}

/* ════════════════════════════════════════════
   FOLDER MODAL
════════════════════════════════════════════ */
const FOLDER_COLORS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#f97316','#06b6d4','#ec4899','#6b7280'];

export function FolderModal() {
  const { state, dispatch, createFolder, updateFolder } = useApp();
  const { toast } = useToast();
  const target = state.folderModalTarget;
  const [name, setName] = useState(target?.name || '');
  const [color, setColor] = useState(target?.color || FOLDER_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const close = () => dispatch({ type: 'SET_FOLDER_MODAL', open: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (target) await updateFolder(target._id, { name, color });
      else         await createFolder({ name, color });
      toast(target ? 'Folder updated' : 'Folder created', 'success');
      close();
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Backdrop onClose={close}>
      <motion.div className="small-modal"
        initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
        <div className="small-modal-header">
          <FolderIcon size={14} />
          <span>{target ? 'Edit folder' : 'New folder'}</span>
          <button className="modal-close" onClick={close}><X size={13} /></button>
        </div>
        <form onSubmit={submit} className="small-modal-body">
          <input ref={inputRef} className="modal-input" value={name} onChange={e => setName(e.target.value)} placeholder="Folder name" />
          <div className="color-row">
            {FOLDER_COLORS.map(c => (
              <button key={c} type="button" className={`color-swatch-lg ${color === c ? 'selected' : ''}`}
                style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
              {loading ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
              {target ? 'Save changes' : 'Create folder'}
            </button>
          </div>
        </form>
      </motion.div>
    </Backdrop>
  );
}

/* ════════════════════════════════════════════
   MOVE NOTE MODAL
════════════════════════════════════════════ */
export function MoveNoteModal() {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const noteId = state.moveNoteTarget;
  const close = () => dispatch({ type: 'SET_MOVE_NOTE', open: false });

  const moveTo = async (folderId: string | null) => {
    if (!noteId) return;
    setLoading(true);
    try {
      await api.notes.move(noteId, folderId);
      dispatch({ type: 'UPDATE_NOTE', note: { ...state.notes.find(n => n._id === noteId)!, folderId } });
      toast('Note moved', 'success'); close();
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const note = state.notes.find(n => n._id === noteId);

  return (
    <Backdrop onClose={close}>
      <motion.div className="small-modal"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
        <div className="small-modal-header">
          <FolderIcon size={14} />
          <span>Move "{note?.title || 'Note'}"</span>
          <button className="modal-close" onClick={close}><X size={13} /></button>
        </div>
        <div className="small-modal-body">
          <button className={`move-option ${!note?.folderId ? 'active' : ''}`} onClick={() => moveTo(null)}>
            <FileText size={13} /> Unfiled (no folder)
          </button>
          {state.folders.map(f => (
            <button key={f._id} className={`move-option ${note?.folderId === f._id ? 'active' : ''}`} onClick={() => moveTo(f._id)}>
              <div className="folder-dot" style={{ background: f.color }} />
              {f.name}
              <span className="folder-count">{f.noteCount}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </Backdrop>
  );
}

/* ════════════════════════════════════════════
   VERSION HISTORY MODAL
════════════════════════════════════════════ */
export function VersionModal() {
  const { state, dispatch, updateNote } = useApp();
  const { toast } = useToast();
  const noteId = state.versionNoteTarget;
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const close = () => dispatch({ type: 'SET_VERSION_MODAL', open: false });

  useEffect(() => {
    if (!noteId) return;
    api.notes.versions(noteId).then(v => { setVersions(v); setLoading(false); }).catch(() => setLoading(false));
  }, [noteId]);

  const loadPreview = async (idx: number) => {
    if (!noteId) return;
    setPreviewLoading(true);
    try { setPreview(await api.notes.version(noteId, idx)); } catch {}
    finally { setPreviewLoading(false); }
  };

  const restore = async () => {
    if (!preview || !noteId) return;
    await updateNote(noteId, { content: preview.content, title: preview.title });
    toast('Version restored', 'success'); close();
  };

  return (
    <Backdrop onClose={close}>
      <motion.div className="version-modal"
        initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
        <div className="small-modal-header">
          <History size={14} />
          <span>Version history</span>
          <button className="modal-close" onClick={close}><X size={13} /></button>
        </div>
        <div className="version-modal-body">
          <div className="version-list">
            {loading ? <Loader2 size={20} className="spin" style={{ margin: '20px auto', display: 'block', color: 'var(--fg-muted)' }} />
            : versions.length === 0 ? <p className="version-empty">No saved versions yet.<br />Versions are saved automatically as you write.</p>
            : versions.map((v, i) => (
              <button key={i} className={`version-item ${preview && versions.indexOf(v) === i ? 'active' : ''}`} onClick={() => loadPreview(i)}>
                <div className="version-item-left">
                  <Clock size={11} />
                  <div>
                    <p className="version-item-date">{format(new Date(v.savedAt), 'MMM d, yyyy · h:mm a')}</p>
                    <p className="version-item-words">{v.wordCount} words</p>
                  </div>
                </div>
                <Eye size={11} style={{ opacity: 0.4 }} />
              </button>
            ))}
          </div>
          <div className="version-preview">
            {previewLoading ? <Loader2 size={20} className="spin" style={{ margin: '40px auto', display: 'block', color: 'var(--fg-muted)' }} />
            : preview ? (
              <>
                <div className="version-preview-header">
                  <span>{preview.title}</span>
                  <button className="btn-primary" onClick={restore} style={{ padding: '4px 12px', fontSize: 12 }}>
                    <RotateCcw size={11} /> Restore this version
                  </button>
                </div>
                <pre className="version-preview-content">{preview.content}</pre>
              </>
            ) : <p className="version-preview-hint">Select a version to preview it</p>}
          </div>
        </div>
      </motion.div>
    </Backdrop>
  );
}

/* ════════════════════════════════════════════
   SETTINGS MODAL
════════════════════════════════════════════ */
type SettingsTab = 'editor' | 'appearance' | 'account' | 'danger';

export function SettingsModal() {
  const { state, dispatch } = useApp();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<SettingsTab>('editor');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const close = () => dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
  const { settings } = state;

  const TABS: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'editor',     label: 'Editor',      icon: Type },
    { id: 'appearance', label: 'Appearance',   icon: Palette },
    { id: 'account',    label: 'Account',      icon: User },
    { id: 'danger',     label: 'Danger zone',  icon: Trash2 },
  ];

  const updateSetting = (patch: any) => dispatch({ type: 'UPDATE_SETTINGS', settings: patch });

  const FONTS: { key: FontFamily; label: string; sample: string }[] = [
    { key: 'jakarta', label: 'Jakarta Sans', sample: 'Aa' },
    { key: 'mono',    label: 'DM Mono',      sample: 'Aa' },
    { key: 'serif',   label: 'Fraunces',     sample: 'Aa' },
    { key: 'cursive', label: 'Cursive',      sample: 'Aa' },
  ];

  const ACCENT_PRESETS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#f97316','#06b6d4','#ec4899'];

  const saveProfile = async () => {
    setProfileLoading(true);
    try { await updateProfile({ displayName }); toast('Profile updated', 'success'); }
    catch (err: any) { toast(err.message, 'error'); }
    finally { setProfileLoading(false); }
  };

  const savePassword = async () => {
    if (!newPwd || newPwd.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
    setPwdLoading(true);
    try { await changePassword(curPwd, newPwd); toast('Password changed', 'success'); setCurPwd(''); setNewPwd(''); }
    catch (err: any) { toast(err.message, 'error'); }
    finally { setPwdLoading(false); }
  };

  return (
    <Backdrop onClose={close}>
      <motion.div className="settings-modal"
        initial={{ opacity: 0, scale: 0.96, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>

        <div className="settings-sidebar">
          <div className="settings-brand">
            <Settings size={14} /> Settings
          </div>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`settings-tab ${tab === id ? 'active' : ''} ${id === 'danger' ? 'danger' : ''}`}
              onClick={() => setTab(id)}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          <button className="modal-close settings-close" onClick={close}><X size={13} /></button>

          {tab === 'editor' && (
            <div className="settings-panel">
              <h2 className="settings-panel-title">Editor settings</h2>

              {/* Font family */}
              <div className="setting-group">
                <label className="setting-label">Font family</label>
                <div className="font-grid">
                  {FONTS.map(f => (
                    <button key={f.key} className={`font-option ${settings.fontFamily === f.key ? 'active' : ''}`}
                      onClick={() => updateSetting({ fontFamily: f.key })}
                      style={{ fontFamily: f.key === 'jakarta' ? 'var(--font-sans)' : f.key === 'mono' ? 'var(--font-mono)' : f.key === 'serif' ? 'var(--font-serif)' : 'cursive' }}>
                      <span className="font-option-sample">{f.sample}</span>
                      <span className="font-option-label">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div className="setting-group">
                <label className="setting-label">Font size — {settings.fontSize}px</label>
                <input type="range" min={12} max={22} value={settings.fontSize} onChange={e => updateSetting({ fontSize: Number(e.target.value) })} className="setting-range" />
              </div>

              {/* Line height */}
              <div className="setting-group">
                <label className="setting-label">Line height — {settings.lineHeight}</label>
                <input type="range" min={1.2} max={2.2} step={0.05} value={settings.lineHeight} onChange={e => updateSetting({ lineHeight: Number(e.target.value) })} className="setting-range" />
              </div>

              {/* Tab size */}
              <div className="setting-group">
                <label className="setting-label">Tab size</label>
                <div className="pill-group">
                  {[2, 4].map(v => (
                    <button key={v} className={`pill-option ${settings.tabSize === v ? 'active' : ''}`} onClick={() => updateSetting({ tabSize: v })}>{v} spaces</button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              {[
                { key: 'spellCheck',     label: 'Spell check' },
                { key: 'showWordCount',  label: 'Show word count' },
                { key: 'typewriterMode', label: 'Typewriter scrolling mode' },
              ].map(({ key, label }) => (
                <div key={key} className="setting-toggle-row">
                  <span className="setting-label">{label}</span>
                  <button className={`toggle-btn ${(settings as any)[key] ? 'on' : ''}`} onClick={() => updateSetting({ [key]: !(settings as any)[key] })} />
                </div>
              ))}

              {/* Autosave delay */}
              <div className="setting-group">
                <label className="setting-label">Autosave delay — {settings.autosaveDelay}ms</label>
                <input type="range" min={300} max={3000} step={100} value={settings.autosaveDelay} onChange={e => updateSetting({ autosaveDelay: Number(e.target.value) })} className="setting-range" />
              </div>

              {/* Default view */}
              <div className="setting-group">
                <label className="setting-label">Default view</label>
                <div className="pill-group">
                  {(['edit','split','preview'] as const).map(v => (
                    <button key={v} className={`pill-option ${settings.defaultView === v ? 'active' : ''}`} onClick={() => updateSetting({ defaultView: v })}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="settings-panel">
              <h2 className="settings-panel-title">Appearance</h2>

              {/* Theme */}
              <div className="setting-group">
                <label className="setting-label">Theme</label>
                <div className="theme-options">
                  {([['dark','Dark',Moon],['light','Light',Sun],['system','System',Monitor]] as const).map(([v,l,Icon]) => (
                    <button key={v} className={`theme-option ${state.theme === v ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_THEME', theme: v })}>
                      <Icon size={16} /><span>{l}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent color */}
              <div className="setting-group">
                <label className="setting-label">Accent color</label>
                <div className="accent-color-row">
                  {ACCENT_PRESETS.map(c => (
                    <button key={c} className={`accent-swatch ${settings.accentColor === c ? 'selected' : ''}`}
                      style={{ background: c }} onClick={() => updateSetting({ accentColor: c })} />
                  ))}
                  <input type="color" value={settings.accentColor} onChange={e => updateSetting({ accentColor: e.target.value })} className="accent-custom-input" title="Custom color" />
                </div>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="settings-panel">
              <h2 className="settings-panel-title">Account</h2>

              <div className="setting-group">
                <label className="setting-label">Display name</label>
                <div className="setting-input-row">
                  <input className="modal-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" />
                  <button className="btn-primary" onClick={saveProfile} disabled={profileLoading}>
                    {profileLoading ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
                    Save
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label className="setting-label">Username</label>
                <p className="setting-value-display">@{user?.username}</p>
              </div>

              {user?.hasGoogle && (
                <div className="setting-info-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Signed in with Google
                </div>
              )}

              <div className="setting-group">
                <label className="setting-label">Change password</label>
                <div className="password-change-form">
                  <input className="modal-input" type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="Current password" />
                  <input className="modal-input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password (min. 6 chars)" />
                  <button className="btn-primary" onClick={savePassword} disabled={pwdLoading}>
                    {pwdLoading ? <Loader2 size={12} className="spin" /> : <Lock size={12} />}
                    Update password
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'danger' && (
            <div className="settings-panel">
              <h2 className="settings-panel-title" style={{ color: '#ef4444' }}>Danger zone</h2>
              <div className="danger-card">
                <div>
                  <p className="danger-card-title">Reset all settings</p>
                  <p className="danger-card-sub">Restore editor and appearance settings to their defaults.</p>
                </div>
                <button className="btn-danger-outline" onClick={() => { dispatch({ type: 'UPDATE_SETTINGS', settings: DEFAULT_SETTINGS }); toast('Settings reset', 'info'); }}>
                  Reset settings
                </button>
              </div>
              <div className="danger-card">
                <div>
                  <p className="danger-card-title">Sign out</p>
                  <p className="danger-card-sub">You can sign back in any time.</p>
                </div>
                <button className="btn-danger-outline" onClick={() => { logout(); close(); }}>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Backdrop>
  );
}
