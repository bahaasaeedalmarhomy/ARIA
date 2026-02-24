# UX Consistency Patterns

### Button Hierarchy

ARIA follows a strict 3-tier action hierarchy using shadcn/ui Button variants mapped to semantic weight.

**Tier 1 -- Primary Actions** (`variant="default"`, sky-500 fill)
**When to Use:** Single most-important action per view. One per screen region maximum.
**Examples:** "Start Task" in TaskInputBar, "Confirm" in Destructive Action Guard dialog.
**Behavior:** Full hover lift (translateY -1px), active press (scale 0.98), 150ms ease-out.
**Accessibility:** `aria-label` required when icon-only. Always focusable, keyboard Enter/Space activation.
**Disabled State:** 40% opacity, `cursor-not-allowed`, `aria-disabled="true"` -- never `disabled` attribute (preserves focus).

**Tier 2 -- Secondary Actions** (`variant="outline"`, border + ghost text)
**When to Use:** Confirmatory alternatives, cancel paths, supplemental navigation.
**Examples:** "Pause Task", "View Full Log", panel tab switches.
**Behavior:** Border color transitions on hover (border-sky-400), no lift effect.
**Accessibility:** Grouped secondary actions use `role="group"` with `aria-label`.

**Tier 3 -- Ghost/Destructive Actions** (`variant="ghost"` or `variant="destructive"`)
**When to Use:** Ghost for low-weight icon actions (copy, collapse). Destructive (rose-600) only for irreversible operations.
**Destructive Rule:** Always requires a confirmation Dialog before execution -- never fires inline. See Destructive Action Guard pattern in User Journey Flows.
**Accessibility:** Destructive buttons carry `aria-keyshortcuts` warning in tooltip.

**Icon Buttons:** 44x44px minimum touch target (even when visually 20px icon). Always paired with `Tooltip` showing label. `aria-label` matches tooltip text exactly.

---

### Feedback Patterns

ARIA uses a layered feedback system: **inline** for field-level, **toast** for system events, **panel** for agent state.

#### Success Feedback
**Trigger:** Task completed, action confirmed, data saved.
**Component:** Sonner toast, `variant="success"`, signal-success emerald, 4s auto-dismiss.
**Copy Pattern:** Past-tense verb + result noun. *"Task completed -- 14 steps executed."*
**No interruption rule:** Success toasts never block the task bar or thinking panel. Position: bottom-left, above TaskInputBar (72px offset).
**Agent State:** AgentStatusPill transitions to `idle` state with momentary emerald pulse (800ms -> back to default).

#### Error Feedback
**Trigger:** Task failed, network error, agent cannot proceed.
**Component:** Sonner toast `variant="error"` + inline `MidTaskInputPrompt` if recovery requires user input.
**Copy Pattern:** What happened + what to do. *"Connection lost -- click Retry or start a new task."*
**Persist rule:** Error toasts do NOT auto-dismiss. User must explicitly close or act.
**Agent State:** AgentStatusPill transitions to `error` state (rose-500). StepItem for failed step shows `failed` state with error detail expandable.
**Recovery:** Always provide one clear escape hatch -- Retry button in toast OR dismiss to TaskInputBar.

#### Warning Feedback
**Trigger:** Destructive action pending, low confidence result, resource limit approaching.
**Component:** shadcn Dialog for destructive warnings (blocks action). Sonner `variant="warning"` (amber) for informational warnings.
**Blocking vs. Non-blocking:** Actions that delete, navigate away mid-task, or override agent decisions -> blocking Dialog. All others -> non-blocking toast.
**ConfidenceBadge:** LOW tier (< 50%, rose) always accompanies a warning Tooltip explaining uncertainty.

#### Informational Feedback
**Trigger:** Background activity, progress updates, non-critical state changes.
**Component:** Sonner default toast, 3s auto-dismiss. AuditLogEntry for persistent record.
**Mid-task updates:** Appended as StepItems in thinking panel -- never interrupt task bar focus.

---

### Form Patterns

ARIA has two form contexts: **TaskInputBar** (primary, always visible) and **MidTaskInputPrompt** (inline, agent-initiated).

#### TaskInputBar Patterns
**States:** idle -> recording (voice) / typing (keyboard) -> submitting -> executing.
**Input validation:** Real-time character count if > 200 chars (soft limit indicator, amber). Hard limit 500 chars with inline counter turning rose.
**Empty submit prevention:** Submit action disabled + shake animation (x-axis, 4px, 2 cycles, 200ms) if input empty.
**Voice toggle:** Pressing mic icon mid-type appends voice transcript to existing text. Never replaces.
**Placeholder text:** Contextual -- changes based on AgentStatus. Idle: *"Describe a task..."* | Paused: *"Resume or change direction..."* | Error: *"Try a different approach..."*

#### MidTaskInputPrompt Patterns
**Trigger:** Agent needs structured data mid-task (Sara's form fill, Margaret's confirmation).
**Placement:** Inline in thinking panel below current StepItem -- NOT a modal overlay.
**Required fields:** Clearly marked with rose asterisk + `aria-required`. Never more than 3 fields per prompt (complexity triage).
**Cancel path:** Always available. Cancelling mid-task prompt resumes agent with a `[USER_SKIPPED]` annotation in AuditLog.
**Timeout:** 60s inactivity -> gentle pulse animation on prompt + toast nudge. 120s -> agent pauses and prompts again.

#### Validation Rules (Universal)
- Validate on blur, not on keystroke (reduces anxiety -- Sara/Leila personas).
- Error messages: below field, signal-danger rose, `role="alert"`, icon + text (never color alone).
- Success state: subtle emerald border only -- no distracting checkmark animation.

---

### Navigation Patterns

ARIA's Command Center is a single-page layout. Navigation is state-driven, not route-driven.

#### Panel Navigation (Thinking Panel Tabs)
**Tabs:** Steps | Audit Log | Screenshots (shadcn Tabs, `variant="underline"`).
**Default:** Steps tab active, auto-advances to Audit Log when agent completes (if Ravi/James persona detected via task type heuristic).
**Keyboard:** Arrow keys navigate tabs. Tab key moves to tab content. `aria-selected` + `aria-controls` wired correctly.
**Badge indicators:** Unread count badge on Audit Log tab when new entries arrive while user is on Steps tab.

#### Panel Resize
**ResizablePanelGroup:** Browser panel (min 400px, default flex-grow) + Thinking panel (min 320px, max 600px, default 400px).
**Snap points:** 320px, 400px (default), 480px, 600px -- snaps on drag release within 20px threshold.
**Collapse:** Thinking panel collapses to 0px (icon-only rail, 48px wide) when user presses collapse icon. Expanding restores last width.
**Persistence:** Panel width stored in `localStorage` under key `aria:panel:thinking:width`. Restored on next session.

#### Breadcrumb / Context Awareness
ARIA has no traditional breadcrumb. Context is communicated via:
- AgentStatusPill in panel header (current agent state)
- Active StepItem highlight (current task step)
- TaskInputBar placeholder (current task mode)

---

### Modal and Overlay Patterns

**Rule:** Modals are reserved for destructive confirmation ONLY. All other interactions use inline patterns.

#### Destructive Action Guard (Dialog)
**Trigger:** User attempts to start new task while agent is executing, or explicitly cancels task.
**Component:** shadcn Dialog, `role="alertdialog"`, focus trapped on open.
**Content structure:** Warning icon (amber) + consequence statement (what will be lost) + two buttons (Destructive primary left, Cancel secondary right -- reversed from normal order to prevent misclick).
**Escape key:** Closes dialog = Cancel action. Never executes destructive action.
**Animation:** Fade + scale (0.95 -> 1.0, 150ms). Backdrop blur-sm, bg-black/40.

#### Tooltip Overlays
**Trigger delay:** 400ms hover. Instant on focus.
**Max width:** 240px. Text only -- no interactive elements inside Tooltip.
**Positioning priority:** top -> bottom -> right -> left (avoids viewport clip).
**Dismiss:** Mouse-leave immediately. Focus-leave immediately. No linger.

#### BargeInPulse Overlay
**Trigger:** Voice barge-in detected (< 200ms from audio event).
**Component:** BargeInPulse wrapping VoiceWaveform. Concentric ring expansion, sky-400, 2 rings, 600ms total.
**No user action required.** Purely confirmatory feedback -- agent handles audio interrupt automatically.

---

### Empty States and Loading States

#### Task Not Started (True Empty State)
**When:** First session or after task completion before new task.
**BrowserPanel:** Centered illustration (abstract grid lines, slate-700) + headline *"Ready when you are"* + sub-copy *"Describe a task in the bar below."* No call-to-action button -- TaskInputBar is the CTA.
**Thinking Panel:** Empty Steps tab shows: *"Task steps will appear here as ARIA works."* Quiet, not alarming.

#### Agent Loading / Thinking
**StepItem skeleton:** shadcn Skeleton pulses at 1.5s interval, full StepItem width, 2-line placeholder.
**ConfidenceBadge skeleton:** 48px x 20px pill skeleton alongside StepItem skeleton.
**BrowserPanel:** Shows live MJPEG stream as soon as agent connects -- no loading skeleton for browser (stream IS the loading state).
**AgentStatusPill:** `thinking` state (animated dots, slate-400) whenever agent is processing but no visible step yet.

#### Error Empty State
**When:** Agent cannot retrieve browser stream / API failure.
**BrowserPanel:** Rose-tinted overlay on browser area + icon + *"Connection lost"* + Retry button (Tier 1 primary).
**Never blank:** Always prefer an explicit error state over a blank panel.

#### First-Use Onboarding Empty State (Leila persona)
**When:** Session count = 0 (localStorage `aria:sessions:count`).
**TaskInputBar:** Animated placeholder cycling through 3 example tasks at 4s intervals: *"Book a flight to Tokyo for next Friday"* -> *"Find the cheapest plan on this insurance page"* -> *"Fill in my billing details on checkout"*.
**Dismisses:** On first keystroke or mic activation. Never shown again.

---

### Agent-Specific Patterns

These patterns are unique to ARIA and have no direct analogue in standard web UI pattern libraries.

#### Agent Status Communication
**AgentStatusPill states and copy:**

| State | Color | Label | Description |
|---|---|---|---|
| `idle` | slate-400 | Ready | Agent waiting for task |
| `thinking` | sky-400 (pulse) | Thinking... | Processing, no browser action yet |
| `acting` | sky-500 (solid) | Acting | Browser interaction in progress |
| `paused` | amber-400 | Paused | Awaiting user input (MidTaskInputPrompt active) |
| `success` | emerald-500 | Done | Task completed |
| `error` | rose-500 | Stuck | Agent cannot proceed |

**Rule:** AgentStatusPill is the single source of truth for agent state. All other feedback patterns are derived from it.

#### Confidence Communication
**Rule:** Confidence is always communicated as label + color -- never color alone (accessibility + trust).
**When LOW confidence (< 50%):** AuditLogEntry for that step includes expandable "Why uncertain?" detail.
**When MID confidence (50-79%):** ConfidenceBadge shown; no additional prompt unless it is a destructive action.
**When HIGH confidence (>= 80%):** Badge shown; no extra friction added for Sara/Leila flow personas.

#### Audit Log Patterns
**AuditLogEntry anatomy:** Timestamp (HH:MM:SS) | EventType badge | Actor pill (AGENT / USER) | Description.
**EventTypes:** `navigation` | `click` | `form_fill` | `screenshot` | `decision` | `user_input` | `error`.
**Filtering:** AuditLog tab header includes EventType filter chips (shadcn Badge, toggleable). Default: all visible.
**Export:** "Copy log" ghost button in tab header -- copies markdown-formatted log to clipboard. Toast confirms copy.

#### Mid-Task Interaction Patterns
**Principle:** Agent NEVER silently stalls. If blocked, it surfaces MidTaskInputPrompt within 3 seconds.
**User response options always include:** Provide data | Skip this step | Cancel entire task.
**Skip behavior:** Agent annotates skip in AuditLog and attempts best-effort continuation.
**Interruption rule:** Users can always type in TaskInputBar during execution (voice or text). Message queued with `[QUEUED]` badge, delivered at next agent pause point.

---
