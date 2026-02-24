# Core User Experience

### Defining Experience

The primary interaction loop is: speak a task → watch ARIA think and act in real-time → intervene by voice if needed → review the result. The single most critical interaction is the voice interruption moment — when a user says "wait" mid-execution and ARIA visibly, instantly stops. That moment proves the entire product thesis. Every other UI decision serves to make that moment feel natural and inevitable.

### Platform Strategy

- **Platform:** Desktop web (Next.js + Firebase Hosting), Chrome 120+ / Edge 120+ primary
- **Input modality:** Voice-primary with text fallback; mouse + keyboard for UI interactions
- **Viewport:** Minimum 1280px wide — horizontal layout required to accommodate thinking panel + live browser view side-by-side
- **Offline:** Not supported — requires live GCP connection to Gemini APIs at all times
- **Mobile:** Out of scope for MVP

### Effortless Interactions

The following must require zero user thought or friction:
- **Starting a task** — speak naturally, no configuration, no mode selection
- **Interrupting ARIA** — just speak; no button press, no mode switch, always-on VAD
- **Confirming or declining** — say "yes" or "no" to destructive action guards
- **Following along** — the thinking panel and voice narration update automatically; users never need to ask "what's happening?"
- **Reviewing results** — the audit log populates in real-time; no export step required to see what happened

### Critical Success Moments

1. **The barge-in moment** — User says "wait" → ARIA stops within 1 second → thinking panel shows "Paused — listening" → user feels they are in control. If this interaction fails, the product thesis fails with it.
2. **The first completed step** — The first browser action executes and the thinking panel updates simultaneously. This is when users believe, for the first time, that ARIA is real.
3. **The destructive action guard** — Before a form submits, ARIA speaks aloud and a confirmation modal appears. The user feels protected, not surprised. Zero silent destructive actions is non-negotiable.
4. **The audit log reveal** — At session end, a complete timestamped record with annotated screenshots appears. The user feels professional, documented, and safe.

### Experience Principles

1. **Transparency over efficiency** — Always show what ARIA is doing and why, even if it adds a beat of time. A user who understands is a user who trusts.
2. **Voice is primary, UI is parallel** — Every critical state is communicated in both voice and visually, simultaneously. Neither channel should be required alone.
3. **Control is always one word away** — The user should never feel trapped mid-execution. Barge-in feels like a natural reflex, not a special mode or escape hatch.
4. **Confidence is legible at a glance** — The thinking panel is readable in under 2 seconds without reading text — color, icons, and motion carry meaning first.
5. **Progressive trust** — First-time users (Margaret) and power users (Ravi) experience the same UI, but experts can move faster. Never force power users to wait for beginner scaffolding.

---
