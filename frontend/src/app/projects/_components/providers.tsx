'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { X } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  undo?: () => void;
}

interface ToastApi {
  toast: (message: string, opts?: { undo?: () => void }) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

function Toasts({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastApi['toast']>(
    (message, opts) => {
      const id = nextId.current++;
      setItems((cur) => [...cur.slice(-2), { id, message, undo: opts?.undo }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text">
            <span className="flex-1">{t.message}</span>
            {t.undo && (
              <button
                className="font-medium text-primary hover:underline"
                onClick={() => {
                  t.undo?.();
                  dismiss(t.id);
                }}
              >
                Undo
              </button>
            )}
            <button aria-label="Dismiss" className="text-muted hover:text-text" onClick={() => dismiss(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function PmProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: true, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Toasts>{children}</Toasts>
    </QueryClientProvider>
  );
}
