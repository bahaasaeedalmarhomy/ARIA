# Story 4.3: VoiceWaveform, BargeInPulse Components, and VAD Visual States

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want clear, always-visible visual feedback about ARIA's voice state at all times,
So that I always know whether ARIA is listening, speaking, executing, or paused — and can interrupt confidently.

## Acceptance Criteria

1. **Given** the session is active, **When** the `VoiceWaveform` component renders, **Then** it is permanently visible in the left sidebar of the layout (not in a modal or overlay) with an "Always listening" label.

2. **Given** ARIA is in `voiceStatus: "listening"` state, **When** the `VoiceWaveform` renders, **Then** the amplitude bars are blue (`#3B82F6` / `bg-blue-500`) and animate at low amplitude to indicate ambient listening.

3. **Given** ARIA is in `voiceStatus: "speaking"` state (TTS playing), **When** the `VoiceWaveform` renders, **Then** the bars animate at higher amplitude in emerald (`#10B981` / `bg-emerald-500`) to visually differentiate ARIA speaking from listening.

4. **Given** ARIA is in `voiceStatus: "paused"` state (barge-in active), **When** the `VoiceWaveform` renders, **Then** the bars are violet (`#A78BFA` / `bg-violet-400`) and the `BargeInPulse` ripple animation renders alongside — distinct from all other states.

5. **Given** VAD detects speech onset from the user (amplitude threshold crossed while `voiceStatus: "listening"`), **When** the detection fires, **Then** `vadActive: true` is set in the Zustand store and the `BargeInPulse` animation renders within 200ms — before any backend processing completes (immediate frontend acknowledgment per NFR/UX spec).

6. **Given** the `voiceStatus` transitions between any states, **When** the transition occurs, **Then** the waveform color and animation update within one animation frame (16ms) with no flash or broken intermediate state (driven by CSS transitions).

## Tasks / Subtasks

- [x] Task 1: Add `vadActive` to Zustand `VoiceSlice` in `aria-frontend/src/lib/store/aria-store.ts` (AC: 5)
  - [x] Add `vadActive: boolean` to `VoiceSlice` interface
  - [x] Add `vadActive: false` to `ARIA_INITIAL_STATE`

- [x] Task 2: Fix `VoiceWaveform` speaking-state color in `aria-frontend/src/components/voice/VoiceWaveform.tsx` (AC: 3)
  - [x] Change `case "speaking": return "bg-zinc-400"` → `return "bg-emerald-500"` in `getBarColor()`
  - [x] This is the ONLY change needed to VoiceWaveform — all other states are already correct

- [x] Task 3: Create `aria-frontend/src/components/voice/BargeInPulse.tsx` — ripple animation component (AC: 4, 5)
  - [x] Read `voiceStatus` and `vadActive` from Zustand store
  - [x] Compute `isVisible = voiceStatus === "paused" || vadActive === true`
  - [x] Render `null` when `isVisible` is false (do not render any DOM nodes)
  - [x] Render two concentric `animate-ping` rings (violet-400/30 inner, violet-400/15 outer with 150ms delay) + a solid `bg-violet-400` center dot (2×2) when visible
  - [x] Add `role="status"` `aria-label="Voice activity detected"` `aria-live="assertive"` on the outer wrapper
  - [x] Export `BargeInPulse` as a named export; mark `"use client"`
  - [x] See Dev Notes for exact DOM structure

- [x] Task 4: Update `aria-frontend/src/components/voice/VoiceMic.tsx` to render `BargeInPulse` (AC: 4, 5)
  - [x] Import `BargeInPulse` from `./BargeInPulse`
  - [x] Render `<BargeInPulse />` immediately after (below) `<VoiceWaveform />` in the component tree
  - [x] No conditional guard needed — `BargeInPulse` self-manages its own visibility via store state

- [x] Task 5: Add VAD threshold detection to `aria-frontend/src/lib/hooks/useVoice.ts` (AC: 5)
  - [x] Add `vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` to the hook
  - [x] Inside `startAmplitudeLoop()`, after setting `audioAmplitude`, add VAD detection logic (see Dev Notes for exact implementation)
  - [x] In the `disconnect()` cleanup function, call `clearTimeout(vadTimerRef.current)` and `useARIAStore.setState({ vadActive: false, audioAmplitude: 0 })`
  - [x] In the `useEffect` cleanup return, also clear `vadTimerRef` and reset `vadActive: false`
  - [x] Threshold: `VAD_ONSET_THRESHOLD = 0.15` (normalized 0–1); `VAD_SILENCE_DEBOUNCE_MS = 800`

- [x] Task 6: Write tests for `BargeInPulse` in `aria-frontend/src/components/voice/BargeInPulse.test.tsx` (AC: 4, 5)
  - [x] Test: does NOT render when `voiceStatus: "idle"` and `vadActive: false` (no DOM nodes)
  - [x] Test: renders when `voiceStatus: "paused"` (DOM nodes visible)
  - [x] Test: renders when `vadActive: true` (DOM nodes visible, voiceStatus can be "listening")
  - [x] Test: has `role="status"` attribute
  - [x] Test: has `aria-live="assertive"` attribute
  - Minimum 5 tests

- [x] Task 7: Extend existing `VoiceWaveform.test.tsx` for new color assertions (AC: 2, 3)
  - [x] Add test: "speaking" state bars have `bg-emerald-500` class
  - [x] Add test: "listening" state bars have `bg-blue-500` class
  - [x] Add test: "paused" state bars have `bg-violet-400` class

- [x] Task 8: Extend existing `VoiceMic.test.tsx` to verify `BargeInPulse` integration (AC: 4)
  - [x] Add test: `VoiceMic` renders `BargeInPulse` when `voiceStatus: "paused"` (confirm `role="status"` is in the DOM)
  - [x] Add test: `VoiceMic` does NOT render `BargeInPulse` when `voiceStatus: "idle"` and `vadActive: false`

## Dev Notes

### 🚨 CRITICAL: VoiceWaveform Already Exists — Do NOT Recreate It

`VoiceWaveform.tsx` was built in Story 4.2 and lives at `aria-frontend/src/components/voice/VoiceWaveform.tsx`. It already has:
- 5 vertical bars with `BAR_MULTIPLIERS = [0.6, 0.8, 1.0, 0.8, 0.6]`
- `role="img"`, `aria-label`, `aria-live="polite"`
- `transition-all duration-[50ms]` CSS class on each bar
- Color switching via `getBarColor()` function
- `animate-pulse` for "connecting" and "paused" states

**The ONLY change needed is one line: speaking color is `bg-zinc-400` but MUST be `bg-emerald-500`.**

```typescript
// BEFORE (wrong):
case "speaking":
  return "bg-zinc-400";

// AFTER (correct — emerald = signal-success #10B981):
case "speaking":
  return "bg-emerald-500";
```

Do NOT restructure, rewrite, or move this file. Minimal surgical edit only.

---

### 🚨 CRITICAL: vadActive State Must Exist Before BargeInPulse Is Used

Add `vadActive` to `VoiceSlice` BEFORE creating `BargeInPulse.tsx`. The component reads from the store — if the field doesn't exist, it will be `undefined` (falsy) but TypeScript will error.

```typescript
// aria-store.ts — VoiceSlice interface addition:
interface VoiceSlice {
  voiceStatus: "idle" | "connecting" | "listening" | "speaking" | "paused" | "disconnected";
  isVoiceConnecting: boolean;
  audioAmplitude: number; // 0–1
  vadActive: boolean;     // ← ADD THIS
}

// ARIA_INITIAL_STATE addition:
vadActive: false,
```

---

### BargeInPulse Component — Exact DOM Structure

```tsx
"use client";

import { useARIAStore } from "@/lib/store/aria-store";

export function BargeInPulse() {
  const voiceStatus = useARIAStore((state) => state.voiceStatus);
  const vadActive = useARIAStore((state) => state.vadActive);

  const isVisible = voiceStatus === "paused" || vadActive;

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-label="Voice activity detected"
      aria-live="assertive"
      className="relative flex items-center justify-center w-8 h-8"
    >
      {/* Inner ring — fast ping */}
      <span className="absolute inset-0 rounded-full bg-violet-400/30 animate-ping" />
      {/* Outer ring — delayed ping for layered ripple effect */}
      <span
        className="absolute inset-0 rounded-full bg-violet-400/15 animate-ping"
        style={{ animationDelay: "150ms" }}
      />
      {/* Solid center dot */}
      <span className="relative w-2 h-2 rounded-full bg-violet-400" />
    </div>
  );
}
```

**Important implementation notes:**
- `animate-ping` is a built-in Tailwind animation (scales to 2× and fades out, looping). Do NOT create a custom keyframe — use the stock Tailwind utility.
- The 150ms delay between rings creates a staggered ripple look — this is pure inline style, not a Tailwind class.
- The solid center dot ensures something is visible even between animation cycles (prevents the "empty pulse" gap).
- `absolute inset-0` positions each ring to fill the parent. `relative` on parent creates stacking context.
- The 200ms latency requirement (AC5) is met because:
  1. VAD detection runs inside `requestAnimationFrame` at ~16ms cadence
  2. `useARIAStore.setState({ vadActive: true })` triggers synchronous Zustand re-renders
  3. React re-render + CSS compose happens in the next frame after setState
  4. Total round-trip: ~32–50ms, well within 200ms

---

### VAD Threshold Detection in useVoice.ts

The `startAmplitudeLoop` function runs the RAF loop. Add VAD detection inside the `tick()` closure. A new `vadTimerRef` must be added to the hook refs:

```typescript
// Add to the hook's refs (at the top alongside other useRefs):
const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Constants (above the hook, file-level):
const VAD_ONSET_THRESHOLD = 0.15; // normalized amplitude 0–1
const VAD_SILENCE_DEBOUNCE_MS = 800; // ms of silence before clearing vadActive
```

Updated `startAmplitudeLoop` function:

```typescript
function startAmplitudeLoop(analyser: AnalyserNode) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function tick() {
    analyser.getByteFrequencyData(dataArray);
    const mean = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
    const amplitude = mean / 255;
    useARIAStore.setState({ audioAmplitude: amplitude });

    // VAD threshold detection — provides 200ms visual acknowledgment (AC5)
    // Only fire when in "listening" state; barge-in during speaking would be wired in Story 4.4
    const { voiceStatus } = useARIAStore.getState();
    if (voiceStatus === "listening" && amplitude > VAD_ONSET_THRESHOLD) {
      // Set vadActive immediately (within this RAF frame — ~16ms)
      if (!useARIAStore.getState().vadActive) {
        useARIAStore.setState({ vadActive: true });
      }
      // Reset the silence timer on every speech frame
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
      vadTimerRef.current = setTimeout(() => {
        useARIAStore.setState({ vadActive: false });
        vadTimerRef.current = null;
      }, VAD_SILENCE_DEBOUNCE_MS);
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }

  rafIdRef.current = requestAnimationFrame(tick);
}
```

**Critical notes:**
- `useARIAStore.getState()` is safe to call inside a non-React closure (RAF callback). It reads the current store state synchronously without subscribing.
- The `voiceStatus === "listening"` guard prevents VAD from triggering during "speaking" (ARIA's own TTS) or "paused". Story 4.4 will handle barge-in during "speaking".
- The debounce timer (800ms) prevents `vadActive` from flickering off between words. Without it, brief amplitude dips between syllables would reset the visual immediately.
- The double `!useARIAStore.getState().vadActive` guard prevents redundant `setState` calls on every speech frame.

**Update `disconnect()` cleanup:**
```typescript
function disconnect(status: "idle" | "disconnected" = "idle") {
  // ... existing cleanup ...

  // NEW: clear VAD timer and reset vadActive
  if (vadTimerRef.current) {
    clearTimeout(vadTimerRef.current);
    vadTimerRef.current = null;
  }

  useARIAStore.setState({
    voiceStatus: status,
    isVoiceConnecting: false,
    audioAmplitude: 0,
    vadActive: false,   // ← ADD THIS
  });
}
```

**Update `useEffect` cleanup return:**
```typescript
return () => {
  stopAmplitudeLoop();
  if (speakingEndTimerRef.current) clearTimeout(speakingEndTimerRef.current);
  if (vadTimerRef.current) clearTimeout(vadTimerRef.current);  // ← ADD
  useARIAStore.setState({ vadActive: false });                  // ← ADD
  streamRef.current?.getTracks().forEach((t) => t.stop());
  processorRef.current?.disconnect();
  analyserRef.current?.disconnect();
  audioContextRef.current?.close().catch(() => undefined);
  wsRef.current?.close(1000);
  playbackContextRef.current?.close().catch(() => undefined);
};
```

---

### VoiceMic Integration

Open `aria-frontend/src/components/voice/VoiceMic.tsx`. Add a single import and a single render call:

```tsx
// ADD this import at the top (after VoiceWaveform import):
import { BargeInPulse } from "./BargeInPulse";

// In the JSX return, ADD <BargeInPulse /> immediately after <VoiceWaveform />:
<div className="flex flex-col items-start gap-2">
  <VoiceWaveform />
  <BargeInPulse />          {/* ← ADD THIS */}
  <span className="text-xs text-zinc-400">Always listening</span>
  {/* ... rest of the component ... */}
</div>
```

No conditional is needed because `BargeInPulse` returns `null` when not applicable.

---

### Zustand Write Pattern (Anti-Pattern Warning)

Follow the established pattern from Stories 4.1 and 4.2:

```typescript
// ✅ CORRECT — direct setState from hook (no subscriptions)
useARIAStore.setState({ vadActive: true });

// ✅ CORRECT — reading state synchronously from non-React context (RAF/timer)
const { voiceStatus } = useARIAStore.getState();

// ❌ WRONG — do NOT use hook selectors inside RAF/timer callbacks
const voiceStatus = useARIAStore((s) => s.voiceStatus); // ← only valid in React render
```

---

### Design Tokens Reference (from UX Spec)

| Token | Color | Tailwind class | Usage in this story |
|---|---|---|---|
| signal-active | `#3B82F6` | `bg-blue-500` | Waveform bars — listening state |
| signal-success | `#10B981` | `bg-emerald-500` | Waveform bars — speaking state (FIX NEEDED) |
| signal-pause | `#A78BFA` | `bg-violet-400` | Waveform bars — paused state; BargeInPulse rings |

---

### Existing Tests — What Must NOT Break

All existing tests in these files must continue passing:
- `aria-frontend/src/components/voice/VoiceWaveform.test.tsx` — 5 tests (render, role, aria-label, idle default, aria-live)
- `aria-frontend/src/components/voice/VoiceMic.test.tsx` — 5 tests (fallback, connect button, disconnect button, connecting state, always-listening label)
- `aria-frontend/src/lib/hooks/useVoice.test.ts` — 9 tests (isVoiceSupported, downsampleAndConvert, connect/disconnect flows, PCM playback)
- `aria-frontend/src/lib/ws/audioWebSocket.test.ts` — 3 tests (buildWsUrl variants)

Adding `vadActive: false` to `ARIA_INITIAL_STATE` is backward-compatible — all existing tests use `resetStore()` which calls `useARIAStore.setState(ARIA_INITIAL_STATE)`.

---

### File Paths Summary

| File | Action | Description |
|---|---|---|
| `aria-frontend/src/lib/store/aria-store.ts` | MODIFY | Add `vadActive: boolean` to VoiceSlice + ARIA_INITIAL_STATE |
| `aria-frontend/src/components/voice/VoiceWaveform.tsx` | MODIFY | Fix speaking color `bg-zinc-400` → `bg-emerald-500` |
| `aria-frontend/src/components/voice/BargeInPulse.tsx` | CREATE | New ripple animation component |
| `aria-frontend/src/components/voice/VoiceMic.tsx` | MODIFY | Add BargeInPulse import + render |
| `aria-frontend/src/lib/hooks/useVoice.ts` | MODIFY | Add vadTimerRef + VAD threshold logic + disconnect cleanup |
| `aria-frontend/src/components/voice/BargeInPulse.test.tsx` | CREATE | 5+ tests for new component |
| `aria-frontend/src/components/voice/VoiceWaveform.test.tsx` | MODIFY | Add 3 color-state tests |
| `aria-frontend/src/components/voice/VoiceMic.test.tsx` | MODIFY | Add 2 BargeInPulse integration tests |

### Project Structure Notes

- All voice components live in `aria-frontend/src/components/voice/` — `BargeInPulse.tsx` belongs here alongside `VoiceWaveform.tsx` and `VoiceMic.tsx`
- All hooks live in `aria-frontend/src/lib/hooks/` — no new hook file needed; modify `useVoice.ts`
- Zustand store is at `aria-frontend/src/lib/store/aria-store.ts` — single store file, no slicing into separate files

### References

- VoiceWaveform component: [aria-frontend/src/components/voice/VoiceWaveform.tsx](aria-frontend/src/components/voice/VoiceWaveform.tsx)
- VoiceMic component: [aria-frontend/src/components/voice/VoiceMic.tsx](aria-frontend/src/components/voice/VoiceMic.tsx)
- Zustand store: [aria-frontend/src/lib/store/aria-store.ts](aria-frontend/src/lib/store/aria-store.ts)
- useVoice hook: [aria-frontend/src/lib/hooks/useVoice.ts](aria-frontend/src/lib/hooks/useVoice.ts)
- UX Design tokens: [Source: _bmad-output/planning-artifacts/epics.md#UX Design section]
- BargeInPulse spec: [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3 AC4 and AC5]
- Previous story notes: [Source: _bmad-output/implementation-artifacts/4-2-browser-audio-capture-and-web-audio-playback.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created
- Task 1: Added `vadActive: boolean` to `VoiceSlice` interface and `vadActive: false` to `ARIA_INITIAL_STATE` in `aria-store.ts`. Backward-compatible.
- Task 2: Fixed `VoiceWaveform` speaking-state color from `bg-zinc-400` → `bg-emerald-500`. One-line surgical edit as specified.
- Task 3: Created `BargeInPulse.tsx` with exact DOM structure from Dev Notes — two concentric `animate-ping` rings + solid center dot, full a11y attributes.
- Task 4: Updated `VoiceMic.tsx` to import and render `<BargeInPulse />` immediately after `<VoiceWaveform />`.
- Task 5: Added `vadTimerRef`, `VAD_ONSET_THRESHOLD = 0.15`, `VAD_SILENCE_DEBOUNCE_MS = 800` to `useVoice.ts`. Updated `startAmplitudeLoop()`, `disconnect()`, and `useEffect` cleanup.
- Tasks 6–8: Created `BargeInPulse.test.tsx` (7 tests), extended `VoiceWaveform.test.tsx` (+3 color tests → 8 total), extended `VoiceMic.test.tsx` (+2 BargeInPulse tests → 7 total).
- Full regression suite: **163/163 tests pass** across 20 test files. Zero regressions.

### File List

- `aria-frontend/src/lib/store/aria-store.ts` — MODIFIED: Added `vadActive: boolean` to `VoiceSlice` interface and `vadActive: false` to `ARIA_INITIAL_STATE`
- `aria-frontend/src/components/voice/VoiceWaveform.tsx` — MODIFIED: Fixed speaking-state bar color `bg-zinc-400` → `bg-emerald-500`
- `aria-frontend/src/components/voice/BargeInPulse.tsx` — CREATED: New ripple animation component with VAD visual states
- `aria-frontend/src/components/voice/VoiceMic.tsx` — MODIFIED: Added `BargeInPulse` import and render below `VoiceWaveform`
- `aria-frontend/src/lib/hooks/useVoice.ts` — MODIFIED: Added `vadTimerRef`, VAD constants, VAD threshold logic in `startAmplitudeLoop`, VAD cleanup in `disconnect()` and `useEffect` cleanup
- `aria-frontend/src/components/voice/BargeInPulse.test.tsx` — CREATED: 7 tests covering visibility logic and accessibility attributes
- `aria-frontend/src/components/voice/VoiceWaveform.test.tsx` — MODIFIED: Added 3 color-state tests (speaking=emerald-500, listening=blue-500, paused=violet-400)
- `aria-frontend/src/components/voice/VoiceMic.test.tsx` — MODIFIED: Added 2 BargeInPulse integration tests

### Change Log

- **2026-03-03**: Story 4.3 implementation complete. Added `vadActive` to Zustand VoiceSlice; created `BargeInPulse` ripple component; fixed VoiceWaveform speaking color to emerald-500; integrated BargeInPulse into VoiceMic; added VAD threshold detection (0.15 amplitude, 800ms debounce) in useVoice RAF loop; added/extended tests (22 new assertions). All 163 tests pass.
- **2026-03-03**: Code review fixes applied. M1: consolidated double `getState()` into single destructured call in RAF loop. M2: added 4 VAD detection tests to useVoice.test.ts (threshold above/below, wrong state guard, disconnect reset). M3: added `vadActive=true` integration test to VoiceMic.test.tsx. All 168 tests pass.
