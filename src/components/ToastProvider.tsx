"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";
type ToastInput = { message: string; type?: ToastType; duration?: number };
type ToastEntry = ToastInput & { id: number; type: ToastType };
type ToastContextValue = { notify: (toast: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

const styles: Record<ToastType, { panel: string; icon: string; symbol: string }> = {
  success: { panel: "border-emerald-200 bg-white text-emerald-950", icon: "bg-emerald-100 text-emerald-700", symbol: "✓" },
  error: { panel: "border-red-200 bg-white text-red-950", icon: "bg-red-100 text-red-700", symbol: "!" },
  warning: { panel: "border-amber-200 bg-white text-amber-950", icon: "bg-amber-100 text-amber-800", symbol: "!" },
  info: { panel: "border-blue-200 bg-white text-blue-950", icon: "bg-blue-100 text-blue-700", symbol: "i" },
};

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(({ message, type = "info", duration = 2500 }: ToastInput) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { id, message: trimmed, type, duration }]);
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, duration));
  }, []);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:top-4"
      >
        {toasts.map((toast) => {
          const style = styles[toast.type];
          return (
            <div
              key={toast.id}
              role={toast.type === "error" ? "alert" : "status"}
              aria-live={toast.type === "error" ? "assertive" : "polite"}
              className={`toast-enter pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-black/10 ${style.panel}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${style.icon}`} aria-hidden="true">
                {style.symbol}
              </span>
              <p className="min-w-0 flex-1 pt-0.5 text-sm font-medium leading-5">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-lg leading-none opacity-60 transition hover:bg-black/5 hover:opacity-100"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
