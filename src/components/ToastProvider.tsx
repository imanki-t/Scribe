import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast { id: string; message: string; type: ToastType; }

interface ToastContextType { toast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextType>(null!);
export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COLORS = {
  success: '#10b981',
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                className="toast-item"
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{ '--toast-color': COLORS[t.type] } as any}
              >
                <Icon size={14} style={{ color: COLORS[t.type], flexShrink: 0 }} />
                <span>{t.message}</span>
                <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
