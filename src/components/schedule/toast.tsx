"use client";

import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export type ToastKind = "info" | "error";

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

/** Shows a transient message above the schedule surface. */
export function useToast() {
  return useContext(ToastContext);
}

function ToastMessage({ message, kind }: { message: string; kind: ToastKind }) {
  const present = useIsPresent();
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden={!present || undefined}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : 4, transition: { duration: reduce ? 0 : 0.14 } }}
      transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`neu-panel max-w-sm rounded-xl px-4 py-2.5 text-sm font-medium ${
        kind === "error" ? "text-error" : "text-on-surface"
      }`}
    >
      {message}
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; kind: ToastKind }[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++nextId.current;
    setItems((prev) => [...prev.slice(-2), { id, message, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="app-notification-stack pointer-events-none fixed left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <ToastMessage key={t.id} message={t.message} kind={t.kind} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
