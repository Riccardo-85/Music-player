import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { cn } from "@/lib/cn";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function genId() {
  return crypto.randomUUID();
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = genId();
    setToasts((prev) => [{ ...t, id }, ...prev].slice(0, 4));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = window.setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 3500);
    return () => window.clearTimeout(t);
  }, [toasts]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg border bg-card p-3 shadow-soft",
              t.variant === "success" && "border-primary/40",
              t.variant === "error" && "border-destructive/40"
            )}
            role="status"
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.description ? (
              <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


