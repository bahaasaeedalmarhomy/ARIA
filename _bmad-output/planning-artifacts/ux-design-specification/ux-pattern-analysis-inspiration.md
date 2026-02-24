# UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

| Product | Relevant UX Strength | Application to ARIA |
|---|---|---|
| **Perplexity AI** | Live reasoning state visibility — "Searching → Reading → Composing" before response | Thinking panel step progression; Planner decomposition animation |
| **Linear** | Extreme information density rendered calm through typography and subtle color systems | Thinking panel step items — information-rich but visually quiet |
| **Figma (multiplayer)** | Ambient live state indicators (cursors, presence) that show activity without interrupting focus | Always-visible voice waveform; active step highlight pulse |
| **Siri / Google Assistant** | Barge-in waveform acknowledgment — instant visual feedback when speech is detected | VAD-triggered waveform animation before processing begins |

### Transferable UX Patterns

**Reasoning Transparency Pattern (Perplexity):**
Disclose reasoning progressively — step-by-step as it happens, never upfront as a wall of text. Each step appears as it becomes relevant, not as a batch dump.

**Density-with-Calm Pattern (Linear):**
Rich step items (action type, confidence, status icon) can coexist without visual noise if typography hierarchy and a restrained color system carry the weight. Color means something; decoration is absent.

**Ambient Presence Pattern (Figma):**
Always-on state indicators (voice waveform, active step highlight) should live permanently in the layout — not appear on demand. Presence is continuous, not event-triggered.

**Pre-Processing Acknowledgment Pattern (Siri/Google):**
The moment VAD fires, animate the microphone/waveform before any processing result returns. Users need confirmation they were heard in under 200ms — before ARIA has paused execution.

### Anti-Patterns to Avoid

| Anti-Pattern | Reason to Avoid |
|---|---|
| Voice mode entry/exit toggle | Destroys the always-on barge-in model; forces users to pre-plan when to speak |
| Progress bar without step detail | Shows time passing, not meaning — increases anxiety without building trust |
| Silent execution | No narration + no panel updates = users feel abandoned mid-task |
| Text-only destructive confirmation | Easy to overlook; voice + visual simultaneously is the minimum |
| Hidden confidence scores | If the model is uncertain, users must know — hiding uncertainty destroys trust after the first failure |

### Design Inspiration Strategy

**Adopt directly:**
- Progressive reasoning disclosure (Perplexity) → thinking panel step-by-step reveal
- Pre-processing barge-in waveform (Siri/Google) → VAD-triggered animation before pause confirmation

**Adapt:**
- Linear's density-with-calm system → apply to step items with ARIA's confidence color vocabulary (green/amber/red)
- Figma's ambient presence model → voice state waveform always visible in layout sidebar, not in a modal or overlay

**Avoid:**
- Voice mode toggle pattern (ChatGPT/Siri app) → ARIA's VAD is always-on; no mode boundary exists
- Silent execution (Atlas/Skyvern) → narration is a core differentiator, not a feature flag

---
