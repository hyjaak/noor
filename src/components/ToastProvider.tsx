"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useQuiet } from "./QuietProvider";

type Toast = { id: number; message: string; critical: boolean };
type ToastApi = { notify: (message: string, options?: { critical?: boolean }) => void };

const ToastContext = createContext<ToastApi>({ notify: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

// Noor's own in-app notifications. Non-critical ones are suppressed --
// no sound, no badge, no toast -- while a prayer silence window is active.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { quiet } = useQuiet();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const notify = useCallback(
    (message: string, options?: { critical?: boolean }) => {
      const critical = options?.critical ?? false;
      if (quiet && !critical) return;
      const id = ++idRef.current;
      setToasts((current) => [...current, { id, message, critical }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4000);
    },
    [quiet],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={toast.critical ? "toast toast-critical" : "toast"} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
