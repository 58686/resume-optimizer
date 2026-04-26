"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastItem = ToastInput & {
  id: number;
  tone: ToastTone;
};

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

function getToastStyles(tone: ToastTone) {
  switch (tone) {
    case "success":
      return { container: "border-emerald-200/60 bg-emerald-50/90 text-emerald-900", stripe: "bg-emerald-500" };
    case "error":
      return { container: "border-red-200/60 bg-red-50/90 text-red-900", stripe: "bg-red-500" };
    case "info":
    default:
      return { container: "border-zinc-800 glass-panel text-white", stripe: "bg-stone-400" };
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, description, tone = "info" }: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, title, description, tone }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, 3200);
    },
    [dismissToast]
  );

  const contextValue = useMemo(() => pushToast, [pushToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3"
      >
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.tone);
          return (
            <div
              key={toast.id}
              className={`animate-slide-in-right pointer-events-auto overflow-hidden rounded-2xl border shadow-lg backdrop-blur-md ${styles.container}`}
            >
              <div className="flex">
                {/* Left tone stripe */}
                <div className={`w-1 shrink-0 ${styles.stripe}`} />
                <div className="flex-1 px-4 py-3">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? <p className="mt-1 text-sm opacity-75">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="self-start px-3 pt-3 text-zinc-400 transition hover:text-zinc-300"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast 必须在 ToastProvider 内部使用。");
  }

  return context;
}
