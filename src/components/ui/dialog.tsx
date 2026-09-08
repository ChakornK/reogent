"use client";

import { Heading } from "@/src/components/ui/heading";
import { useOverlayPresence } from "@/src/components/ui/use-overlay-presence";
import { createContext, useContext, useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const DialogPanelContext = createContext<React.MutableRefObject<HTMLElement | null> | null>(null);

interface DialogRootProps {
  children: ReactNode;
  onDismiss: () => void;
  backdropLabel: string;
  dismissDisabled?: boolean;
  placement?: "center" | "mobile-sheet";
}

/** Portals a modal, traps focus, inerts the page, and restores the exact trigger. */
export function DialogRoot({
  children,
  onDismiss,
  backdropLabel,
  dismissDisabled = false,
  placement = "center",
}: DialogRootProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const present = useOverlayPresence(panelRef, "dialog");
  useOverlayPresence(backdropRef, "fade");
  const dismissRef = useRef(onDismiss);
  const disabledRef = useRef(dismissDisabled);
  dismissRef.current = onDismiss;
  disabledRef.current = dismissDisabled;

  useEffect(() => {
    if (!present) return;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;
    const activePanel: HTMLElement = panel;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const siblingStates = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
      .map((element) => ({ element, inert: element.inert }));

    document.body.style.overflow = "hidden";
    for (const { element } of siblingStates) element.inert = true;
    (activePanel.querySelector<HTMLElement>("[data-dialog-initial-focus]") ?? activePanel).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || overlay?.inert || activePanel.closest("[inert]")) return;
      if (event.key === "Escape") {
        if (disabledRef.current) return;
        event.preventDefault();
        dismissRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...activePanel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) {
        event.preventDefault();
        activePanel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !activePanel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !activePanel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const { element, inert } of siblingStates) element.inert = inert;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [present]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      data-dialog-root
      data-exiting={!present || undefined}
      inert={!present || undefined}
      aria-hidden={!present || undefined}
      className={`fixed inset-0 z-50 flex justify-center ${
        placement === "mobile-sheet"
          ? "items-end px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          : "items-center p-4"
      }`}
    >
      <button
        ref={backdropRef}
        type="button"
        tabIndex={-1}
        aria-label={backdropLabel}
        disabled={dismissDisabled}
        onClick={() => dismissRef.current()}
        className="bg-scrim absolute inset-0"
      />
      <DialogPanelContext.Provider value={panelRef}>{children}</DialogPanelContext.Provider>
    </div>,
    document.body,
  );
}

const PANEL_SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
} as const;

type SharedPanelProps = {
  size?: keyof typeof PANEL_SIZE_CLASSES;
  padding?: "default" | "none";
};

type DivPanelProps = ComponentPropsWithoutRef<"div"> & SharedPanelProps & { as?: "div" };
type FormPanelProps = ComponentPropsWithoutRef<"form"> & SharedPanelProps & { as: "form" };

/** Renders a bounded modal div or form. Contained headers and scrollers use padding="none". */
export function DialogPanel(props: DivPanelProps | FormPanelProps) {
  const panelRef = useContext(DialogPanelContext);
  if (!panelRef) throw new Error("DialogPanel must be rendered inside DialogRoot");

  const { as = "div", size = "md", padding = "default", className, ...panelProps } = props;
  const classes = `neu-panel bg-surface relative min-h-0 w-full rounded-2xl [:where(&)]:max-h-full [:where(&)]:overflow-y-auto ${PANEL_SIZE_CLASSES[size]} ${padding === "default" ? "p-4 sm:p-6" : "p-0"} ${className ?? ""}`;

  if (as === "form") {
    return (
      <form
        ref={panelRef as React.MutableRefObject<HTMLFormElement | null>}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={classes}
        {...(panelProps as ComponentPropsWithoutRef<"form">)}
      />
    );
  }

  return (
    <div
      ref={panelRef as React.MutableRefObject<HTMLDivElement | null>}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className={classes}
      {...(panelProps as ComponentPropsWithoutRef<"div">)}
    />
  );
}

type DialogHeaderProps = Omit<ComponentPropsWithoutRef<"header">, "title" | "children"> & {
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  leading?: ReactNode;
  closeAction?: ReactNode;
};

/** Aligns a modal title, supporting copy, and caller-owned close action. */
export function DialogHeader({
  title,
  titleId,
  description,
  leading,
  closeAction,
  className,
  ...props
}: DialogHeaderProps) {
  return (
    <header data-dialog-header className={`flex shrink-0 items-start gap-3 ${className ?? ""}`} {...props}>
      {leading ? <span className="flex h-6 shrink-0 items-center">{leading}</span> : null}
      <div className="min-w-0 flex-1">
        <Heading id={titleId}>{title}</Heading>
        {description ? <p className="text-muted text-body-sm mt-1 leading-5">{description}</p> : null}
      </div>
      {closeAction ? <div className="shrink-0">{closeAction}</div> : null}
    </header>
  );
}

type DialogActionsProps = ComponentPropsWithoutRef<"div"> & {
  layout?: "inline" | "stack";
  spacing?: "section" | "none";
};

/** Aligns modal actions with a shared section gap or inside an already-padded footer. */
export function DialogActions({ layout = "inline", spacing = "section", className, ...props }: DialogActionsProps) {
  return (
    <div
      data-dialog-actions
      className={`flex gap-2 ${spacing === "section" ? "mt-6" : ""} ${
        layout === "stack" ? "flex-col-reverse sm:flex-row sm:justify-end" : "flex-wrap items-center justify-end"
      } ${className ?? ""}`}
      {...props}
    />
  );
}
