import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { Collaborator, DEFAULT_SETTINGS, Folder, Note, Settings, SortKey, Tag, Theme } from '../types';
import { useAuth } from './AuthContext';

interface AppState {
  notes:             Note[];
  folders:           Folder[];
  tags:              Tag[];
  activeNoteId:      string | null;
  activeFolderId:    string | null | 'all' | 'pinned' | 'favorites';
  loading:           boolean;
  sidebarOpen:       boolean;
  searchOpen:        boolean;
  settingsOpen:      boolean;
  folderModalOpen:   boolean;
  folderModalTarget: Folder | null;
  moveNoteOpen:      boolean;
  moveNoteTarget:    string | null;
  shareModalOpen:    boolean;
  shareNoteTarget:   string | null;
  versionModalOpen:  boolean;
  versionNoteTarget: string | null;
  wsConnected:       boolean;
  collaborators:     Collaborator[];
  sortKey:           SortKey;
  sortDir:           'asc' | 'desc';
  theme:             Theme;
  settings:          Settings;
  focusMode:         boolean;
  error:             string | null;
}

type Action =
  | { type: 'SET_LOADING';         loading: boolean }
  | { type: 'SET_NOTES';           notes: Note[] }
  | { type: 'ADD_NOTE';            note: Note }
  | { type: 'UPDATE_NOTE';         note: Note }
  | { type: 'DELETE_NOTE';         id: string }
  | { type: 'SET_FOLDERS';         folders: Folder[] }
  | { type: 'ADD_FOLDER';          folder: Folder }
  | { type: 'UPDATE_FOLDER';       folder: Folder }
  | { type: 'DELETE_FOLDER';       id: string }
  | { type: 'SET_TAGS';            tags: Tag[] }
  | { type: 'SET_ACTIVE_NOTE';     id: string | null }
  | { type: 'SET_ACTIVE_FOLDER';   id: string | null | 'all' | 'pinned' | 'favorites' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR';         open: boolean }
  | { type: 'SET_SEARCH_OPEN';     open: boolean }
  | { type: 'SET_SETTINGS_OPEN';   open: boolean }
  | { type: 'SET_FOLDER_MODAL';    open: boolean; folder?: Folder | null }
  | { type: 'SET_MOVE_NOTE';       open: boolean; noteId?: string | null }
  | { type: 'SET_SHARE_MODAL';     open: boolean; noteId?: string | null }
  | { type: 'SET_VERSION_MODAL';   open: boolean; noteId?: string | null }
  | { type: 'SET_WS_CONNECTED';    connected: boolean }
  | { type: 'SET_COLLABORATORS';   collaborators: Collaborator[] }
  | { type: 'ADD_COLLABORATOR';    collaborator: Collaborator }
  | { type: 'REMOVE_COLLABORATOR'; userId: string }
  | { type: 'SET_SORT';            key: SortKey; dir: 'asc' | 'desc' }
  | { type: 'SET_THEME';           theme: Theme }
  | { type: 'UPDATE_SETTINGS';     settings: Partial<Settings> }
  | { type: 'TOGGLE_FOCUS'; }
  | { type: 'SET_ERROR';           error: string | null };

const THEME_KEY    = 'scribe_theme';
const SETTINGS_KEY = 'scribe_settings';
const SORT_KEY     = 'scribe_sort';

function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return DEFAULT_SETTINGS; }
}

function loadTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) || 'dark';
}

function loadSort(): { key: SortKey; dir: 'asc' | 'desc' } {
  try { return JSON.parse(localStorage.getItem(SORT_KEY) || '{"key":"updatedAt","dir":"desc"}'); }
  catch { return { key: 'updatedAt', dir: 'desc' }; }
}

const initialState: AppState = {
  notes: [], folders: [], tags: [],
  activeNoteId: null, activeFolderId: 'all',
  loading: true,
  sidebarOpen: window.innerWidth >= 768,
  searchOpen: false, settingsOpen: false,
  folderModalOpen: false, folderModalTarget: null,
  moveNoteOpen: false, moveNoteTarget: null,
  shareModalOpen: false, shareNoteTarget: null,
  versionModalOpen: false, versionNoteTarget: null,
  wsConnected: false, collaborators: [],
  sortKey: loadSort().key, sortDir: loadSort().dir,
  theme: loadTheme(), settings: loadSettings(),
  focusMode: false, error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':      return { ...state, loading: action.loading };
    case 'SET_NOTES':        return { ...state, notes: action.notes };
    case 'ADD_NOTE':         return { ...state, notes: [action.note, ...state.notes] };
    case 'UPDATE_NOTE':      return { ...state, notes: state.notes.map(n => n._id === action.note._id ? action.note : n) };
    case 'DELETE_NOTE':      return { ...state, notes: state.notes.filter(n => n._id !== action.id), activeNoteId: state.activeNoteId === action.id ? null : state.activeNoteId };
    case 'SET_FOLDERS':      return { ...state, folders: action.folders };
    case 'ADD_FOLDER':       return { ...state, folders: [...state.folders, action.folder] };
    case 'UPDATE_FOLDER':    return { ...state, folders: state.folders.map(f => f._id === action.folder._id ? action.folder : f) };
    case 'DELETE_FOLDER':    return { ...state, folders: state.folders.filter(f => f._id !== action.id), activeFolderId: state.activeFolderId === action.id ? 'all' : state.activeFolderId };
    case 'SET_TAGS':         return { ...state, tags: action.tags };
    case 'SET_ACTIVE_NOTE':  return { ...state, activeNoteId: action.id };
    case 'SET_ACTIVE_FOLDER':return { ...state, activeFolderId: action.id, activeNoteId: null };
    case 'TOGGLE_SIDEBAR':   return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':      return { ...state, sidebarOpen: action.open };
    case 'SET_SEARCH_OPEN':  return { ...state, searchOpen: action.open };
    case 'SET_SETTINGS_OPEN':return { ...state, settingsOpen: action.open };
    case 'SET_FOLDER_MODAL': return { ...state, folderModalOpen: action.open, folderModalTarget: action.folder ?? null };
    case 'SET_MOVE_NOTE':    return { ...state, moveNoteOpen: action.open, moveNoteTarget: action.noteId ?? null };
    case 'SET_SHARE_MODAL':  return { ...state, shareModalOpen: action.open, shareNoteTarget: action.noteId ?? null };
    case 'SET_VERSION_MODAL':return { ...state, versionModalOpen: action.open, versionNoteTarget: action.noteId ?? null };
    case 'SET_WS_CONNECTED': return { ...state, wsConnected: action.connected };
    case 'SET_COLLABORATORS':return { ...state, collaborators: action.collaborators };
    case 'ADD_COLLABORATOR': return { ...state, collaborators: [...state.collaborators.filter(c => c.userId !== action.collaborator.userId), action.collaborator] };
    case 'REMOVE_COLLABORATOR': return { ...state, collaborators: state.collaborators.filter(c => c.userId !== action.userId) };
    case 'SET_SORT':
      localStorage.setItem(SORT_KEY, JSON.stringify({ key: action.key, dir: action.dir }));
      return { ...state, sortKey: action.key, sortDir: action.dir };
    case 'SET_THEME':
      localStorage.setItem(THEME_KEY, action.theme);
      return { ...state, theme: action.theme };
    case 'UPDATE_SETTINGS':
      const newSettings = { ...state.settings, ...action.settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      return { ...state, settings: newSettings };
    case 'TOGGLE_FOCUS':  return { ...state, focusMode: !state.focusMode };
    case 'SET_ERROR':     return { ...state, error: action.error };
    default: return state;
  }
}

interface AppContextType {
  state:       AppState;
  dispatch:    React.Dispatch<Action>;
  createNote:  (data?: Partial<Note>) => Promise<Note | null>;
  updateNote:  (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote:  (id: string) => Promise<void>;
  createFolder:(data: { name: string; color: string; parentId?: string | null }) => Promise<void>;
  updateFolder:(id: string, data: Partial<Folder>) => Promise<void>;
  deleteFolder:(id: string) => Promise<void>;
  refreshAll:  () => Promise<void>;
}

const AppContext = createContext<AppContextType>(null!);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user } = useAuth();
  const navigate = useNavigate();
  const saveTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme = state.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : state.theme;
    root.setAttribute('data-theme', resolvedTheme);
    root.style.setProperty('--accent', state.settings.accentColor);
  }, [state.theme, state.settings.accentColor]);

  // Socket setup
  useEffect(() => {
    if (!user) return;
    socket.setUserName(user.displayName || user.username);
    socket.connect();
    const unConn  = socket.on('connected',    () => dispatch({ type: 'SET_WS_CONNECTED', connected: true }));
    const unDisc  = socket.on('disconnected', () => dispatch({ type: 'SET_WS_CONNECTED', connected: false }));
    const unJoin  = socket.on('peer_joined',  (msg) => dispatch({ type: 'ADD_COLLABORATOR', collaborator: { userId: msg.userId, userName: msg.userName, color: msg.color } }));
    const unLeave = socket.on('peer_left',    (msg) => dispatch({ type: 'REMOVE_COLLABORATOR', userId: msg.userId }));
    const unPeers = socket.on('peers',        (msg) => dispatch({ type: 'SET_COLLABORATORS', collaborators: msg.peers }));
    const unUpd   = socket.on('note_update',  (msg) => {
      dispatch({ type: 'UPDATE_NOTE', note: { ...state.notes.find(n => n._id === state.activeNoteId)!, title: msg.title, content: msg.content, tags: msg.tags } as Note });
    });
    return () => { [unConn, unDisc, unJoin, unLeave, unPeers, unUpd].forEach(fn => fn()); socket.disconnect(); };
  }, [user?.id]);

  // Sync URL to active folder on initial load / navigation
  useEffect(() => {
    const path = window.location.pathname;
    const folderMatch = path.match(/^\/folder\/([^/]+)/);
    const tagMatch    = path.match(/^\/tag\/([^/]+)/);
    if (folderMatch)       dispatch({ type: 'SET_ACTIVE_FOLDER', id: folderMatch[1] });
    else if (path === '/pinned')    dispatch({ type: 'SET_ACTIVE_FOLDER', id: 'pinned' });
    else if (path === '/favorites') dispatch({ type: 'SET_ACTIVE_FOLDER', id: 'favorites' });
    else if (!folderMatch && !tagMatch) dispatch({ type: 'SET_ACTIVE_FOLDER', id: 'all' });
  }, []);

  // Initial load
  const refreshAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const [notes, folders, tags] = await Promise.all([api.notes.listAll(), api.folders.list(), api.tags()]);
      dispatch({ type: 'SET_NOTES',   notes });
      dispatch({ type: 'SET_FOLDERS', folders });
      dispatch({ type: 'SET_TAGS',    tags });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, []);

  useEffect(() => { if (user) refreshAll(); }, [user?.id]);

  const createNote = useCallback(async (data: Partial<Note> = {}) => {
    try {
      const note = await api.notes.create({ title: 'Untitled Note', content: '', ...data });
      dispatch({ type: 'ADD_NOTE', note });
      dispatch({ type: 'SET_ACTIVE_NOTE', id: note._id });
      navigate(`/note/${note._id}`);
      return note;
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message });
      return null;
    }
  }, [navigate]);

  const updateNote = useCallback(async (id: string, data: Partial<Note>) => {
    try {
      // Optimistic update immediately
      const existing = state.notes.find(n => n._id === id);
      if (existing) dispatch({ type: 'UPDATE_NOTE', note: { ...existing, ...data } });
      // Debounced API call
      clearTimeout(saveTimeout.current[id]);
      saveTimeout.current[id] = setTimeout(async () => {
        try {
          const updated = await api.notes.update(id, data);
          dispatch({ type: 'UPDATE_NOTE', note: updated });
          // Broadcast via WS if content changed
          if (data.content !== undefined || data.title !== undefined) {
            socket.sendNoteUpdate(updated.title, data.content || '', updated.tags);
          }
        } catch {}
      }, state.settings.autosaveDelay);
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message });
    }
  }, [state.notes, state.settings.autosaveDelay]);

  const deleteNote = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_NOTE', id });
    navigate('/');
    try { await api.notes.delete(id); } catch { await refreshAll(); }
  }, [navigate, refreshAll]);

  const createFolder = useCallback(async (data: { name: string; color: string; parentId?: string | null }) => {
    try {
      const folder = await api.folders.create(data);
      dispatch({ type: 'ADD_FOLDER', folder });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message });
    }
  }, []);

  const updateFolder = useCallback(async (id: string, data: Partial<Folder>) => {
    try {
      const folder = await api.folders.update(id, data);
      dispatch({ type: 'UPDATE_FOLDER', folder });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message });
    }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_FOLDER', id });
    try { await api.folders.delete(id); await refreshAll(); } catch { await refreshAll(); }
  }, [refreshAll]);

  return (
    <AppContext.Provider value={{ state, dispatch, createNote, updateNote, deleteNote, createFolder, updateFolder, deleteFolder, refreshAll }}>
      {children}
    </AppContext.Provider>
  );
}
