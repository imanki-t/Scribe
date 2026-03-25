import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Settings, PanelLeftClose, PanelLeftOpen, Plus,
  Wifi, WifiOff, Edit3, LogOut, User, Moon, Sun, Monitor,
  ChevronDown, Flame, FileText, Maximize2, Minimize2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';

function AvatarFallback({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#ec4899'];
  const color  = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'var(--font-sans)' }}>
      {initials}
    </div>
  );
}

export function Header() {
  const { state, dispatch, createNote } = useApp();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeOpen,   setThemeOpen]   = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false); setThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/app');
    toast('Signed out successfully', 'success');
  };

  const THEMES = [
    { value: 'dark',   label: 'Dark',   icon: Moon },
    { value: 'light',  label: 'Light',  icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  const activeNote = state.notes.find(n => n._id === state.activeNoteId);

  return (
    <header className="scribe-header">
      {/* Left */}
      <div className="header-left">
        <motion.button
          className="icon-btn header-sidebar-toggle"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          title={state.sidebarOpen ? 'Close sidebar (Ctrl+\\)' : 'Open sidebar (Ctrl+\\)'}
        >
          {state.sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </motion.button>

        {/* Brand */}
        <button className="header-brand" onClick={() => navigate('/')}>
          <Edit3 size={16} />
          <span>Scribe</span>
        </button>

        {/* Breadcrumb if note open */}
        <AnimatePresence>
          {activeNote && (
            <motion.div className="header-breadcrumb"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <span className="header-breadcrumb-sep">/</span>
              <span className="header-breadcrumb-title">{activeNote.title || 'Untitled'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right */}
      <div className="header-right">
        {/* WS status */}
        <div className={`ws-indicator ${state.wsConnected ? 'connected' : 'disconnected'}`} title={state.wsConnected ? 'Connected' : 'Reconnecting…'}>
          {state.wsConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
        </div>

        {/* Collaborators */}
        <AnimatePresence>
          {state.collaborators.length > 0 && (
            <motion.div className="collab-avatars" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {state.collaborators.slice(0, 4).map(c => (
                <motion.div key={c.userId} className="collab-avatar" style={{ background: c.color }} title={c.userName}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  {c.userName.slice(0, 1).toUpperCase()}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New note */}
        <motion.button className="header-new-btn" onClick={() => createNote()}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} title="New note (Ctrl+N)">
          <Plus size={14} />
          <span>New note</span>
        </motion.button>

        {/* Search */}
        <motion.button className="icon-btn" title="Search (Ctrl+K)"
          onClick={() => dispatch({ type: 'SET_SEARCH_OPEN', open: true })}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Search size={15} />
        </motion.button>

        {/* Focus mode */}
        {state.activeNoteId && (
          <motion.button className={`icon-btn ${state.focusMode ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_FOCUS' })}
            title="Focus mode" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {state.focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </motion.button>
        )}

        {/* Settings */}
        <motion.button className="icon-btn" title="Settings (Ctrl+,)"
          onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true })}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Settings size={15} />
        </motion.button>

        {/* Profile */}
        <div className="profile-menu-wrap" ref={profileRef}>
          <motion.button
            className="profile-trigger"
            onClick={() => { setProfileOpen(o => !o); setThemeOpen(false); }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          >
            {user?.avatar
              ? <img src={user.avatar} alt="" className="profile-avatar-img" />
              : <AvatarFallback name={user?.displayName || 'U'} />
            }
            <ChevronDown size={11} style={{ opacity: 0.5 }} />
          </motion.button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div className="profile-dropdown"
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}>

                {/* User info */}
                <div className="profile-dropdown-user">
                  {user?.avatar
                    ? <img src={user.avatar} alt="" className="profile-avatar-img" style={{ width: 32, height: 32 }} />
                    : <AvatarFallback name={user?.displayName || 'U'} size={32} />
                  }
                  <div>
                    <p className="profile-name">{user?.displayName || user?.username}</p>
                    <p className="profile-username">@{user?.username}</p>
                  </div>
                </div>

                {/* Streak + stats */}
                <div className="profile-stats-row">
                  <div className="profile-stat">
                    <Flame size={12} style={{ color: '#f59e0b' }} />
                    <span>{user?.streak || 0} day streak</span>
                  </div>
                  <div className="profile-stat">
                    <FileText size={12} />
                    <span>{(user?.totalWords || 0).toLocaleString()} words</span>
                  </div>
                </div>

                <div className="dropdown-sep" />

                {/* Theme picker */}
                <div className="profile-theme-row">
                  {THEMES.map(({ value, label, icon: Icon }) => (
                    <motion.button
                      key={value}
                      className={`theme-chip ${state.theme === value ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'SET_THEME', theme: value })}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    >
                      <Icon size={12} />
                      <span>{label}</span>
                    </motion.button>
                  ))}
                </div>

                <div className="dropdown-sep" />

                <button className="dropdown-item" onClick={() => { setProfileOpen(false); dispatch({ type: 'SET_SETTINGS_OPEN', open: true }); }}>
                  <Settings size={13} /> Account settings
                </button>
                <button className="dropdown-item danger" onClick={handleLogout}>
                  <LogOut size={13} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
