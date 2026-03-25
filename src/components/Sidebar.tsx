import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pin, Folder, FolderPlus, MoreHorizontal, Trash2, Edit2, Move,
  ChevronRight, ChevronDown, Tag, SortAsc, SortDesc, FileText,
  Plus, Star, Inbox, Hash, BookOpen, TrendingUp, Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Note, SortKey } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

function noteSnippet(content: string) {
  return content.replace(/#{1,6}\s/g,'').replace(/[*_`\[\]()>~]/g,'').trim().slice(0, 70);
}

/* ── Note context menu ── */
function NoteMenu({ noteId, isPinned, isFavorite, onClose }: { noteId: string; isPinned: boolean; isFavorite: boolean; onClose: () => void }) {
  const { updateNote, deleteNote, dispatch } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <motion.div ref={ref} className="ctx-menu"
      initial={{ opacity: 0, scale: 0.94, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.1 }}>
      <button className="ctx-item" onClick={() => { updateNote(noteId, { isPinned: !isPinned }); onClose(); }}>
        <Pin size={12} /> {isPinned ? 'Unpin' : 'Pin to top'}
      </button>
      <button className="ctx-item" onClick={() => { updateNote(noteId, { isFavorite: !isFavorite }); onClose(); }}>
        <Star size={12} /> {isFavorite ? 'Remove favorite' : 'Add to favorites'}
      </button>
      <button className="ctx-item" onClick={() => { dispatch({ type: 'SET_MOVE_NOTE', open: true, noteId }); onClose(); }}>
        <Move size={12} /> Move to folder
      </button>
      <button className="ctx-item" onClick={() => { dispatch({ type: 'SET_VERSION_MODAL', open: true, noteId }); onClose(); }}>
        <Clock size={12} /> Version history
      </button>
      <div className="ctx-sep" />
      <button className="ctx-item danger" onClick={() => { deleteNote(noteId); onClose(); }}>
        <Trash2 size={12} /> Delete note
      </button>
    </motion.div>
  );
}

/* ── Note row ── */
function NoteRow({ note, active }: { note: Note; active: boolean; key?: any }) {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      className={`note-row ${active ? 'active' : ''} ${note.isPinned ? 'pinned' : ''}`}
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      onClick={() => { dispatch({ type: 'SET_ACTIVE_NOTE', id: note._id }); navigate(`/note/${note._id}`); }}
    >
      {note.color && <div className="note-row-color" style={{ background: note.color }} />}
      <div className="note-row-body">
        <div className="note-row-header">
          <span className="note-row-title">{note.title || 'Untitled'}</span>
          <div className="note-row-actions">
            {note.isPinned   && <Pin  size={9}  style={{ color: 'var(--accent)', opacity: 0.7 }} />}
            {note.isFavorite && <Star size={9}  style={{ color: '#f59e0b', opacity: 0.8 }} />}
            {note.isPublic   && <div className="note-public-badge" title="Public" />}
            <button className="note-menu-btn" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}>
              <MoreHorizontal size={12} />
            </button>
          </div>
        </div>
        {note.content && <p className="note-row-snippet">{noteSnippet(note.content)}</p>}
        <div className="note-row-meta">
          {note.wordCount > 0 && <span>{note.wordCount}w</span>}
          <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
          {note.tags.length > 0 && <span className="note-row-tag">#{note.tags[0]}</span>}
        </div>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <NoteMenu noteId={note._id} isPinned={note.isPinned} isFavorite={note.isFavorite} onClose={() => setMenuOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Folder row ── */
function FolderRow({ folder, notes, activeNoteId, activeFolderId }: {
  folder: any; notes: Note[]; activeNoteId: string | null; activeFolderId: any; key?: any;
}) {
  const { dispatch, deleteFolder, updateFolder } = useApp();
  const [open, setOpen] = useState(activeFolderId === folder._id);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const folderNotes = notes.filter(n => n.folderId === folder._id);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="folder-group">
      <div className={`folder-row ${activeFolderId === folder._id ? 'active' : ''}`}
        onClick={() => { setOpen(o => !o); dispatch({ type: 'SET_ACTIVE_FOLDER', id: folder._id }); navigate(`/folder/${folder._id}`); }}>
        <div className="folder-row-left">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          <div className="folder-dot" style={{ background: folder.color }} />
          <span className="folder-row-name">{folder.name}</span>
          <span className="folder-count">{folder.noteCount || folderNotes.length}</span>
        </div>
        <div className="folder-row-actions" ref={ref}>
          <button className="note-menu-btn" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}>
            <MoreHorizontal size={12} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div className="ctx-menu"
                initial={{ opacity: 0, scale: 0.94, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.1 }}>
                <button className="ctx-item" onClick={() => { dispatch({ type: 'SET_FOLDER_MODAL', open: true, folder }); setMenuOpen(false); }}>
                  <Edit2 size={12} /> Edit folder
                </button>
                <div className="ctx-sep" />
                <button className="ctx-item danger" onClick={() => { deleteFolder(folder._id); setMenuOpen(false); }}>
                  <Trash2 size={12} /> Delete folder
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {open && folderNotes.length > 0 && (
          <motion.div className="folder-notes"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            {folderNotes.map(note => (
              <NoteRow key={note._id} note={note} active={activeNoteId === note._id} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sort control ── */
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updatedAt', label: 'Modified' },
  { key: 'createdAt', label: 'Created'  },
  { key: 'title',     label: 'Title'    },
  { key: 'wordCount', label: 'Words'    },
];

/* ── Main Sidebar ── */
export function Sidebar() {
  const { state, dispatch, createNote } = useApp();
  const { notes, folders, tags, activeNoteId, activeFolderId, sidebarOpen, sortKey, sortDir } = state;
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function sortedNotes(list: Note[]) {
    return [...list].sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (typeof va === 'string' && !isNaN(Date.parse(va))) { va = new Date(va).getTime(); vb = new Date(vb as string).getTime(); }
      if (sortKey === 'title') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      const dir = sortDir === 'asc' ? 1 : -1;
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }

  // Filtered notes for current view
  const visibleNotes = (() => {
    let list = notes;
    if (activeFolderId === 'pinned')    list = list.filter(n => n.isPinned);
    else if (activeFolderId === 'favorites') list = list.filter(n => n.isFavorite);
    else if (activeFolderId !== 'all')  list = list.filter(n => n.folderId === activeFolderId);
    return sortedNotes(list);
  })();

  const pinnedNotes   = visibleNotes.filter(n => n.isPinned   && (activeFolderId === 'all' || activeFolderId === 'pinned'));
  const unpinnedNotes = visibleNotes.filter(n => !n.isPinned  || (activeFolderId !== 'all' && activeFolderId !== 'pinned'));
  const unfolderedNotes = activeFolderId === 'all' ? sortedNotes(notes.filter(n => !n.folderId)) : [];

  if (!sidebarOpen) return null;

  return (
    <motion.aside
      className="scribe-sidebar"
      initial={false}
      animate={{ x: 0, opacity: 1 }}
    >
      {/* Nav */}
      <nav className="sidebar-nav">
        {[
          { id: 'all',       label: 'All Notes',  icon: Inbox,     count: notes.length,                         href: '/'          },
          { id: 'pinned',    label: 'Pinned',      icon: Pin,       count: notes.filter(n=>n.isPinned).length,   href: '/pinned'    },
          { id: 'favorites', label: 'Favorites',   icon: Star,      count: notes.filter(n=>n.isFavorite).length, href: '/favorites' },
        ].map(({ id, label, icon: Icon, count, href }) => (
          <button
            key={id}
            className={`sidebar-nav-item ${activeFolderId === id ? 'active' : ''}`}
            onClick={() => { dispatch({ type: 'SET_ACTIVE_FOLDER', id: id as any }); navigate(href); }}
          >
            <Icon size={13} />
            <span>{label}</span>
            {count > 0 && <span className="sidebar-count">{count}</span>}
          </button>
        ))}
      </nav>

      {/* Folders */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Folders</span>
          <button className="icon-btn-xs" title="New folder" onClick={() => dispatch({ type: 'SET_FOLDER_MODAL', open: true, folder: null })}>
            <FolderPlus size={12} />
          </button>
        </div>
        <div className="sidebar-folders">
          {folders.length === 0
            ? <p className="sidebar-empty-hint">No folders yet</p>
            : folders.map(f => <FolderRow key={f._id} folder={f} notes={notes} activeNoteId={activeNoteId} activeFolderId={activeFolderId} />)
          }
        </div>
      </div>

      {/* Tags */}
      {state.tags.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-header"><span>Tags</span></div>
          <div className="sidebar-tags">
            {state.tags.slice(0, 12).map(tag => (
              <button key={tag.name} className="sidebar-tag-pill" onClick={() => navigate(`/tag/${tag.name}`)}>
                <Hash size={9} /> {tag.name} <span className="tag-count">{tag.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-divider" />

      {/* Notes list header */}
      <div className="sidebar-notes-header">
        <span className="sidebar-notes-title">
          {activeFolderId === 'all' ? 'All notes' : activeFolderId === 'pinned' ? 'Pinned' : activeFolderId === 'favorites' ? 'Favorites' : folders.find(f=>f._id===activeFolderId)?.name || 'Notes'}
          <span className="sidebar-count ml-1">{visibleNotes.length}</span>
        </span>
        <div className="sidebar-notes-actions">
          {/* Sort */}
          <div className="sort-menu-wrap" ref={sortRef}>
            <button className="icon-btn-xs" onClick={() => setSortMenuOpen(o => !o)} title="Sort">
              {sortDir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />}
            </button>
            <AnimatePresence>
              {sortMenuOpen && (
                <motion.div className="sort-menu"
                  initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}>
                  {SORT_OPTIONS.map(({ key, label }) => (
                    <button key={key} className={`sort-item ${sortKey === key ? 'active' : ''}`}
                      onClick={() => { dispatch({ type: 'SET_SORT', key, dir: sortKey === key && sortDir === 'desc' ? 'asc' : 'desc' }); setSortMenuOpen(false); }}>
                      {label}
                      {sortKey === key && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="icon-btn-xs" title="New note" onClick={() => createNote()}>
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="sidebar-notes">
        {state.loading ? (
          <div className="sidebar-loading">
            {[1,2,3,4].map(i => <div key={i} className="note-skeleton" style={{ opacity: 1 - i*0.15 }} />)}
          </div>
        ) : visibleNotes.length === 0 ? (
          <motion.div className="sidebar-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BookOpen size={28} style={{ opacity: 0.2 }} />
            <p>No notes here</p>
            <button className="sidebar-empty-cta" onClick={() => createNote()}>
              <Plus size={12} /> Create one
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <>
                <p className="notes-section-label"><Pin size={9} /> Pinned</p>
                {pinnedNotes.map(note => <NoteRow key={note._id} note={note} active={activeNoteId === note._id} />)}
              </>
            )}
            {/* Folders (only in 'all' view) */}
            {activeFolderId === 'all' && folders.length > 0 && (
              <>
                <p className="notes-section-label"><Folder size={9} /> In folders</p>
                {folders.map(f => <FolderRow key={f._id} folder={f} notes={notes} activeNoteId={activeNoteId} activeFolderId={activeFolderId} />)}
              </>
            )}
            {/* Unfoldered notes */}
            {activeFolderId === 'all' && unfolderedNotes.length > 0 && (
              <>
                {folders.length > 0 && <p className="notes-section-label"><FileText size={9} /> Unfiled</p>}
                {unfolderedNotes.filter(n => !n.isPinned).map(note => <NoteRow key={note._id} note={note} active={activeNoteId === note._id} />)}
              </>
            )}
            {/* Normal list (non-all views) */}
            {activeFolderId !== 'all' && unpinnedNotes.map(note => <NoteRow key={note._id} note={note} active={activeNoteId === note._id} />)}
          </AnimatePresence>
        )}
      </div>
    </motion.aside>
  );
}
