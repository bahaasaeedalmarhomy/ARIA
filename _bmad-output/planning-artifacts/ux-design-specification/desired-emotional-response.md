# Desired Emotional Response

### Primary Emotional Goals

The primary emotional state ARIA must create is **calm confidence** — not the excitement of a magic trick, but the quiet satisfaction of watching a competent colleague handle something reliably while you remain present and in control. Users should feel like a director, not a passenger.

### Emotional Journey Mapping

| Stage | Desired Feeling | Trigger |
|---|---|---|
| First task assignment | Curious, hopeful | Simple voice input with immediate response |
| Step plan appears | Reassured | Visible ordered plan before any action starts |
| First browser action executes | Impressed, believing | Thinking panel and browser move in sync |
| Mid-execution barge-in | Empowered | ARIA stops instantly on voice; panel acknowledgment |
| Destructive action guard appears | Protected, respected | Voice + visual confirmation before irreversible action |
| Task completes | Relieved, satisfied | "Done" state + complete audit log visible |
| Reviewing audit log | Confident, documented | Timestamped record with annotated screenshots |

### Micro-Emotions

- **Reassurance over surprise** — Users should never be startled. State transitions are always announced in advance (voice + visual).
- **Competence over magic** — The thinking panel shows the work. ARIA looks thorough, not mysterious.
- **Trust through evidence** — Confidence scores and the audit log give users proof, not promises.
- **Control without effort** — Barge-in is always active. Users feel powerful without pressing anything.

### Emotions to Avoid

- **Anxiety** — "Is it about to do something I didn't want?" → Mitigated by destructive action guard and pre-execution step plan
- **Helplessness** — "How do I stop this?" → Mitigated by always-visible barge-in state and interrupt button
- **Confusion** — "What is it doing right now?" → Mitigated by thinking panel + live voice narration
- **Distrust** — "Did it actually do that correctly?" → Mitigated by annotated screenshots and confidence scoring in audit log

### Design Implications

| Desired Emotion | UX Design Approach |
|---|---|
| Calm confidence | Steady pacing in thinking panel; no jarring transitions; consistent, measured voice narration tone |
| Safety / protection | Destructive action guard mandatory in both voice and visual simultaneously; never dismissible by inaction |
| In control | Barge-in state always visible; ARIA's "Paused — listening" acknowledgment instantaneous and prominent |
| Trust in results | Audit log is complete, timestamped, screenshot-annotated — evidence the user can reference or share |
| Competence (not magic) | Step plan shown in full before execution begins; Planner's reasoning visible, never hidden |
| Relief / freedom | Task completes cleanly; "Done" state clear; no post-task required cleanup or manual verification |

### Emotional Design Principles

1. **Safety is non-negotiable** — Any design that makes users feel unsafe or unprotected is a failure, regardless of efficiency gain.
2. **Announce before you act** — Every significant state change (plan ready, step starting, confirmation needed, task done) is communicated before it happens, not after.
3. **Evidence builds trust** — Show the work. Confidence scores, annotated screenshots, and the full audit log are not optional features — they are the emotional foundation of the product.
4. **Calm is the brand** — ARIA's visual language, pacing, and voice tone should consistently signal competence and steadiness, never urgency or drama.

---
