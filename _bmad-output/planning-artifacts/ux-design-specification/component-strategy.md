# Component Strategy

### Design System Components (shadcn/ui -- use as-is)

| Component | Usage in ARIA |
|---|---|
| `Button` | Confirm/Cancel in destructive guard modal, task input submit |
| `Badge` | Base for ConfidenceBadge custom component |
| `Dialog` | Destructive Action Guard modal shell |
| `ScrollArea` | Thinking panel step list, audit log scroll container |
| `Separator` | Panel dividers, step section breaks |
| `Toast` / `Sonner` | Non-blocking status notifications (task complete, error) |
| `Tooltip` | Confidence score explainer on hover |
| `Tabs` | Thinking panel tab switcher (Steps / Audit Log / Screenshots) |
| `Skeleton` | Loading state for BrowserPanel stream warmup |
| `ResizablePanelGroup` + `ResizablePanel` | Browser/thinking panel split -- use built-in shadcn resizable |

### Custom Components

Ten custom components cover every surface in the Command Center layout. All built with Tailwind utilities and ARIA CSS variable tokens -- no raw color values.

#### 1. VoiceWaveform
**Purpose:** Communicates ARIA audio state continuously -- always visible in the thinking panel header.

| State | Visual | Color token |
|---|---|---|
| idle | 5 flat bars, static | zinc-600 |
| listening | Bars animate to audio amplitude | signal-active blue |
| barge-in | Rapid pulse + glow ring | signal-pause violet |
| speaking | Smooth sinusoidal movement | zinc-400 |

**Anatomy:** 5 vertical bars, height driven by Web Audio API AnalyserNode. Canvas renderer with CSS animation fallback.
**Accessibility:** aria-label="Voice activity indicator", role="img", aria-live="polite" for state changes.

---

#### 2. StepItem
**Purpose:** Primary repeating unit of the thinking panel -- represents one planned execution step.

**States:** pending (muted) / executing (blue highlight + pulse) / done (green) / paused (violet) / failed (rose)
**Variants:** compact (no thumbnail) / expanded (screenshot visible)
**Props:** stepIndex, action, url?, status, confidence, screenshot?, isExpanded
**Accessibility:** role="listitem", status via aria-label, not color alone.

---

#### 3. ConfidenceBadge
**Purpose:** Inline confidence score -- always text label + color, never color alone.

| Confidence | Label | Token |
|---|---|---|
| >= 80% | HIGH 94% | signal-success emerald |
| 50-79% | MID 67% | signal-warning amber |
| < 50% | LOW 31% | signal-danger rose |

**Extends:** shadcn Badge with variant prop mapping to signal tokens.
**Accessibility:** aria-label="Confidence score: high, 94 percent".

---

#### 4. AgentStatusPill
**Purpose:** Single-source-of-truth state indicator -- used in browser panel overlay, thinking panel header, and task input bar.

| State | Label | Token |
|---|---|---|
| idle | Ready | zinc-500 |
| planning | Planning... | zinc-400 animate-pulse |
| executing | Executing - Step 3 of 7 | signal-active blue |
| paused | Paused -- listening | signal-pause violet |
| guard | Confirmation needed | signal-danger rose |
| done | Done | signal-success emerald |

**Props:** state, stepCurrent?, stepTotal?

---

#### 5. TaskInputBar
**Purpose:** Fixed bottom bar -- primary user entry point for every flow. Has its own state machine.

| State | Visual | Input active? |
|---|---|---|
| idle | Placeholder + mic button + disabled submit | Yes |
| recording | Waveform fills input area, Listening label | No |
| executing | AgentStatusPill + stop button | No |
| paused | Re-enabled input for follow-up instruction | Yes |

**Anatomy:** AgentStatusPill left / Input or VoiceWaveform center / mic+stop Button + submit Button right.

---

#### 6. BrowserPanel
**Purpose:** Hosts the live Playwright browser screenshot stream with execution context overlays.

**States:** idle (Skeleton) / executing (live MJPEG stream + blue AgentStatusPill overlay) / paused (violet tint) / guard (rose tint, Dialog above)
**Implementation:** img tag refreshing from WebSocket MJPEG stream; SVG overlay layer for element bounding boxes.

---

#### 7. AuditLogEntry
**Purpose:** Repeating item in the Audit Log tab -- distinct from StepItem; shows event type, timestamp, and actor (ARIA vs. user).

**Props:** timestamp, eventType, description, actor (aria or user), screenshotIndex?
**Event types:** plan-start / step-complete / user-interrupted / guard-confirmed / guard-cancelled / task-complete

---

#### 8. MidTaskInputPrompt
**Purpose:** Inline request inside the thinking panel when ARIA needs user-provided data mid-execution. Not a modal -- keeps the browser panel visible.

**Appears:** As a high-priority item inside the thinking panel ScrollArea, above pending steps.
**Props:** prompt, inputType (text, file, or voice), onProvide, onSkip

---

#### 9. BargeInPulse
**Purpose:** Immediate visual acknowledgment (under 200ms) of voice detection -- fires before server processing completes.
**Behavior:** Concentric ring expansion from VoiceWaveform. Lasts 600ms. Highest z-index.
**Composability:** Wraps VoiceWaveform; receives triggered boolean prop.

---

#### 10. ScreenshotViewer
**Purpose:** Expanded annotated screenshot in audit log or step item -- bounding box overlays, step label, timestamp, zoom.
**Phase:** 3 (polish) -- audit log functions without it in earlier phases.

---

### Component Implementation Strategy

**Composition principle:** Custom components compose shadcn primitives wherever possible. ConfidenceBadge extends Badge. StepItem uses shadcn Tooltip internally. BrowserPanel uses shadcn Skeleton for loading. TaskInputBar uses shadcn Button and Input.

**Token discipline:** No raw color values in any component -- only CSS variable references like var(--color-signal-active) so theme changes propagate automatically.

**Layout:** Use shadcn ResizablePanelGroup for the browser/thinking panel split -- gives users a drag handle with zero custom code.

### Implementation Roadmap

**Phase 1 -- Critical path (Days 1-5):**
- VoiceWaveform -- barge-in demo requires this visually
- StepItem -- thinking panel requires this to render
- ConfidenceBadge -- step items require this
- AgentStatusPill -- browser panel, thinking panel header, and task bar all use it
- TaskInputBar -- primary user entry point for every flow

**Phase 2 -- Core experience (Days 5-10):**
- BrowserPanel -- live browser stream display
- AuditLogEntry -- audit log tab (Sara, Ravi, Margaret demo moments)
- MidTaskInputPrompt -- mid-task data collection (Sara, Margaret journeys)
- shadcn Dialog configured for Destructive Action Guard
- shadcn Tabs for Steps / Audit Log / Screenshots panels

**Phase 3 -- Polish (Days 10-18):**
- BargeInPulse -- visual delight layer
- ScreenshotViewer -- expanded audit log screenshots
- shadcn Sonner for non-blocking notifications

---
