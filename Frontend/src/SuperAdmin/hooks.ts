/**
 * hooks.ts — SuperAdmin Custom Hooks
 * ===================================
 * Includes useDebouncedValue (400ms) for responsive, debounced searching,
 * and useToast for non-blocking UI notifications replacing window.alert.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { ToastItem } from './types';

/**
 * Debounce a rapidly changing value by a given delay in milliseconds.
 * Default delay is 400ms.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Toast management hook providing success, error, warning, and info toasts.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const item: ToastItem = { id, type, message, duration };
      setToasts((prev) => [...prev, item]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg: string, duration?: number) => addToast(msg, 'success', duration),
      error: (msg: string, duration?: number) => addToast(msg, 'error', duration || 5000),
      warning: (msg: string, duration?: number) => addToast(msg, 'warning', duration || 4500),
      info: (msg: string, duration?: number) => addToast(msg, 'info', duration),
    }),
    [addToast]
  );

  return { toasts, addToast, removeToast, toast };
}

/**
 * Toast Container component for rendering floating notifications in the corner of the screen.
 * Uses React.createElement so hooks.ts can remain pure TypeScript without requiring JSX compilation.
 */
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts || toasts.length === 0) return null;

  return React.createElement(
    'div',
    {
      className: 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none',
      'aria-live': 'polite',
    },
    toasts.map((t) => {
      const isSuccess = t.type === 'success';
      const isError = t.type === 'error';
      const isWarning = t.type === 'warning';

      const bgClass = isSuccess
        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
        : isError
        ? 'bg-red-950/90 border-red-500/40 text-red-200'
        : isWarning
        ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
        : 'bg-slate-900/90 border-slate-700 text-slate-200';

      const IconComponent = isSuccess
        ? CheckCircle
        : isError
        ? AlertCircle
        : isWarning
        ? AlertTriangle
        : Info;

      const iconColor = isSuccess
        ? 'text-emerald-400'
        : isError
        ? 'text-red-400'
        : isWarning
        ? 'text-amber-400'
        : 'text-sky-400';

      return React.createElement(
        'div',
        {
          key: t.id,
          role: 'alert',
          className: `pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-2 ${bgClass}`,
        },
        React.createElement(IconComponent, {
          className: `w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`,
        }),
        React.createElement(
          'div',
          {
            className: 'flex-1 text-sm font-medium leading-relaxed break-words',
          },
          t.message
        ),
        React.createElement(
          'button',
          {
            onClick: () => onDismiss(t.id),
            className: 'p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-white/10 transition flex-shrink-0',
            'aria-label': 'Close notification',
          },
          React.createElement(X, { className: 'w-4 h-4' })
        )
      );
    })
  );
}

