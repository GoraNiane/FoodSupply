"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  notify: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = React.useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-elevated",
              toast.type === "success" && "border-success-500/30",
              toast.type === "error" && "border-danger-500/30",
              toast.type === "info" && "border-navy-200"
            )}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
            )}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />}
            {toast.type === "info" && <Info className="h-5 w-5 shrink-0 text-navy-600" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy-900">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-slate-600">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded p-0.5 text-slate-400 hover:text-navy-900"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast doit être utilisé dans un ToastProvider");
  }
  return ctx;
}
