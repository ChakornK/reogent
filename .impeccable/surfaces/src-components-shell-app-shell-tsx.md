---
version: 1
slug: "src-components-shell-app-shell-tsx"
primary_target: "src/components/shell/app-shell.tsx"
# prettier-ignore
related_targets: ["src/components/chat/chat-frame.tsx", "src/components/chat/chat-input.tsx", "src/components/theme-toggle.tsx", "src/components/ui/workspace.tsx", "src/components/shell/shell-loading.tsx", "src/components/shell/mode-toggle.tsx", "src/components/shell/left-sidebar.tsx", "src/components/shell/sidebar-list.tsx", "src/components/shell/session-sidebar.tsx", "src/components/shell/use-mobile-viewport.ts", "src/components/ui/use-overlay-presence.ts", "src/components/ui/disclosure.tsx", "app/globals.css"]
---

## Scope and mode

Operate mode for the authenticated shell, shared workspace components, and live/loading chat frames. Applies to Chat, Tools, Unity, and Settings; public marketing and authentication pages keep their existing compositions.

## Audience and job

UBC students use a phone between classes to read a reply, find a course, inspect a timetable, or navigate campus. Give the current task the available screen width and height without a surrounding card.

## Layout direction

Below 640px, use a flat surface page in the dynamic viewport. Remove the shell gutter, page radius, and page shadow. Keep headers, notices, view switches, and command groups inset 16px while primary canvases reach both edges. Content retains its own readable padding. Stacked contextual panels become full-width sections separated by a hairline, with their fixed headers and bounded scrollers intact.

Keep AI, Tools, and Unity at thumb level in a flat bottom bar with contiguous equal-width, 60px-high icon-and-label targets. Hover, press, and focus share an 8px-inset painted surface while the entire target remains clickable. Keep the current-mode marker 4px below the content top. Restore each mode's last routed screen, including returns from Settings. Use one 44px inline ghost menu button in each route header, with 8px phone edge clearance and an 8px title gap; the drawer contains the current mode's destinations and account controls rather than a duplicate mode switch. Attach the phone drawer to the left edge at full visible height, with flat 48px destination rows and no nested frame or recessed well.

Keep the 55rem container threshold for rail/canvas switching, caller-owned view state, and mounted regions. Preserve the 20rem content-height floor and page scrolling in short viewports. Let feature minima extend their intended scroll owner: Calendar keeps intrinsic week heights; Degree Planner reserves 16rem terms and 9rem course viewports; Course Schedule reserves a 12rem course list. Size-contain dense lists so their contents scroll without inflating ancestor minima. At 640px upward, retain the 12px shell gutters and raised page panels; retain the existing sidebar and Answer Canvas breakpoints.

## Material and interaction

Use the existing neutral surface and typography. Flatten page-level workspace panels and canvases, including the mobile chat message region. Preserve the material of buttons, inputs, course chips, Pulse questions, dialogs, and floating sheets. Keep the mobile timetable flush, with horizontally scrollable weekday tabs at least 44px wide when weekends do not fit. Embedded Answer Canvas workspaces retain their contained layout.

Reserve top and side safe areas in the shell and the bottom safe area in the mode bar. Keep 12px composer padding above the bar without another safe-area inset. Independent overlays retain safe padding. Use the reported visual viewport height and offsets at normal scale for the shell and fixed overlays; preserve native pinch zoom. Phone text fields use 16px text. Keep the menu's 44px target inside the header, reserving its own width. Use an inset keyboard-focus outline at edge-to-edge canvas boundaries. Loading and recovery frames use the same geometry and header navigation as their destinations. Keep shell navigation usable during pending routes, while task controls remain inert. Gate underlying navigation from the effective visible modal state. Focus the drawer and account dialog on entry; keep nested Escape and Tab behavior within the active surface. Conversation rows use one ellipsis disclosure rather than separated Rename/Delete glyphs. Keep inactive actions visible without hover capability, reveal them on desktop hover/focus, and keep selected/open-row actions visible. Reserve title space for one 32px desktop/44px drawer trigger; drawer rows and editors stay 48px high on phones and tablets. Menu choices retain explicit labels and keyboard navigation. Rename preserves drafts and Delete uses protected confirmation; both retain errors and update local data only after success. Restore a visible focus target after modal cleanup and preserve it when background chat loading or streaming completes. The named Conversation messages section supports native keyboard scrolling without requiring an interactive message. Course results keep a 16rem minimum region so expanded filters can extend the page's scrollable content.

## Optical geometry

Keep the collapsed rail 48px wide with a 60px reserved offset; expanded dimensions stay 272px/284px. A 48px collapsed brand row gives its 36px tile equal 6px clearance. Center the account under the mode controls without shrinking the expanded group. The collapsed brand link uses a square 44px target and inward focus paint. Hide scrollbar gutters only in collapsed icon lists while retaining native scrolling and the expand control. Match these brand and footer dimensions during shell boot.

Center leading controls on the workspace's 28px title anchor without shrinking their hit targets. Plain rail content and discovery searches share the header's 16px horizontal inset; dense card/list bodies retain their explicit spacing. Keep ThemeToggle intrinsic-width and non-shrinking at 144px phone/108px wider-screen so each radio fills its grid track. Wrap the account Appearance row with an 8px row gap when its label and control cannot share a line.

Derive close matching curves from real border-box insets: expanded navigation 16/8/8, collapsed navigation and theme 12/4/8, segmented controls 8/4/4, and timetable 12/2/10 followed by 10/2/8 (outer radius/inset/inner radius). The single-line composer keeps a 44px field inside a 56px well; action radius/inset is 10/6 on phones and 6/10 on wider screens. Preserve phone flattening and independent cards, avatars, input fields, and interior rows. Confirm measurements with original-scale images and enlarged details; reject image estimates that contradict actual bounds.

## Motion direction

The phone mode indicator connects a mode selection to its destination with a 280ms slide. Shared overlay presence uses 220ms entry and 140ms exit; inline disclosures use 240ms expansion and 160ms collapse. Incoming data/view regions use bounded opacity, and feedback uses a short local reveal. Keep static sections still and retain existing message, swipe, drag, camera, and theme behavior.

Make closing controls inert immediately and release focus ownership at logical close. Preserve current styles on interrupted overlays; defer synchronous removal until the presence parent has registered it. Disable native details pseudo-element transitions and spatial JS exits under reduced motion. Keep tapped guest hints visible through synthetic mouse leave, use distinct hint IDs during overlap, and scope outgoing dismissal to its own hint. Keep route/group/search invalidation immediate and preserve form, scroll, and graph identity. Do not animate browser-driven viewport sizing.

## Boundaries

Preserve route semantics, sidebar state, compact view selection, form and scroll state, chat persistence, imports, and data operations. Do not add per-route outer cards or a separate mobile component tree. Preserve public-page styling, desktop geometry, contained content cards, and overlay dismissal behavior.

## Verification

Check 320px and 390px phone layouts, the 639/640px material boundary, 768px tablet, and 1440px desktop. Include light and dark themes, short and landscape viewports, populated and loading states, menu focus return, compact switches, course filters, timetable days, horizontal canvas scrolling, and bottom-pinned controls. Measure primary-region and bottom-bar bounds, nested radii, shadows, document overflow, and menu-versus-title text overlap. Inspect actual hover, pressed, and keyboard-focus paint bounds separately from hit rectangles; resting screenshots cannot establish effect insets. Verify one visible mode navigation, per-mode route restoration, pending-menu access, guest tap hints, immediate drawer/account focus, Escape layering, and fixed-sheet placement in a simulated reduced visual viewport. For motion, measure active browser animations, durations, interruption, end-state DOM removal, and reduced-motion alternatives. Static screenshots alone do not prove timing. Browser emulation and automated accessibility checks do not replace physical-device and assistive-technology testing.
