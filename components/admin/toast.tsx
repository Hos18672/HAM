'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle, WarningCircle, Info } from '@phosphor-icons/react/dist/ssr';

export type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });

/**
 * Toasts for every outcome of an admin action.
 *
 * The region is `aria-live="polite"`, so a screen reader hears the result of a
 * save without the focus being moved away from whatever the editor was doing.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          insetBlockEnd: 'var(--space-4)',
          insetInlineEnd: 'var(--space-4)',
          zIndex: 'var(--z-toast)',
          display: 'grid',
          gap: 'var(--space-2)',
          maxInlineSize: 'min(24rem, calc(100vw - var(--space-6)))',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-start gap-2"
            style={{
              background: 'var(--color-bg)',
              border: `var(--rule-hair) solid ${
                toast.tone === 'error' ? 'var(--color-accent-2-500)' : 'var(--color-accent-500)'
              }`,
              borderInlineStartWidth: 'var(--rule-thick)',
              borderRadius: 'var(--radius-baseline)',
              boxShadow: 'var(--shadow-lg)',
              padding: 'var(--space-3)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {toast.tone === 'success' ? (
              <CheckCircle
                size={18}
                weight="duotone"
                aria-hidden="true"
                style={{ color: 'var(--color-accent)', flexShrink: 0 }}
              />
            ) : toast.tone === 'error' ? (
              <WarningCircle
                size={18}
                weight="duotone"
                aria-hidden="true"
                style={{ color: 'var(--color-accent-2)', flexShrink: 0 }}
              />
            ) : (
              <Info size={18} weight="duotone" aria-hidden="true" style={{ flexShrink: 0 }} />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
