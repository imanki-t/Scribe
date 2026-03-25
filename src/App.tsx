import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import { AuthPage } from './components/AuthPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { SearchModal, FolderModal, MoveNoteModal, VersionModal, SettingsModal } from './components/Modals';

/* ── Shared page layout (editor, note by ID) ── */
function AppLayout() {
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const location = useLocation();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k')  { e.preventDefault(); dispatch({ type: 'SET_SEARCH_OPEN', open: !state.searchOpen }); }
      if ((e.metaKey || e.ctrlKey) && e.key === ',')   { e.preventDefault(); dispatch({ type: 'SET_SETTINGS_OPEN', open: !state.settingsOpen }); }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); dispatch({ type: 'TOGGLE_SIDEBAR' }); }
      if (e.key === 'Escape') {
        if (state.searchOpen)       dispatch({ type: 'SET_SEARCH_OPEN',   open: false });
        if (state.settingsOpen)     dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
        if (state.folderModalOpen)  dispatch({ type: 'SET_FOLDER_MODAL',  open: false });
        if (state.moveNoteOpen)     dispatch({ type: 'SET_MOVE_NOTE',     open: false });
        if (state.shareModalOpen)   dispatch({ type: 'SET_SHARE_MODAL',   open: false });
        if (state.versionModalOpen) dispatch({ type: 'SET_VERSION_MODAL', open: false });
        if (state.focusMode)        dispatch({ type: 'TOGGLE_FOCUS' });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); /* handled in AppContext */ }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, dispatch]);

  return (
    <div className={`app-layout ${state.focusMode ? 'focus-mode-layout' : ''}`}>
      <Header />
      <div className="app-body">
        <AnimatePresence initial={false}>
          {state.sidebarOpen && (
            <motion.div
              key="sidebar"
              className="sidebar-wrapper"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'var(--sidebar-width)', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="editor-area">
          <Routes>
            <Route path="/"                    element={<Editor />} />
            <Route path="/note/:noteId"        element={<Editor />} />
            <Route path="/folder/:folderId"    element={<FolderView />} />
            <Route path="/pinned"              element={<FolderView view="pinned" />} />
            <Route path="/favorites"           element={<FolderView view="favorites" />} />
            <Route path="/tag/:tagName"        element={<TagView />} />
            <Route path="*"                    element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <AnimatePresence>
        {state.searchOpen       && <SearchModal key="search" />}
        {state.folderModalOpen  && <FolderModal key="folder" />}
        {state.moveNoteOpen     && <MoveNoteModal key="move" />}
        {state.versionModalOpen && <VersionModal key="version" />}
        {state.settingsOpen     && <SettingsModal key="settings" />}
      </AnimatePresence>
    </div>
  );
}

/* ── Tag view — filters sidebar by tag, shows home screen ── */
function TagView() {
  const { tagName } = useParams<{ tagName: string }>();
  const { dispatch } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    // Reset folder to 'all' so notes list shows; tag filtering happens via URL
    dispatch({ type: 'SET_ACTIVE_FOLDER', id: 'all' });
  }, [tagName, dispatch]);

  return <Editor />;
}

/* ── Folder view — syncs URL param → app state, shows home/note area ── */
function FolderView({ view }: { view?: 'pinned' | 'favorites' }) {
  const { folderId } = useParams<{ folderId: string }>();
  const { dispatch } = useApp();

  useEffect(() => {
    const id = view ?? folderId ?? 'all';
    dispatch({ type: 'SET_ACTIVE_FOLDER', id: id as any });
  }, [folderId, view, dispatch]);

  return <Editor />;
}

/* ── Auth guard ── */
function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="splash-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="splash-inner"
        >
          <div className="splash-logo">✍️</div>
          <p className="splash-text">Scribe</p>
          <div className="splash-dots">
            {[0,1,2].map(i => (
              <motion.div key={i} className="splash-dot"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return <Navigate to="/app" replace state={{ from: location }} />;

  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}

/* ── Root app ── */
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AnimatePresence mode="wait">
          <Routes>
            {/* Auth route at /app */}
            <Route path="/app" element={<AuthPageWrapper />} />

            {/* Shared note public view */}
            <Route path="/shared/:token" element={<SharedNoteView />} />

            {/* Main app — all other routes */}
            <Route path="/*" element={<AuthGuard />} />
          </Routes>
        </AnimatePresence>
      </AuthProvider>
    </ToastProvider>
  );
}

/* ── Auth page wrapper (redirects if already logged in) ── */
function AuthPageWrapper() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && user) navigate('/', { replace: true }); }, [user, loading, navigate]);
  if (loading) return null;
  return <AuthPage />;
}

/* ── Public shared note view ── */
function SharedNoteView() {
  const { token } = { token: window.location.pathname.split('/shared/')[1] };
  const [note, setNote] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetch(`/api/shared/${token}`)
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setNote(data); })
      .catch(() => setError('Failed to load note'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="splash-screen"><div className="splash-inner"><div className="splash-dots">{[0,1,2].map(i=><motion.div key={i} className="splash-dot" animate={{scale:[1,1.4,1]}} transition={{duration:0.8,delay:i*0.15,repeat:Infinity}}/>)}</div></div></div>;
  if (error)   return <div className="shared-error"><div>📄</div><h2>Note not found</h2><p>{error}</p><a href="/app">Open Scribe</a></div>;

  return (
    <div className="shared-view">
      <header className="shared-header">
        <span className="shared-brand">✍️ Scribe</span>
        <a href="/app" className="shared-cta">Start writing free →</a>
      </header>
      <div className="shared-content">
        <h1 className="shared-title">{note.title}</h1>
        <p className="shared-meta">Shared via Scribe · Last updated {new Date(note.updatedAt).toLocaleDateString()}</p>
        <div className="shared-body prose">
          <React.Suspense fallback={<p>Loading…</p>}>
            <SharedMarkdown content={note.content} />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}

function SharedMarkdown({ content }: { content: string }) {
  const [Markdown, setMarkdown] = React.useState<any>(null);
  const [gfm, setGfm] = React.useState<any>(null);
  React.useEffect(() => {
    Promise.all([import('react-markdown'), import('remark-gfm')]).then(([md, g]) => {
      setMarkdown(() => md.default); setGfm(() => g.default);
    });
  }, []);
  if (!Markdown || !gfm) return <pre style={{ whiteSpace: 'pre-wrap' }}>{content}</pre>;
  return <Markdown remarkPlugins={[gfm]}>{content}</Markdown>;
}
