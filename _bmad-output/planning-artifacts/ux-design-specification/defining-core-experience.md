# Defining Core Experience

### Defining Experience

ARIA's defining experience: **the user speaks while something is happening — and ARIA listens, stops, and adapts.**

This is the moment that makes ARIA a collaborator rather than a script. It is the interaction no competitor can replicate, and the one scene that validates all three hackathon judging dimensions simultaneously.

> "Just speak anytime to interrupt" — this single onboarding cue is the entire UX contract.

### User Mental Model

Users arrive with a learned mental model from every automation tool they've used: *assign task → wait → hope it worked*. They assume delegation means abandonment — that pressing Start means surrendering control.

ARIA must replace **"delegation = abandonment"** with **"delegation = collaboration."**

The thinking panel delivers the first half of this shift (visibility). The barge-in delivers the second half (control). Together they constitute a new mental model for AI task execution.

**What users love about existing solutions:** tasks complete without manual steps.
**What users hate:** can't stop mid-way, don't know what's happening, can't trust the result without verification.

ARIA addresses all three pain points simultaneously.

### Success Criteria

| Criterion | Observable Signal |
|---|---|
| User feels heard instantly | Waveform pulses within 200ms of speech detection |
| ARIA stops before doubt sets in | Execution halts within 1 second of utterance |
| ARIA confirms it understood | Voice response: "Got it — I heard you. What would you like to do?" |
| User can course-correct naturally | New instruction → plan updates → execution resumes from current browser state |
| No restart required | Same session continues from where execution paused |

### Novel UX Patterns

| Interaction | Pattern Type | Teaching Approach |
|---|---|---|
| Voice task assignment | Established (chat-like) | None needed — familiar paradigm |
| Thinking panel step progression | Novel (Perplexity-inspired) | Self-evidently legible by design |
| Always-on VAD barge-in | Novel | Single onboarding cue: "Just speak anytime to interrupt" |
| Destructive action guard (voice + visual simultaneously) | Established concept, novel dual-channel delivery | Instinctive — no teaching needed |
| Audit log as live real-time record | Established (activity feed) | Familiar metaphor — no teaching needed |

The only novel pattern requiring explicit user education is always-on VAD. One visible label in the voice indicator — "Always listening" — is sufficient to set the expectation.

### Experience Mechanics

**The barge-in flow — step by step:**

1. **Initiation:** ARIA is mid-execution. The user speaks without pressing anything — no mode, no button.
2. **Immediate acknowledgment (< 200ms):** The voice waveform pulses and shifts color to "listening" state. Visual confirmation fires before any processing completes.
3. **Execution halt (< 1s):** The Executor stops after the current action completes. The active step in the thinking panel shows "⏸ Paused." No further browser action occurs.
4. **Re-listen and confirm:** Gemini Live VAD captures the full utterance. ARIA responds in voice: *"Got it — stopping. What would you like to do?"*
5. **Plan adaptation:** The Planner receives current browser state + new instruction and produces a revised step plan. The thinking panel updates to show the new plan.
6. **Seamless resume:** Execution continues from the current browser state — no page reload, no session restart, no lost progress.

**The task assignment flow — step by step:**

1. **Initiation:** User clicks mic or types in task input field.
2. **Capture:** Voice or text task is received. Thinking panel shows "Planning..." with a subtle pulse.
3. **Plan reveal:** Planner returns ordered step plan. Steps appear in the thinking panel one by one with a brief stagger animation.
4. **Execution begins:** First step highlights in blue. Browser action starts. Voice narration begins: *"Starting with..."*
5. **Continuous feedback:** Each completed step gets a green checkmark. Active step pulses blue. Next step is visible but muted.
6. **Task complete:** Final step completes. Voice: *"Done. Here's what I did."* Audit log fully visible.

---
