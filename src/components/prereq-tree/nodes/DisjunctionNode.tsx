"use client";

import { Icon } from "@/src/components/icons";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, Position, useStore, type NodeProps } from "reactflow";

/** One branch in a disjunction (an `Or` AST node child), flattened for display
 *  via `displayExpr` — every option is listed, including nested And/Or branches. */
export interface DisjunctionOption {
  display: string;
  /** Whether this option resolves to a course code (drives upstream expansion)
   *  vs. a literal like "3rd-year standing" (no edges when selected). */
  isCode: boolean;
}

/** Resolved detail of the currently-selected dropdown option. The dropdown
 *  block IS the selected course's node in the graph (dropdown absorption), so
 *  this row carries what a course node would: title, or the literal text. */
export type DisjunctionDetail =
  { kind: "course"; code: string; title: string | null } | { kind: "literal"; text: string } | null;

export interface DisjunctionData {
  options: DisjunctionOption[];
  selectedIdx: number;
  onChange: (idx: number) => void;
  detail: DisjunctionDetail;
}

export interface EitherOrOption {
  /** Letter label parsed off the source ("a", "b", …); empty when unlabeled. */
  label: string;
  display: string;
}

export interface EitherOrData {
  options: EitherOrOption[];
  selectedIdx: number;
  onChange: (idx: number) => void;
}

// Handles on all four sides so prereq edges attach left/right and coreq chain
// edges top/bottom. Visually hidden.
const HIDDEN_HANDLE = {
  opacity: 0,
  width: 8,
  height: 8,
  border: "none",
  background: "transparent",
  pointerEvents: "none",
} as const;

function FourHandles() {
  return (
    <>
      <Handle type="target" id="right-target" position={Position.Right} style={HIDDEN_HANDLE} />
      <Handle type="target" id="top-target" position={Position.Top} style={HIDDEN_HANDLE} />
      <Handle type="source" id="left-source" position={Position.Left} style={HIDDEN_HANDLE} />
      <Handle type="source" id="bottom-source" position={Position.Bottom} style={HIDDEN_HANDLE} />
    </>
  );
}

/** `Or` node rendered "one of A, B, C" (REQ-9.1). Custom dropdown — not
 *  `<select>` — so the open menu lives inside the node's transformed
 *  container and inherits the canvas zoom (native popups escape the
 *  transform). */
export function DropdownDisjunctionNode({ id, data }: NodeProps<DisjunctionData>) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const { options, selectedIdx, onChange, detail } = data;
  const current = options[selectedIdx]?.display ?? "—";

  // Close on canvas pan or zoom so the menu stays within the measured graph bounds.
  const transform = useStore((s) => s.transform);
  const lastTransform = useRef(transform);
  const zoom = transform[2];
  useEffect(() => {
    if (lastTransform.current !== transform) {
      if (open) setOpen(false);
      lastTransform.current = transform;
    }
  }, [transform, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = menuRef.current;
    const panel = optionsRef.current;
    const canvas = anchor?.closest(".react-flow");
    if (!anchor || !panel || !canvas) return;
    function measure() {
      if (!anchor || !panel || !canvas) return;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.max(0, bounds.width - 16);
      const below = Math.max(0, bounds.bottom - rect.bottom - 8 - 4 * zoom);
      const above = Math.max(0, rect.top - bounds.top - 8 - 4 * zoom);
      const height = Math.min(200 * zoom, panel.scrollHeight * zoom);
      const flip = height > below && above > below;
      const available = flip ? above : below;
      const panelWidth = Math.min(panel.getBoundingClientRect().width, width);
      const left = Math.max(bounds.left + 8, Math.min(rect.left, bounds.right - 8 - panelWidth));
      setMenuStyle({
        left: (left - rect.left) / zoom,
        top: flip ? -(Math.min(height, available) / zoom + 4) : rect.height / zoom + 4,
        maxWidth: width / zoom,
        minWidth: Math.min(160, width / zoom),
        maxHeight: Math.min(200, available / zoom),
      });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [open, zoom]);

  // Outside-pointerdown + Escape dismiss (REQ-20.6). Capture-phase
  // pointerdown so ReactFlow's pan handler can't preventDefault the
  // synthesized event first; plain keydown for Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Bump the node wrapper's z-index while open so the menu paints over
  // sibling nodes (each `.react-flow__node` is its own stacking context).
  useEffect(() => {
    if (!open) return;
    const nodeEl = menuRef.current?.closest(".react-flow__node") as HTMLElement | null;
    if (!nodeEl) return;
    const prev = nodeEl.style.zIndex;
    nodeEl.style.zIndex = "1000";
    return () => {
      nodeEl.style.zIndex = prev;
    };
  }, [open]);

  return (
    <section
      data-node-id={id}
      data-variant="dropdown"
      className="neu-raised bg-tertiary-container text-on-tertiary-container border-border relative min-w-[140px] rounded-lg border px-3 py-2"
    >
      <FourHandles />
      <div className="text-xs tracking-wide uppercase opacity-70">one of</div>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-controls={open ? menuId : undefined}
          aria-expanded={open}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="neu-inset focus-visible:ring-primary/40 bg-surface text-on-surface mt-1 flex w-full items-center gap-1 rounded-md px-2 py-1 text-left font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-1"
        >
          <span className="min-w-0 flex-1 truncate">{current}</span>
          <Icon
            name="down"
            size={14}
            className={`text-on-surface-variant shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div
            ref={optionsRef}
            id={menuId}
            role="listbox"
            aria-label="Prerequisite options"
            style={menuStyle}
            // `nowheel` is ReactFlow's built-in opt-out: wheel events inside
            // this element reach the menu's `overflow:auto` instead of
            // turning into canvas zoom (REQ-9.1).
            className="nowheel neu-raised bg-surface text-on-surface absolute top-full left-0 z-10 max-h-[200px] min-w-[160px] overflow-auto rounded-lg p-1"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {options.map((opt, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: options are positional — selection is by index and the list never reorders.
                key={i}
                type="button"
                role="option"
                aria-selected={i === selectedIdx}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(i);
                  setOpen(false);
                }}
                className={`focus-visible:ring-primary/40 block w-full rounded px-2 py-1 text-left text-sm focus-visible:ring-2 focus-visible:ring-offset-1 ${
                  i === selectedIdx ? "bg-accent-subtle text-primary" : "hover:bg-surface-container-high"
                }`}
              >
                {opt.display}
              </button>
            ))}
          </div>
        )}
      </div>
      {detail && (
        <div
          className={`border-border mt-1.5 border-t pt-1.5 text-xs leading-snug ${
            detail.kind === "literal" || detail.title === null
              ? "text-on-tertiary-container/70 italic"
              : "text-on-tertiary-container/80"
          }`}
        >
          {detail.kind === "course" ? (detail.title ?? "(not in calendar)") : detail.text}
        </div>
      )}
    </section>
  );
}

/** `Or` node rendered "Either (a) … or (b) …" (REQ-9.2). Radio-style stacked
 *  options: selected row is raised, unselected rows dimmed. Selecting a row
 *  triggers a graph rebuild so the upstream subtree reflects the choice. */
export function StackedDisjunctionNode({ id, data }: NodeProps<EitherOrData>) {
  const { options, selectedIdx, onChange } = data;
  return (
    <section
      data-node-id={id}
      data-variant="stacked"
      className="neu-raised bg-tertiary-container text-on-tertiary-container border-border min-w-[160px] rounded-lg border px-3 py-2"
    >
      <FourHandles />
      <div className="text-xs tracking-wide uppercase opacity-70">either</div>
      <div className="mt-1 flex flex-col gap-1">
        {options.map((opt, i) => {
          const isSelected = i === selectedIdx;
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: options are positional — selection is by index and the list never reorders.
              key={i}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onChange(i)}
              className={`flex items-start gap-2 rounded-md border px-2 py-1 text-left ${
                isSelected
                  ? "neu-raised border-border-subtle bg-surface text-on-surface"
                  : "border-transparent opacity-45"
              }`}
            >
              {opt.label && <span className="text-on-surface-variant shrink-0 text-xs font-medium">({opt.label})</span>}
              <span className="text-sm leading-tight">{opt.display}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
