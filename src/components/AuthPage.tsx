import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react';
import { Eye, EyeOff, ArrowRight, Loader2, User, Lock, Mail, Chrome } from 'lucide-react';

/* ── Mouse-tracking animated blob characters ── */
function FloatingChar({ x, y, delay, size, color, shape }: {
  x: number; y: number; delay: number; size: number; color: string; shape: 'blob1'|'blob2'|'blob3'|'blob4'; key?: any;
}) {
  const shapes = {
    blob1: 'M60,-45 C72,-20 68,20 50,45 C32,70 -5,75 -35,60 C-65,45 -78,10 -68,-25 C-58,-60 -25,-85 12,-82 C49,-79 48,-70 60,-45Z',
    blob2: 'M55,-30 C70,0 65,40 42,62 C19,84 -18,80 -48,62 C-78,44 -88,12 -76,-18 C-64,-48 -40,-76 -10,-78 C20,-80 40,-60 55,-30Z',
    blob3: 'M45,-55 C60,-30 70,5 58,38 C46,71 12,88 -22,82 C-56,76 -80,47 -82,14 C-84,-19 -64,-55 -38,-72 C-12,-89 30,-80 45,-55Z',
    blob4: 'M50,-40 C65,-10 60,28 42,55 C24,82 -14,88 -42,72 C-70,56 -82,18 -74,-18 C-66,-54 -38,-88 -5,-88 C28,-88 35,-70 50,-40Z',
  };

  return (
    <motion.div
      className="auth-char"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      initial={{ opacity: 0, scale: 0, rotate: -30 }}
      animate={{
        opacity: [0, 1, 1, 0.8],
        scale: [0, 1.1, 1, 1],
        rotate: [0, 5, -3, 0],
        y: [0, -12, 0, -8, 0],
      }}
      transition={{
        delay,
        duration: 3,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      }}
    >
      <svg viewBox="-100 -100 200 200" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id={`grad-${shape}`} cx="35%" cy="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <path d={shapes[shape]} fill={color} />
        <path d={shapes[shape]} fill={`url(#grad-${shape})`} />
        {/* Eyes */}
        <circle cx="-20" cy="-10" r="10" fill="white" />
        <circle cx="20"  cy="-10" r="10" fill="white" />
        <circle cx="-17" cy="-8"  r="5"  fill="#1a1a2e" />
        <circle cx="23"  cy="-8"  r="5"  fill="#1a1a2e" />
        {/* Shine */}
        <circle cx="-14" cy="-11" r="2.5" fill="white" opacity="0.9" />
        <circle cx="26"  cy="-11" r="2.5" fill="white" opacity="0.9" />
      </svg>
    </motion.div>
  );
}

function MouseEyeChar({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const a  = Math.atan2(mouseY - cy, mouseX - cx) * (180 / Math.PI);
    setAngle(a);
  }, [mouseX, mouseY]);

  const eyeOffsetX = Math.cos((angle * Math.PI) / 180) * 4;
  const eyeOffsetY = Math.sin((angle * Math.PI) / 180) * 4;

  return (
    <motion.div
      ref={ref}
      className="auth-main-char"
      initial={{ scale: 0, opacity: 0, y: 40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
    >
      <svg viewBox="-120 -120 240 240" width="100%" height="100%">
        <defs>
          <radialGradient id="maingrad" cx="35%" cy="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Body */}
        <path d="M65,-35 C80,-5 75,40 52,65 C29,90 -10,90 -40,72 C-70,54 -85,15 -75,-20 C-65,-55 -35,-85 0,-88 C35,-91 50,-65 65,-35Z" fill="var(--accent)" />
        <path d="M65,-35 C80,-5 75,40 52,65 C29,90 -10,90 -40,72 C-70,54 -85,15 -75,-20 C-65,-55 -35,-85 0,-88 C35,-91 50,-65 65,-35Z" fill="url(#maingrad)" />
        {/* Eyes */}
        <circle cx="-22" cy="-15" r="16" fill="white" filter="url(#glow)" />
        <circle cx="22"  cy="-15" r="16" fill="white" filter="url(#glow)" />
        <motion.circle cx={-22 + eyeOffsetX} cy={-15 + eyeOffsetY} r="8" fill="#0f0f11" animate={{ cx: -22 + eyeOffsetX, cy: -15 + eyeOffsetY }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
        <motion.circle cx={22  + eyeOffsetX} cy={-15 + eyeOffsetY} r="8" fill="#0f0f11" animate={{ cx:  22 + eyeOffsetX, cy: -15 + eyeOffsetY }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
        <circle cx={-18 + eyeOffsetX * 0.5} cy={-18 + eyeOffsetY * 0.5} r="3.5" fill="white" />
        <circle cx={ 26 + eyeOffsetX * 0.5} cy={-18 + eyeOffsetY * 0.5} r="3.5" fill="white" />
        {/* Smile */}
        <path d="M-18 20 Q0 36 18 20" stroke="rgba(255,255,255,0.7)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

/* ── Input field ── */
function AuthInput({ label, icon: Icon, type = 'text', value, onChange, placeholder, error, autoFocus }: {
  label: string; icon: any; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; error?: string; autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      <div className={`auth-input-wrap ${focused ? 'focused' : ''} ${error ? 'error' : ''}`}>
        <Icon size={14} className="auth-input-icon" />
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="auth-input"
          autoComplete={isPassword ? 'current-password' : type === 'email' ? 'email' : 'username'}
        />
        {isPassword && (
          <button type="button" className="auth-eye" tabIndex={-1} onClick={() => setShow(s => !s)}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {error && <p className="auth-field-error">{error}</p>}
    </div>
  );
}

/* ── Main AuthPage ── */
export function AuthPage() {
  const [mode, setMode]       = useState<'login' | 'register'>(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('mode') === 'register' ? 'register' : 'login';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const err = params.get('error');
    if (err === 'google_denied') setGlobalError('Google sign-in was cancelled.');
    if (err === 'google_failed') setGlobalError('Google sign-in failed. Please try again.');
  }, [params]);

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!username.trim())       e.username = 'Username is required';
    if (username.length < 2)    e.username = 'At least 2 characters';
    if (!password)              e.password = 'Password is required';
    if (password.length < 6)    e.password = 'At least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setGlobalError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password, displayName || undefined);
      }
      navigate('/');
    } catch (err: any) {
      setGlobalError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [mode, username, password, displayName, login, register, navigate]);

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setErrors({}); setGlobalError(''); setUsername(''); setPassword(''); setDisplayName('');
  };

  const charConfig = [
    { x: 4,  y: 8,  delay: 0.0, size: 100, color: '#8b5cf6', shape: 'blob1' as const },
    { x: 82, y: 5,  delay: 0.3, size: 80,  color: '#10b981', shape: 'blob2' as const },
    { x: 88, y: 72, delay: 0.6, size: 90,  color: '#3b82f6', shape: 'blob3' as const },
    { x: 2,  y: 70, delay: 0.9, size: 85,  color: '#ef4444', shape: 'blob4' as const },
    { x: 45, y: 2,  delay: 0.5, size: 65,  color: '#f97316', shape: 'blob1' as const },
    { x: 42, y: 88, delay: 0.8, size: 70,  color: '#ec4899', shape: 'blob2' as const },
  ];

  return (
    <div className="auth-page">
      {/* Background grid */}
      <div className="auth-bg-grid" />
      {/* Gradient orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      {/* Floating characters */}
      {charConfig.map((c, i) => <FloatingChar key={i} x={c.x} y={c.y} delay={c.delay} size={c.size} color={c.color} shape={c.shape} />)}

      {/* Card */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
      >
        {/* Left: Main character */}
        <div className="auth-card-left">
          <MouseEyeChar mouseX={mousePos.x} mouseY={mousePos.y} />
          <motion.div className="auth-brand-text"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <h1>Scribe</h1>
            <p>Write beautifully.</p>
          </motion.div>
          {/* Mini floating chars on left panel */}
          <motion.div className="auth-panel-char auth-panel-char-1"
            animate={{ y: [0,-8,0], rotate:[0,5,-3,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
            <svg viewBox="-40 -40 80 80" width="52" height="52">
              <path d="M25,-15 C35,0 32,20 20,30 C8,40 -10,38 -22,26 C-34,14 -36,-5 -28,-20 C-20,-35 -5,-42 10,-38 C25,-34 15,-30 25,-15Z" fill="#f59e0b" />
              <circle cx="-8" cy="-5" r="6" fill="white"/><circle cx="8" cy="-5" r="6" fill="white"/>
              <circle cx="-6" cy="-4" r="3" fill="#1a1a2e"/><circle cx="10" cy="-4" r="3" fill="#1a1a2e"/>
            </svg>
          </motion.div>
          <motion.div className="auth-panel-char auth-panel-char-2"
            animate={{ y: [0,-6,0], rotate:[0,-4,3,0] }} transition={{ duration:2.5, repeat:Infinity, ease:'easeInOut', delay:1 }}>
            <svg viewBox="-40 -40 80 80" width="40" height="40">
              <path d="M20,-22 C32,-8 30,15 18,28 C6,41 -16,40 -26,26 C-36,12 -30,-10 -20,-24 C-10,-38 8,-36 20,-22Z" fill="#06b6d4" />
              <circle cx="-7" cy="-5" r="5" fill="white"/><circle cx="7" cy="-5" r="5" fill="white"/>
              <circle cx="-5" cy="-4" r="2.5" fill="#1a1a2e"/><circle cx="9" cy="-4" r="2.5" fill="#1a1a2e"/>
            </svg>
          </motion.div>
        </div>

        {/* Right: Form */}
        <div className="auth-card-right">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              className="auth-form-wrap"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
            >
              <div className="auth-form-header">
                <h2>{mode === 'login' ? 'Welcome back!' : 'Create account'}</h2>
                <p>{mode === 'login' ? 'Sign in to continue writing.' : 'Start your writing journey.'}</p>
              </div>

              {globalError && (
                <motion.div className="auth-global-error"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                  {globalError}
                </motion.div>
              )}

              <form onSubmit={submit} className="auth-form">
                {mode === 'register' && (
                  <AuthInput
                    label="Display name"
                    icon={User}
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="How should we call you?"
                    error={errors.displayName}
                    autoFocus
                  />
                )}

                <AuthInput
                  label="Username"
                  icon={User}
                  value={username}
                  onChange={setUsername}
                  placeholder={mode === 'login' ? 'Your username' : 'Choose a username'}
                  error={errors.username}
                  autoFocus={mode === 'login'}
                />

                <AuthInput
                  label="Password"
                  icon={Lock}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={mode === 'login' ? 'Your password' : 'Min. 6 characters'}
                  error={errors.password}
                />

                <motion.button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading
                    ? <Loader2 size={16} className="spin" />
                    : <>
                        <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                        <ArrowRight size={15} />
                      </>
                  }
                </motion.button>
              </form>

              <div className="auth-divider"><span>or</span></div>

              <motion.a
                href="/api/auth/google"
                className="auth-google-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </motion.a>

              <p className="auth-switch">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                {' '}
                <button type="button" className="auth-switch-btn" onClick={switchMode}>
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
