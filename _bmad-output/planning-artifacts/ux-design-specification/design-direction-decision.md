# Design Direction Decision

### Design Directions Explored

Six directions were prototyped in an interactive HTML showcase (`ux-design-directions.html`) and evaluated against six weighted criteria:

| # | Direction | Character | Layout |
|---|---|---|---|
| 1 | Command Center | Browser dominant, thinking panel right | Browser left (flex-grow) + 400px panel right + 64px task bar bottom |
| 2 | Split Focus | Trust-first, panel left | 320px panel left + browser right |
| 3 | Immersive Overlay | Demo wow factor | Full-viewport browser + translucent floating panel |
| 4 | Terminal | Developer/power-user | Monospace log-style, navy palette |
| 5 | Card-First | Novice-accessible | Collapsible step cards with screenshot previews |
| 6 | Focus Mode | Cleanest chrome | Header breadcrumb + tabbed sidebar |

**Evaluation criteria:** layout intuitiveness, voice state visibility, barge-in readiness, confidence signal legibility, demo camera-readiness, novice accessibility

### Competitor UI Benchmarking

Direct screenshots of Manus and Browser-Use Cloud were reviewed (Feb 24, 2026):

| Product | Layout pattern | Browser visible? | Reasoning visible? | Voice? |
|---|---|---|---|---|
| Manus | Centered chat thread + collapsed step accordion + inline frozen thumbnail | No (tiny snapshot only) | No (flat text log) | Mic icon in input only |
| Browser-Use Cloud | ChatGPT-paradigm centered input + skill marketplace | No (headless) | No | No |

**Key market finding:** Every competitor has converged on the chat paradigm. No competitor shows a live browser view, semantic step-state colors, per-step confidence badges, or an always-on voice affordance.

### Chosen Direction: Command Center (Direction 1)

Direction 1 selected as the primary layout with one borrowed pattern from Manus's live session.

**Layout specification:**
```
+----------------------------------+--------------------+
|  Browser View (flex-grow)        |  Thinking Panel    |
|  - live Playwright iframe        |  (400px fixed)     |
|  - executing step overlay badge  |  [Step tree]       |
|  - element highlight on hover    |  [Confidence Bdgs] |
|                                  |  [Voice waveform]  |
|                                  |  [Audit log tab]   |
+----------------------------------+--------------------+
|  Task Input Bar (full-width fixed bottom, 64px)        |
+--------------------------------------------------------+
```

**Borrowed from Manus:** Expandable/collapsible sub-step tree inside the thinking panel. ARIA adds confidence scoring and voice reactivity on top.

### Design Rationale

| Criterion | Score | Why it wins |
|---|---|---|
| Layout intuitiveness | 5/5 | Browser-dominant mirrors how users think about the task |
| Voice state visibility | 5/5 | Waveform always in thinking panel header - never hidden |
| Barge-in readiness | 5/5 | Voice waveform + violet barge-in signal = interrupt affordance is structural |
| Confidence signal legibility | 5/5 | Fixed-width thinking panel provides dedicated space for badge + label per step |
| Demo camera-readiness | 4/5 | Live browser + colored signal states = visually dynamic on screen recording |
| Novice accessibility | 4/5 | Browser view gives spatial context; thinking panel gives textual guidance |

**Differentiators visible vs. competitors:**
1. Live browser is actually visible - judges see ARIA working in real time
2. Semantic signal colors (blue executing / violet barge-in / amber warning / green done)
3. Per-step confidence badges - no competitor surfaces this
4. Always-present voice waveform - barge-in is a structural affordance, not a hidden gesture

### Implementation Approach

- **Browser panel:** Playwright-controlled Chromium screenshot stream via WebSocket at 30fps
- **Thinking panel:** React component subscribing to ADK observability stream; steps as live-updating list with signal-* color classes
- **Voice waveform:** Web Audio API AnalyserNode to Canvas renderer in thinking panel header; always active
- **Task input bar:** Fixed bottom-0 full-width bar with text input + mic button + active task status pill; 64px height
- **Responsive breakpoint:** Below 1280px, thinking panel collapses to bottom sheet
- **State transition:** signal-executing to signal-pause triggers thinking panel header glow animation (200ms ease-out)


---
