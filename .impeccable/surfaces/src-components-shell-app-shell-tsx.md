---
version: 1
slug: "src-components-shell-app-shell-tsx"
primary_target: "src/components/shell/app-shell.tsx"
# prettier-ignore
related_targets: ["src/components/chat/chat-frame.tsx", "src/components/ui/workspace.tsx", "src/components/shell/shell-loading.tsx", "app/globals.css"]
---

## Scope and mode

Operate mode for the authenticated shell, shared workspace components, and live/loading chat frames. Applies to Chat, Tools, Unity, and Settings; public marketing and authentication pages keep their existing compositions.

## Audience and job

UBC students use a phone between classes to read a reply, find a course, inspect a timetable, or navigate campus. Give the current task the available screen width and height without a surrounding card.

## Layout direction

Below 640px, use a flat surface page in the dynamic viewport. Remove the shell gutter, page radius, and page shadow. Keep headers, notices, view switches, and command groups inset 16px while primary canvases reach both edges. Content retains its own readable padding. Stacked contextual panels become full-width sections separated by a hairline, with their fixed headers and bounded scrollers intact.

Keep the 55rem container threshold for rail/canvas switching, caller-owned view state, and mounted regions. Preserve the 20rem content-height floor and page scrolling in short viewports. At 640px upward, retain the 12px shell gutters and raised page panels; retain the existing sidebar and Answer Canvas breakpoints.

## Material and interaction

Use the existing neutral surface and typography. Flatten page-level workspace panels and canvases, including the mobile chat message region. Preserve the material of buttons, inputs, course chips, Pulse questions, dialogs, and floating sheets. Keep the mobile timetable flush, with horizontally scrollable weekday tabs at least 44px wide when weekends do not fit. Embedded Answer Canvas workspaces retain their contained layout.

Reserve top and side safe areas in the shell, bottom safe areas in workspace layouts and the chat composer, and safe padding in the sidebar drawer. Keep the menu's 44px target aligned with the chat header and clear of workspace headings. Use an inset keyboard-focus outline at edge-to-edge canvas boundaries. Loading frames use the same geometry as their destinations. The named Conversation messages section supports native keyboard scrolling without requiring an interactive message. Course results keep a 16rem minimum region so expanded filters can extend the page's scrollable content.

## Boundaries

Preserve route semantics, sidebar state, compact view selection, form and scroll state, chat persistence, imports, and data operations. Do not add per-route outer cards or a separate mobile component tree. Preserve public-page styling, desktop geometry, contained content cards, and overlay dismissal behavior.

## Verification

Check 320px and 390px phone layouts, the 639/640px material boundary, 768px tablet, and 1440px desktop. Include light and dark themes, short and landscape viewports, populated and loading states, menu focus return, compact switches, course filters, timetable days, horizontal canvas scrolling, and bottom-pinned controls. Measure primary-region bounds, radius, shadow, document overflow, and menu-heading overlap. Browser emulation and automated accessibility checks do not replace physical-device and assistive-technology testing.
