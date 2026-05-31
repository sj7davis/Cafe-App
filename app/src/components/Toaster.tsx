import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { setGlobalErrorToast } from '@/providers/trpc';

type ToastType = 'error' | 'success' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  errorToast: (message: string) => void;
  successToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _id = 0;

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  error:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', icon: '✕' },
  success: { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', icon: '✓' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', icon: '!' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', icon: 'i' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_id;
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
  }, [dismiss]);

  const errorToast = useCallback((message: string) => toast(message, 'error'), [toast]);
  const successToast = useCallback((message: string) => toast(message, 'success'), [toast]);

  // Register error toast with the global tRPC MutationCache so it can
  // surface errors from any mutation that doesn't define its own onError.
  useEffect(() => {
    setGlobalErrorToast(errorToast);
  }, [errorToast]);

  return (
    <ToastContext.Provider value={{ toast, errorToast, successToast }}>
      {children}

      {/* Toast stack — bottom-right on desktop, bottom-centre on mobile */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 360,
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type];
          return (
            <div
              key={t.id}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                pointerEvents: 'auto',
                animation: 'slideUp 0.2s ease',
              }}
            >
              {/* Icon */}
              <span style={{
                flexShrink: 0,
                width: 20, height: 20,
                borderRadius: '50%',
                background: c.text,
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                marginTop: 1,
              }}>
                {c.icon}
              </span>
              {/* Message */}
              <p style={{
                flex: 1,
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: '#09090B',
                fontFamily: 'Inter, -apple-system, sans-serif',
              }}>
                {t.message}
              </p>
              {/* Dismiss */}
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 0,
                  marginTop: 1,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/** Use inside any component to show toasts. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
