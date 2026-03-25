import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Minus, Eye, Edit2, Pin, Copy, Check, Maximize2,
  Minimize2, Image, Download, X, Star, Share2, Clock,
  Type, AlignLeft, ChevronDown, Loader2, BookOpen,
  Hash, Plus, Sparkles, FileText,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../context/AppContext';
import { socket } from '../services/socket';
import { api } from '../services/api';
import { ViewMode, Note, NOTE_TEMPLATES } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from './ToastProvider';

/* ── Helpers ── */
const NOTE_COLORS = [null,'#f59e0b','#ef4444','#10b981','#3b82f6','#8b5cf6','#f97316','#06b6d4','#ec4899'];

const H1Icon = () => <span style={{ fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>H1</span>;
const H2Icon = () => <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>H2</span>;
const H3Icon = () => <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>H3</span>;
const PinSVG = ({ filled }: { filled: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22"/>
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
  </svg>
);

function getGreeting(): { greeting: string; sub: string } {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { greeting: 'Good morning',   sub: 'What will you write today?' };
  if (h >= 12 && h < 17) return { greeting: 'Good afternoon', sub: 'Keep the momentum going.' };
  if (h >= 17 && h < 21) return { greeting: 'Good evening',   sub: 'Reflect and write freely.' };
  return                         { greeting: 'Good night',     sub: 'Write before you sleep.' };
}

/* ── Tag input ── */
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = useCallback(() => {
    const t = input.trim().toLowerCase().replace(/[^a-z0-9\-_]/g,'');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  }, [input, tags, onChange]);
  const remove = useCallback((tag: string) => onChange(tags.filter(t => t !== tag)), [tags, onChange]);

  return (
    <div className="tag-input-area">
      <Hash size={10} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
      {tags.map(tag => (
        <span key={tag} className="tag-pill">
          {tag}
          <button onClick={() => remove(tag)} className="tag-pill-remove"><X size={8} /></button>
        </span>
      ))}
      <input
        value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1]);
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? 'Add tags…' : ''}
        className="tag-input"
      />
    </div>
  );
}

/* ── Home screen ── */
function HomeScreen() {
  const { state, createNote } = useApp();
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [stats, setStats]             = useState<any>(null);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [templateOpen, setTemplateOpen]  = useState(false);
  const navigate = useNavigate();
  const { greeting, sub } = getGreeting();

  useEffect(() => {
    api.notes.recent().then(n => { setRecentNotes(n); setLoadingRecent(false); }).catch(() => setLoadingRecent(false));
    api.stats().then(setStats).catch(() => {});
  }, [state.notes.length]);

  const handleTemplate = async (templateKey: string) => {
    const tpl = NOTE_TEMPLATES[templateKey];
    const note = await createNote({ content: tpl.content, title: tpl.label !== 'Blank' ? tpl.label : 'Untitled Note', template: templateKey });
    if (note) navigate(`/note/${note._id}`);
    setTemplateOpen(false);
  };

  return (
    <div className="home-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 640 }}
      >
        {/* Greeting */}
        <div className="home-greeting">
          <h1 className="home-greeting-text">{greeting}</h1>
          <p className="home-greeting-sub">{sub}</p>
        </div>

        {/* Stats row */}
        {stats && (
          <motion.div className="home-stats-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="home-stat">
              <span className="home-stat-value">{stats.noteCount}</span>
              <span className="home-stat-label">Notes</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <span className="home-stat-value">{(stats.totalWords || 0).toLocaleString()}</span>
              <span className="home-stat-label">Words written</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <span className="home-stat-value">{stats.streak || 0}</span>
              <span className="home-stat-label">Day streak 🔥</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <span className="home-stat-value">{stats.readingTime || 0}m</span>
              <span className="home-stat-label">Read time</span>
            </div>
          </motion.div>
        )}

        {/* Quick create */}
        <div className="home-quick-create">
          <motion.button className="home-new-btn" onClick={() => createNote()}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Plus size={16} /> New note
          </motion.button>
          <div className="home-template-wrap">
            <motion.button className="home-template-btn" onClick={() => setTemplateOpen(o => !o)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Sparkles size={14} /> From template <ChevronDown size={12} />
            </motion.button>
            <AnimatePresence>
              {templateOpen && (
                <motion.div className="template-dropdown"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.15 }}>
                  {Object.entries(NOTE_TEMPLATES).map(([key, tpl]) => (
                    <button key={key} className="template-item" onClick={() => handleTemplate(key)}>
                      <span className="template-icon">{tpl.icon}</span>
                      <span>{tpl.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Recent notes */}
        {recentNotes.length > 0 && (
          <motion.div className="home-recent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <p className="home-section-label">Recent</p>
            <div className="home-recent-list">
              {recentNotes.map(note => (
                <motion.button key={note._id} className="home-recent-item"
                  onClick={() => navigate(`/note/${note._id}`)}
                  whileHover={{ x: 3 }}>
                  <div className="home-recent-left">
                    {note.color && <div className="home-recent-dot" style={{ background: note.color }} />}
                    <FileText size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
                    <span className="home-recent-title">{note.title || 'Untitled'}</span>
                  </div>
                  <span className="home-recent-date">
                    {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Toolbar button ── */
function ToolBtn({ onClick, title, active, children }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }) {
  return (
    <motion.button className={`toolbar-btn ${active ? 'active' : ''}`} onClick={onClick} title={title}
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
      {children}
    </motion.button>
  );
}

/* ── Main editor ── */
export function Editor() {
  const { noteId } = useParams<{ noteId: string }>();
  const { state, dispatch, updateNote, deleteNote } = useApp();
  const { toast } = useToast();
  const navigate  = useNavigate();

  const activeNote = noteId ? state.notes.find(n => n._id === noteId) || null : null;
  const [title, setTitle]     = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags]       = useState<string[]>([]);
  const [view, setView]       = useState<ViewMode>(state.settings.defaultView);
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readTime,  setReadTime]  = useState(0);
  const [shareInfo, setShareInfo] = useState<{isPublic: boolean; shareToken: string | null} | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copyCheck, setCopyCheck] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const contentRef = useRef(content);

  // Sync note into local state
  useEffect(() => {
    if (!activeNote) return;
    setTitle(activeNote.title || '');
    setContent(activeNote.content || '');
    setTags(activeNote.tags || []);
    setShareInfo({ isPublic: activeNote.isPublic, shareToken: activeNote.shareToken });
    setView(state.settings.defaultView);
    dispatch({ type: 'SET_ACTIVE_NOTE', id: activeNote._id });
    socket.joinNote(activeNote._id);
    return () => { socket.leaveNote(); };
  }, [noteId]);

  // Word/char count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars  = content.length;
    setWordCount(content.trim() ? words : 0);
    setCharCount(chars);
    setReadTime(Math.max(1, Math.ceil(words / 200)));
    contentRef.current = content;
  }, [content]);

  // Autosave
  const saveNote = useCallback((t: string, c: string, tgs: string[]) => {
    if (!activeNote) return;
    setSaving(true);
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await updateNote(activeNote._id, { title: t, content: c, tags: tgs });
      setSaving(false); setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }, state.settings.autosaveDelay);
  }, [activeNote, updateNote, state.settings.autosaveDelay]);

  const handleTitle = useCallback((v: string) => {
    setTitle(v); saveNote(v, contentRef.current, tags);
  }, [saveNote, tags]);

  const handleContent = useCallback((v: string) => {
    setContent(v); saveNote(title, v, tags);
  }, [saveNote, title, tags]);

  const handleTags = useCallback((t: string[]) => {
    setTags(t); saveNote(title, contentRef.current, t);
  }, [saveNote, title]);

  // Tab key in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart, end = ta.selectionEnd;
      const spaces = ' '.repeat(state.settings.tabSize);
      const next = content.slice(0, start) + spaces + content.slice(end);
      setContent(next);
      saveNote(title, next, tags);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + spaces.length; }, 0);
    }
  }, [content, state.settings.tabSize, title, tags, saveNote]);

  // Toolbar actions
  const wrap = useCallback((before: string, after = before) => {
    const ta = textareaRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = content.slice(s, e);
    const next = content.slice(0, s) + before + sel + after + content.slice(e);
    handleContent(next);
    setTimeout(() => { ta.selectionStart = s + before.length; ta.selectionEnd = e + before.length; ta.focus(); }, 0);
  }, [content, handleContent]);

  const insertLine = useCallback((prefix: string) => {
    const ta = textareaRef.current; if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = content.lastIndexOf('\n', s - 1) + 1;
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart);
    handleContent(next);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + prefix.length; ta.focus(); }, 0);
  }, [content, handleContent]);

  // Export as markdown
  const exportMd = useCallback(() => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || 'note').replace(/[^a-z0-9]/gi,'-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Exported as Markdown', 'success');
  }, [title, content, toast]);

  // Image upload
  const handleImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !activeNote) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(',')[1];
      try {
        const { url } = await api.notes.addImage(activeNote._id, b64, file.type, file.name);
        const md = `\n![${file.name}](${url})\n`;
        handleContent(content + md);
        toast('Image uploaded', 'success');
      } catch { toast('Image upload failed', 'error'); }
    };
    reader.readAsDataURL(file);
  }, [activeNote, content, handleContent, toast]);

  // Share
  const handleShare = useCallback(async (enable: boolean) => {
    if (!activeNote) return;
    setShareLoading(true);
    try {
      const info = await api.notes.share(activeNote._id, enable);
      setShareInfo(info);
      updateNote(activeNote._id, { isPublic: info.isPublic, shareToken: info.shareToken });
      toast(enable ? 'Link sharing enabled' : 'Link sharing disabled', 'success');
    } catch { toast('Failed to update sharing', 'error'); }
    finally { setShareLoading(false); }
  }, [activeNote, updateNote, toast]);

  const copyShareLink = useCallback(() => {
    if (!shareInfo?.shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/shared/${shareInfo.shareToken}`);
    setCopyCheck(true);
    setTimeout(() => setCopyCheck(false), 2000);
    toast('Link copied!', 'success');
  }, [shareInfo, toast]);

  // Focus mode - typewriter scroll
  const { focusMode } = state;
  useEffect(() => {
    if (!state.settings.typewriterMode || !textareaRef.current) return;
    const ta = textareaRef.current;
    const handler = () => {
      const lineH = parseInt(getComputedStyle(ta).lineHeight) || 24;
      const lines  = ta.value.slice(0, ta.selectionStart).split('\n').length;
      ta.scrollTop = Math.max(0, (lines - 5) * lineH);
    };
    ta.addEventListener('keyup', handler);
    return () => ta.removeEventListener('keyup', handler);
  }, [state.settings.typewriterMode]);

  if (!noteId) return <HomeScreen />;
  if (!activeNote) return (
    <div className="editor-empty">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <BookOpen size={36} style={{ opacity: 0.15 }} />
        <p>Note not found</p>
        <button className="btn-ghost" onClick={() => navigate('/')}>← Go home</button>
      </motion.div>
    </div>
  );

  const fontFamilyMap: Record<string, string> = {
    jakarta: 'var(--font-sans)',
    mono:    'var(--font-mono)',
    serif:   'var(--font-serif)',
    cursive: 'cursive',
  };

  return (
    <motion.div
      className={`editor-root ${focusMode ? 'focus-mode' : ''}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Editor toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          {/* Format tools */}
          <ToolBtn onClick={() => wrap('**')} title="Bold (Ctrl+B)"><Bold size={13} /></ToolBtn>
          <ToolBtn onClick={() => wrap('*')} title="Italic (Ctrl+I)"><Italic size={13} /></ToolBtn>
          <ToolBtn onClick={() => wrap('~~')} title="Strikethrough"><Strikethrough size={13} /></ToolBtn>
          <ToolBtn onClick={() => wrap('`')} title="Inline code"><Code size={13} /></ToolBtn>
          <div className="toolbar-sep" />
          <ToolBtn onClick={() => insertLine('# ')} title="Heading 1"><H1Icon /></ToolBtn>
          <ToolBtn onClick={() => insertLine('## ')} title="Heading 2"><H2Icon /></ToolBtn>
          <ToolBtn onClick={() => insertLine('### ')} title="Heading 3"><H3Icon /></ToolBtn>
          <div className="toolbar-sep" />
          <ToolBtn onClick={() => insertLine('- ')} title="Bullet list"><List size={13} /></ToolBtn>
          <ToolBtn onClick={() => insertLine('1. ')} title="Numbered list"><ListOrdered size={13} /></ToolBtn>
          <ToolBtn onClick={() => insertLine('> ')} title="Quote"><Quote size={13} /></ToolBtn>
          <ToolBtn onClick={() => insertLine('- [ ] ')} title="Task"><Check size={13} /></ToolBtn>
          <ToolBtn onClick={() => handleContent(content + '\n---\n')} title="Divider"><Minus size={13} /></ToolBtn>
          <div className="toolbar-sep" />
          <label className="toolbar-btn" title="Upload image" style={{ cursor: 'pointer' }}>
            <Image size={13} />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
          </label>
          <div className="toolbar-sep" />
          {/* Color picker */}
          <div className="color-picker-wrap">
            <button className="toolbar-btn color-btn" onClick={() => setColorPickerOpen(o => !o)} title="Note color">
              <div className="color-dot" style={{ background: activeNote.color || 'var(--fg-muted)' }} />
            </button>
            <AnimatePresence>
              {colorPickerOpen && (
                <motion.div className="color-picker-menu"
                  initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.12 }}>
                  {NOTE_COLORS.map((c, i) => (
                    <button key={i} className={`color-swatch ${activeNote.color === c ? 'selected' : ''}`}
                      style={{ background: c || 'var(--bg-3)' }}
                      onClick={() => { updateNote(activeNote._id, { color: c }); setColorPickerOpen(false); }} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="toolbar-right">
          {/* Save status */}
          <AnimatePresence mode="wait">
            {saving && (
              <motion.span key="saving" className="save-status saving"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={10} className="spin" /> Saving…
              </motion.span>
            )}
            {saved && !saving && (
              <motion.span key="saved" className="save-status saved"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Check size={10} /> Saved
              </motion.span>
            )}
          </AnimatePresence>

          {/* Actions */}
          <ToolBtn onClick={() => updateNote(activeNote._id, { isPinned: !activeNote.isPinned })} active={activeNote.isPinned} title={activeNote.isPinned ? 'Unpin' : 'Pin note'}>
            <PinSVG filled={activeNote.isPinned} />
          </ToolBtn>
          <ToolBtn onClick={() => updateNote(activeNote._id, { isFavorite: !activeNote.isFavorite })} active={activeNote.isFavorite} title="Favorite">
            <Star size={13} />
          </ToolBtn>

          {/* Share */}
          <div className="share-wrap">
            <ToolBtn onClick={() => setShareModalOpen(o => !o)} title="Share note" active={activeNote.isPublic}>
              <Share2 size={13} />
            </ToolBtn>
            <AnimatePresence>
              {shareModalOpen && (
                <motion.div className="share-panel"
                  initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
                  <div className="share-panel-header">
                    <Share2 size={13} />
                    <span>Share note</span>
                    <button onClick={() => setShareModalOpen(false)} style={{ marginLeft: 'auto' }}><X size={12} /></button>
                  </div>
                  <div className="share-toggle-row">
                    <div>
                      <p className="share-toggle-label">Public link</p>
                      <p className="share-toggle-sub">{shareInfo?.isPublic ? 'Anyone with the link can view' : 'Only you can see this note'}</p>
                    </div>
                    <button
                      className={`share-toggle-btn ${shareInfo?.isPublic ? 'on' : ''}`}
                      onClick={() => handleShare(!shareInfo?.isPublic)}
                      disabled={shareLoading}
                    >
                      {shareLoading ? <Loader2 size={12} className="spin" /> : null}
                    </button>
                  </div>
                  {shareInfo?.isPublic && shareInfo.shareToken && (
                    <div className="share-link-row">
                      <input readOnly value={`${window.location.origin}/shared/${shareInfo.shareToken}`} className="share-link-input" />
                      <button className="share-copy-btn" onClick={copyShareLink}>
                        {copyCheck ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Version history */}
          <ToolBtn onClick={() => dispatch({ type: 'SET_VERSION_MODAL', open: true, noteId: activeNote._id })} title="Version history">
            <Clock size={13} />
          </ToolBtn>

          {/* Export */}
          <ToolBtn onClick={exportMd} title="Export as Markdown">
            <Download size={13} />
          </ToolBtn>

          <div className="toolbar-sep" />

          {/* View mode */}
          <div className="view-mode-group">
            {([['edit','Edit',Edit2],['split','Split',AlignLeft],['preview','Preview',Eye]] as const).map(([v, label, Icon]) => (
              <button key={v} className={`view-mode-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v as ViewMode)} title={label}>
                <Icon size={11} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Title & meta */}
      <div className="editor-meta">
        {activeNote.color && <div className="editor-color-strip" style={{ background: activeNote.color }} />}
        <textarea
          className="editor-title-input"
          value={title}
          onChange={e => handleTitle(e.target.value)}
          placeholder="Note title…"
          rows={1}
          onInput={e => {
            const ta = e.target as HTMLTextAreaElement;
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); textareaRef.current?.focus(); } }}
        />
        <div className="editor-submeta">
          <TagInput tags={tags} onChange={handleTags} />
          {state.settings.showWordCount && (
            <div className="editor-stats">
              <span>{wordCount} words</span>
              <span className="meta-sep">·</span>
              <span>{charCount} chars</span>
              <span className="meta-sep">·</span>
              <span>~{readTime} min read</span>
              {(activeNote.versionCount || 0) > 0 && (
                <>
                  <span className="meta-sep">·</span>
                  <span>{activeNote.versionCount} {activeNote.versionCount === 1 ? 'version' : 'versions'}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className={`editor-content-wrap ${view}`}>
        {(view === 'edit' || view === 'split') && (
          <textarea
            ref={textareaRef}
            className={`editor-textarea ${focusMode ? 'focus-mode-textarea' : ''}`}
            value={content}
            onChange={e => handleContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start writing… (Markdown supported)"
            spellCheck={state.settings.spellCheck}
            style={{
              fontSize:    state.settings.fontSize,
              lineHeight:  state.settings.lineHeight,
              fontFamily:  fontFamilyMap[state.settings.fontFamily] || 'var(--font-sans)',
            }}
          />
        )}
        {(view === 'preview' || view === 'split') && (
          <div className="editor-preview prose">
            <h1 className="preview-title">{title || 'Untitled'}</h1>
            <Markdown remarkPlugins={[remarkGfm]}>{content || '*Start writing to see a preview…*'}</Markdown>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="editor-bottom-bar">
        <span className="editor-bottom-date">
          Last edited {formatDistanceToNow(new Date(activeNote.updatedAt), { addSuffix: true })}
          {' · '}Created {format(new Date(activeNote.createdAt), 'MMM d, yyyy')}
        </span>
        {activeNote.isPublic && (
          <span className="editor-public-badge">
            <Share2 size={9} /> Public
          </span>
        )}
      </div>
    </motion.div>
  );
}
