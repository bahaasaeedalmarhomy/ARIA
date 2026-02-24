# Responsive Design & Accessibility

### Responsive Strategy

ARIA is a **desktop-primary** application by design. Browser agent computer-use requires screen real estate that cannot meaningfully compress to mobile. The responsive strategy is therefore: **optimize for desktop, provide a meaningful tablet monitoring experience, and gracefully degrade to read-only on mobile**.

| Viewport | Role | Mode |
|---|---|---|
| Desktop (>= 1280px) | Full Command Center | All features, full interaction |
| Large Tablet (1024-1279px) | Monitoring Mode | Thinking panel stack below browser; no resize handle |
| Small Tablet (768-1023px) | Audit Mode | Thinking panel only (no live browser stream); read/audit |
| Mobile (< 768px) | Status Only | AgentStatusPill + last 5 AuditLog entries; task initiation disabled |

**Desktop Strategy (primary):**
ResizablePanelGroup layout -- browser panel flex-grow (min 400px) + thinking panel fixed 400px (min 320px, max 600px) + 64px TaskInputBar bottom. Full interaction surface. Desktop is where ARIA delivers its full value.

**Large Tablet Strategy:**
Single column. Browser panel full width (16:10 aspect-ratio box, not fixed height). Thinking panel collapses below browser as a drawer-style bottom sheet (200px default, drag-up to 50vh). TaskInputBar stays fixed bottom. Voice interaction encouraged over keyboard for Leila/Sara personas in this mode.

**Small Tablet Strategy (Audit Mode):**
Browser panel replaced by the most recent screenshot (static image from AuditLog). Thinking panel fills available height. AuditLog tab defaults to active. Export functionality available. Read-only mode label ("Monitoring only -- full control requires desktop") shown as amber informational toast on first load.

**Mobile Strategy (Status Only):**
Single-column stripped view. AgentStatusPill (full width status bar), task name/description summary, last 5 AuditLogEntries, and a "Pause Task" emergency stop button. No task initiation, no browser panel. Clear message: *"Open ARIA on desktop to start or control tasks."*

---

### Breakpoint Strategy

ARIA uses **desktop-first** Tailwind breakpoints with custom ARIA breakpoints registered in `tailwind.config.ts`:

```ts
// tailwind.config.ts
screens: {
  'xs':  '375px',   // iPhone SE minimum
  'sm':  '640px',   // shadcn default
  'md':  '768px',   // Tablet threshold
  'lg':  '1024px',  // Large tablet / small desktop
  'xl':  '1280px',  // Desktop minimum (Command Center baseline)
  '2xl': '1536px',  // Wide desktop (generous panel widths)
}
```

**Layout breakpoints:**
- `< xl` (< 1280px): ResizablePanelGroup disabled. Stacked single-column layout.
- `xl+`: Full Command Center dual-panel layout active.
- `2xl+`: Thinking panel default width increases from 400px to 480px.

**Typography scaling:**
- Base font-size: 14px (desktop) -> 15px (tablet, larger touch targets for Margaret).
- Line-height: 1.6 (desktop) -> 1.7 (mobile, readability).
- No fluid typography (`clamp()`) -- ARIA uses discrete step scaling for predictability.

**Touch targets:**
All interactive elements min 44x44px at all breakpoints. On `md` and below, Button components receive padding compensation to reach 44px height even at `sm` size variant.

---

### Accessibility Strategy

**Target Compliance: WCAG 2.1 Level AA** -- industry standard, legally defensible, appropriate for ARIA's user base which includes Margaret (senior, potential low vision) and compliance-focused Ravi.

**Rationale for AA vs AAA:** AAA requires 7:1 contrast ratios and no time limits which would conflict with ARIA's real-time agent feedback patterns (animated status, timed toasts). AA (4.5:1 contrast, 3:1 for large text) is achievable without compromising the dark theme aesthetic.

#### Color Contrast Compliance
- **Background/foreground pairs verified:**
  - Primary text (slate-100) on bg-slate-900: 15.8:1 (exceeds AAA)
  - Secondary text (slate-400) on bg-slate-900: 4.6:1 (meets AA)
  - sky-400 accent on bg-slate-900: 4.8:1 (meets AA)
  - signal-success emerald-500 on bg-slate-800: 4.6:1 (meets AA)
  - signal-warning amber-400 on bg-slate-900: 5.1:1 (meets AA)
  - signal-danger rose-500 on bg-slate-900: 4.9:1 (meets AA)
- **Rule:** Never use color as the ONLY differentiator. All states use icon + color + text.

#### Keyboard Navigation
- **Full keyboard operability** at all breakpoints.
- **Focus order:** TaskInputBar -> Browser panel controls -> Thinking panel tabs -> Panel content.
- **Skip link:** Hidden `<a href="#task-input">Skip to task input</a>` at document start, visible on focus (sky-500 outline, bg-slate-800, top-left position).
- **Focus indicators:** 2px sky-500 outline, 2px offset. Never removed with `outline: none` without a custom visible indicator. Applies to all interactive elements.
- **Keyboard shortcuts (documented in UI):**
  - `Ctrl+Enter`: Submit task (TaskInputBar focused or not)
  - `Ctrl+Space`: Toggle voice recording
  - `Escape`: Cancel current dialog / clear input
  - `Ctrl+L`: Focus TaskInputBar
  - `Ctrl+/`: Open keyboard shortcut help overlay

#### Screen Reader Support
- **Semantic HTML first:** `<main>`, `<aside>`, `<nav>`, `<header>` landmarks used correctly.
- **Live regions:**
  - AgentStatusPill: `aria-live="polite"` `aria-atomic="true"` -- announces state changes without interrupting ongoing narration.
  - Error toasts: `aria-live="assertive"` -- immediately announced.
  - StepItem additions: `aria-live="polite"` on ScrollArea container -- each new step announced when appended.
- **ARIA roles:** `role="log"` on AuditLog ScrollArea (preserves chronological history semantics). `role="alertdialog"` on Destructive Action Guard. `role="status"` on ConfidenceBadge container.
- **Hidden decorative content:** Waveform bars, pulse rings, bounding box SVGs all receive `aria-hidden="true"`.
- **Images:** BrowserPanel MJPEG stream has `alt="Live browser view"` that updates to `alt="Browser screenshot -- [page title]"` when agent navigates.

#### Motion and Animation
- **`prefers-reduced-motion` support:** All animations respect the media query.
  - BargeInPulse -> disabled (static ring shown instead)
  - AgentStatusPill pulse -> opacity only (no scale/translate)
  - Skeleton loading -> opacity only (no translate)
  - Toast slide-in -> fade-only variant
- **Implementation:** Tailwind `motion-safe:` and `motion-reduce:` variants applied to all animated classes. Global CSS variable `--motion-duration` set to `0ms` when `prefers-reduced-motion: reduce` is active.

#### Cognitive Accessibility (Margaret + Sara personas)
- **No time pressure:** Modals and dialogs have no auto-close timeout.
- **Error recovery always available:** Every error state includes a clear single action.
- **Plain language:** All UI copy tested against Flesch-Kincaid Grade 8 maximum. Agent status labels are single words ("Thinking", "Acting", "Done") not jargon.
- **Consistent patterns:** Same interaction patterns used throughout -- no surprises. MidTaskInputPrompt always appears in the same location (thinking panel, below current step).

---

### Testing Strategy

#### Responsive Testing Checklist
- [ ] Chrome DevTools device emulation: iPhone SE (375px), iPad Air (820px), MacBook Pro 14" (1512px), Dell 27" (2560px)
- [ ] Real device tests: iPad (Safari), Windows laptop 1366px wide (most common enterprise width)
- [ ] Test ResizablePanelGroup at minimum boundary (320px thinking panel)
- [ ] Verify TaskInputBar fixed position at all viewports
- [ ] Test panel collapse/expand persistence across page reloads

#### Accessibility Testing Checklist
- [ ] **Automated:** axe-core integrated in Vitest + Playwright E2E tests (zero tolerance for axe violations in CI)
- [ ] **Keyboard-only:** Full task execution flow navigable without mouse
- [ ] **VoiceOver (macOS):** AgentStatusPill live region announces correctly
- [ ] **NVDA (Windows):** AuditLog `role="log"` reads entries in order
- [ ] **Color contrast:** Verified via Figma Contrast plugin + code-level `wcag-contrast` npm check
- [ ] **Zoom to 200%:** Layout does not break, no horizontal scrolling at 200% zoom
- [ ] **Windows High Contrast mode:** All states visually distinguishable without custom colors
- [ ] **Respects prefers-reduced-motion:** All animations disabled/simplified

---

### Implementation Guidelines

#### Responsive Development

```tsx
// Desktop-first responsive layout pattern
// Full features default at xl+, strip down below
<div className="
  xl:flex xl:flex-row
  lg:flex lg:flex-col
  flex flex-col
">
  <BrowserPanel className="xl:flex-grow xl:min-w-[400px] lg:w-full hidden xl:block lg:block" />
  <ThinkingPanel className="xl:w-[400px] lg:w-full w-full" />
</div>
```

**Asset optimization:**
- MJPEG stream served only at `xl+` breakpoints (connection-guarded via `useBreakpoint` hook).
- Static screenshots (last BrowserPanel state) served at `md`-`lg` breakpoints.
- No live stream at mobile breakpoints (data conservation, performance).

#### Accessibility Development Standards
- **Rule 1:** No `<div onClick>` -- use semantic `<button>` or `<a>` elements only.
- **Rule 2:** Every `<img>` has `alt`. Decorative images use `alt=""` + `aria-hidden="true"`.
- **Rule 3:** Form labels always visible -- no placeholder-as-label pattern.
- **Rule 4:** Focus management on route/panel changes: focus moves to the relevant heading or first interactive element of new content.
- **Rule 5:** Toast notifications do not steal focus -- `aria-live` only.
- **Rule 6:** `prefers-color-scheme` not implemented (ARIA is dark-mode-only by design; a light mode preference override is a post-launch consideration).

**Accessibility linting:**

```json
// .eslintrc -- jsx-a11y rules
{
  "alt-text": "error",
  "aria-role": "error",
  "interactive-supports-focus": "error",
  "no-autofocus": "warn"
}
```

*Note: TaskInputBar `autoFocus` on load is intentional and documented as an exception.*
