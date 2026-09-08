"use client";

import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type DisclosureProps = {
  open: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
};

function DisclosureBody({ children, id, className }: Omit<DisclosureProps, "open">) {
  const present = useIsPresent();
  const reduce = useReducedMotion();
  return (
    <motion.div
      id={id}
      data-disclosure
      inert={!present || undefined}
      aria-hidden={!present || undefined}
      className={`grid shrink-0 ${className ?? ""}`}
      initial={reduce ? false : { gridTemplateRows: "0fr", opacity: 0 }}
      animate={{ gridTemplateRows: "1fr", opacity: 1 }}
      exit={{ gridTemplateRows: "0fr", opacity: 0 }}
      transition={{ duration: reduce ? 0 : present ? 0.24 : 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </motion.div>
  );
}

/** Expands conditional inline content and keeps exiting controls inactive until collapse finishes. */
export function Disclosure({ open, ...props }: DisclosureProps) {
  return <AnimatePresence initial={false}>{open ? <DisclosureBody {...props} /> : null}</AnimatePresence>;
}
