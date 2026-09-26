import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastTone = 'success' | 'info' | 'warning' | 'critical';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs?: number;
}

interface ToastContextType {
  showToast: (message: string, tone?: ToastTone, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  warning: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info', durationMs = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastItem = { id, message, tone, durationMs };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Keep maximum 4 concurrent toasts

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string, d?: number) => showToast(msg, 'success', d), [showToast]);
  const info = useCallback((msg: string, d?: number) => showToast(msg, 'info', d), [showToast]);
  const warning = useCallback((msg: string, d?: number) => showToast(msg, 'warning', d), [showToast]);
  const error = useCallback((msg: string, d?: number) => showToast(msg, 'critical', d), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, info, warning, error }}>
      {children}

      {/* Floating Toast Portal */}
      <aside
        id="toast-notification-portal"
        aria-live="polite"
        aria-label="Notification center"
        className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((toast) => {
          let toneStyles = 'bg-slate-900/95 border-slate-800 text-white';
          let icon = 'fas fa-info-circle text-blue-400';

          if (toast.tone === 'success') {
            toneStyles = 'bg-slate-900/95 border-emerald-500/40 text-white';
            icon = 'fas fa-circle-check text-emerald-400';
          } else if (toast.tone === 'warning') {
            toneStyles = 'bg-slate-900/95 border-amber-500/40 text-white';
            icon = 'fas fa-triangle-exclamation text-amber-400';
          } else if (toast.tone === 'critical') {
            toneStyles = 'bg-slate-900/95 border-rose-500/40 text-white';
            icon = 'fas fa-circle-exclamation text-rose-400';
          }

          return (
            <div
              key={toast.id}
              id={toast.id}
              role="status"
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-fade-in ${toneStyles}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <i className={`${icon} text-base shrink-0`}></i>
                <p className="text-xs sm:text-sm font-medium leading-snug break-words">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-slate-400 hover:text-white p-1 transition-colors shrink-0"
              >
                <i className="fas fa-xmark text-xs"></i>
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
