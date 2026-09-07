"use client";

import type { CourseIndexEntry } from "@/app/api/course-index/route";
import { Icon } from "@/src/components/icons";
import { Button } from "@/src/components/ui/button";
import { parsePrereq } from "@/src/shared/prereq-ast";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useMemo, useState, type CSSProperties, type Ref } from "react";
import { CourseInfoPopup } from "./course-info-popup";
import { CoursePlacementSelect } from "./course-placement-select";
import { forwardPlannerDragActivator } from "./drag-activator";
import { usePlanner } from "./planner-store";
import type { BlockValidation } from "./validation";

interface CourseChipProps {
  code: string;
  entry: CourseIndexEntry | undefined;
  blockId?: string;
  validation?: BlockValidation;
  ghost?: boolean;
  onPlaced?: () => void;
  ref?: Ref<HTMLDivElement>;
  style?: CSSProperties;
  listeners?: DraggableSyntheticListeners;
}

/** Keeps course identity, metadata, and action slots stable across lookup, plan, and drag states. */
export function CourseChip({
  code,
  entry,
  blockId,
  validation,
  ghost = false,
  onPlaced,
  ref,
  style,
  listeners,
}: CourseChipProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [placing, setPlacing] = useState(false);
  const removeBlock = usePlanner((state) => state.removeBlock);
  const flashing = usePlanner((state) => state.flashBlockId === blockId);
  const prereqAst = useMemo(() => parsePrereq(entry?.prerequisite), [entry?.prerequisite]);
  const coreqAst = useMemo(() => parsePrereq(entry?.corequisite), [entry?.corequisite]);
  const invalid = validation?.ok === false;
  const issueCount = validation?.missing.length ?? 0;
  const title = entry?.title || code;

  function startDrag(event: React.MouseEvent | React.TouchEvent) {
    forwardPlannerDragActivator(event, listeners);
  }

  return (
    <>
      <div
        ref={ghost ? undefined : ref}
        style={ghost ? undefined : style}
        data-course-chip
        data-block-id={blockId}
        data-lookup-code={blockId ? undefined : code}
        inert={ghost || undefined}
        aria-hidden={ghost || undefined}
        onMouseDown={ghost ? undefined : startDrag}
        onTouchStart={ghost ? undefined : startDrag}
        className={`neu-raised bg-surface-container relative flex w-full min-w-0 shrink-0 cursor-grab touch-pan-y flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 font-sans select-none active:cursor-grabbing ${invalid ? "border-error" : "border-transparent"} ${flashing ? "planner-flash" : ""}`}
      >
        <div className="flex h-11 min-w-0 items-center gap-1 sm:h-8">
          <Button
            variant="ghost"
            size="compact"
            disabled={!entry}
            aria-label={
              invalid
                ? `Show ${code} details (${issueCount} placement issue${issueCount === 1 ? "" : "s"})`
                : `Show ${code} details`
            }
            onClick={
              ghost
                ? undefined
                : (event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setAnchorRect((current) => (current ? null : rect));
                  }
            }
            className={`min-w-0 flex-1 justify-start px-1 ${invalid ? "text-error" : "text-on-surface"}`}
          >
            <span className="truncate text-sm leading-5 font-medium" title={code}>
              {code}
            </span>
            <Icon name={invalid ? "alert" : "info"} size={12} className="shrink-0" />
          </Button>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="compact"
              aria-expanded={placing}
              onClick={ghost ? undefined : () => setPlacing((current) => !current)}
              className="w-14"
            >
              {blockId ? "Move" : "Add"}
            </Button>
            <Button
              variant="ghost"
              size="denseIcon"
              aria-label={`Remove ${code}`}
              aria-hidden={!blockId || undefined}
              disabled={!blockId}
              title={`Remove ${code}`}
              onClick={ghost || !blockId ? undefined : () => removeBlock(blockId)}
              className={`text-muted enabled:hover:bg-error-container enabled:hover:text-error ${blockId ? "" : "invisible"}`}
            >
              <Icon name="close" size={14} />
            </Button>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 leading-5">
          <span className="text-on-surface-variant text-body-sm min-w-0 flex-1 truncate" title={title}>
            {title}
          </span>
          <span className="text-muted w-9 shrink-0 text-right text-xs tabular-nums">
            {entry?.credits != null ? `${entry.credits} cr` : ""}
          </span>
        </div>
      </div>
      {placing && !ghost ? (
        <CoursePlacementSelect
          mode={blockId ? "move" : "add"}
          code={code}
          blockId={blockId}
          shadowOn="surface-container"
          onPlaced={() => {
            setPlacing(false);
            onPlaced?.();
          }}
        />
      ) : null}
      {anchorRect && entry && !ghost ? (
        <CourseInfoPopup
          course={entry}
          anchorRect={anchorRect}
          prereqAst={prereqAst}
          coreqAst={coreqAst}
          completedBefore={validation?.completedBefore}
          completedSameOrBefore={validation?.completedSameOrBefore}
          issues={validation?.missing}
          onClose={() => setAnchorRect(null)}
        />
      ) : null}
    </>
  );
}
