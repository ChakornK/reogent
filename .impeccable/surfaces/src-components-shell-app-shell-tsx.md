---
version: 1
slug: "src-components-shell-app-shell-tsx"
primary_target: "src/components/shell/app-shell.tsx"
# prettier-ignore
related_targets: ["src/components/chat/chat-frame.tsx", "src/components/ui/workspace.tsx", "src/components/shell/shell-loading.tsx", "src/components/shell/mode-toggle.tsx", "src/components/shell/left-sidebar.tsx", "src/components/shell/sidebar-list.tsx", "src/components/shell/session-sidebar.tsx", "src/components/shell/use-mobile-viewport.ts", "src/components/ui/use-overlay-presence.ts", "src/components/ui/disclosure.tsx", "app/globals.css"]
---

## Scope and mode

Operate mode for the authenticated shell, shared workspace components, and live/loading chat frames. Applies to Chat, Tools, Unity, and Settings; public marketing and authentication pages keep their existing compositions.

## Audience and job

UBC students use a phone between classes to read a reply, find a course, inspect a timetable, or navigate campus. Give the current task the available screen width and height without a surrounding card.

## Layout direction

Below 640px, use a flat surface page in the dynamic viewport. Remove the shell gutter, page radius, and page shadow. Keep headers, notices, view switches, and command groups inset 16px while primary canvases reach both edges. Content retains its own readable padding. Stacked contextual panels become full-width sections separated by a hairline, with their fixed headers and bounded scrollers intact.

Keep AI, Tools, and Unity at thumb level in a flat bottom bar with 60px icon-and-label targets. Restore each mode's last routed screen, including returns from Settings. Use one inline ghost menu button in each route header; the drawer contains the current mode's destinations and account controls rather than a duplicate mode switch. Attach the phone drawer to the left edge at full visible height, with flat 48px destination rows and no nested frame or recessed well.

Keep the 55rem container threshold for rail/canvas switching, caller-owned view state, and mounted regions. Preserve the 20rem content-height floor and page scrolling in short viewports. At 640px upward, retain the 12px shell gutters and raised page panels; retain the existing sidebar and Answer Canvas breakpoints.

## Material and interaction

Use the existing neutral surface and typography. Flatten page-level workspace panels and canvases, including the mobile chat message region. Preserve the material of buttons, inputs, course chips, Pulse questions, dialogs, and floating sheets. Keep the mobile timetable flush, with horizontally scrollable weekday tabs at least 44px wide when weekends do not fit. Embedded Answer Canvas workspaces retain their contained layout.

Reserve top and side safe areas in the shell and the bottom safe area in the mode bar. Keep 12px composer padding above the bar without another safe-area inset. Independent overlays retain safe padding. Use the reported visual viewport height and offsets at normal scale for the shell and fixed overlays; preserve native pinch zoom. Phone text fields use 16px text. Keep the menu's 44px target inside the header, reserving its own width. Use an inset keyboard-focus outline at edge-to-edge canvas boundaries. Loading and recovery frames use the same geometry and header navigation as their destinations. Keep shell navigation usable during pending routes, while task controls remain inert. Gate underlying navigation from the effective visible modal state. Focus the drawer and account dialog on entry; keep nested Escape and Tab behavior within the active surface. The named Conversation messages section supports native keyboard scrolling without requiring an interactive message. Course results keep a 16rem minimum region so expanded filters can extend the page's scrollable content.

## Motion direction

The phone mode indicator connects a mode selection to its destination with a 280ms slide. Shared overlay presence uses 220ms entry and 140ms exit; inline disclosures use 240ms expansion and 160ms collapse. Incoming data/view regions use bounded opacity, and feedback uses a short local reveal. Keep static sections still and retain existing message, swipe, drag, camera, and theme behavior.

Make closing controls inert immediately and release focus ownership at logical close. Preserve current styles on interrupted overlays; defer synchronous removal until the presence parent has registered it. Disable native details pseudo-element transitions and spatial JS exits under reduced motion. Keep tapped guest hints visible through synthetic mouse leave, use distinct hint IDs during overlap, and scope outgoing dismissal to its own hint. Keep route/group/search invalidation immediate and preserve form, scroll, and graph identity. Do not animate browser-driven viewport sizing.

## Boundaries

Preserve route semantics, sidebar state, compact view selection, form and scroll state, chat persistence, imports, and data operations. Do not add per-route outer cards or a separate mobile component tree. Preserve public-page styling, desktop geometry, contained content cards, and overlay dismissal behavior.

## Verification

Check 320px and 390px phone layouts, the 639/640px material boundary, 768px tablet, and 1440px desktop. Include light and dark themes, short and landscape viewports, populated and loading states, menu focus return, compact switches, course filters, timetable days, horizontal canvas scrolling, and bottom-pinned controls. Measure primary-region and bottom-bar bounds, nested radii, shadows, document overflow, and menu-versus-title text overlap. Verify one visible mode navigation, per-mode route restoration, pending-menu access, guest tap hints, immediate drawer/account focus, Escape layering, and fixed-sheet placement in a simulated reduced visual viewport. For motion, measure active browser animations, durations, interruption, end-state DOM removal, and reduced-motion alternatives. Static screenshots alone do not prove timing. Browser emulation and automated accessibility checks do not replace physical-device and assistive-technology testing.
