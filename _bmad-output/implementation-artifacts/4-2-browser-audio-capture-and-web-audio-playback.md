# Story 4.2: Browser Audio Capture and Web Audio Playback

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my microphone audio to stream to ARIA in real time and hear ARIA's voice responses through my speakers,
So that the voice interaction feels natural and continuous without any push-to-talk.

## Acceptance Criteria

1. **Given** a session is active and the user has not yet connected audio, **When** the voice panel renders, **Then** a "Connect Microphone" button is visible and an "Always listening" label is present below the `VoiceWaveform` component.

2. **Given** the user grants microphone permission and the session is active, **When** the voice connection is established, **Then** audio is captured using `AudioContext` + `ScriptProcessorNode` (or `AudioWorkletNode`) at 16kHz, 16-bit, mono, and raw PCM chunks are streamed over the WebSocket to `/ws/audio/{session_id}` in real time with no buffering delay.

3. **Given** audio bytes are received from the WebSocket (ARIA's TTS narration in PCM L16 format), **When** bytes arrive, **Then** they are decoded as 16-bit PCM and passed to the Web Audio API for playback, beginning within 200ms of the first byte received (NFR3 contribution).

4. **Given** the user's browser does not support `MediaDevices.getUserMedia` or `WebSocket`, **When** the voice panel renders, **Then** a fallback message is displayed: `"Voice input requires Chrome 120+ or Edge 120+"` and only the text input is available (no mic button shown).

5. **Given** the microphone stream is active, **When** the user speaks, **Then** the `VoiceWaveform` amplitude bars animate in response to the audio signal within 50ms of speech onset (driven by `AnalyserNode.getByteFrequencyData` sampled at `requestAnimationFrame` cadence of ~16ms).

## Tasks / Subtasks

- [x] Task 1: Create `aria-frontend/src/lib/ws/audioWebSocket.ts` — WebSocket audio relay client utility (AC: 2, 3)
  - [x] Export `createAudioWebSocket(sessionId: string): WebSocket` — constructs WebSocket URL from `NEXT_PUBLIC_BACKEND_URL` env var (replace `http://` → `ws://`, `https://` → `wss://`) + `/ws/audio/{sessionId}`
  - [x] The factory simply returns the native WebSocket instance — lifecycle (open/close/reconnect) is managed by `useVoice.ts`
  - [x] Handle missing `NEXT_PUBLIC_BACKEND_URL` with fallback to `ws://localhost:8080`
  - [x] Export `buildWsUrl(sessionId: string): string` as a separately testable helper

- [x] Task 2: Create `aria-frontend/src/lib/hooks/useVoice.ts` — core audio hook (AC: 1, 2, 3, 4, 5)
  - [x] **Browser capability check** (AC: 4):
    - Export `isVoiceSupported(): boolean` — returns `typeof window !== 'undefined' && !!navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices && 'WebSocket' in window`
    - Call this check at hook init to guard all audio code; if unsupported, set `voiceStatus: "disconnected"` and return early
  - [x] **Connect flow** — export `connectMicrophone()` async function (AC: 2):
    - Set `isVoiceConnecting: true` in Zustand store before getUserMedia
    - Call `navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } })` — note: browser may ignore `sampleRate: 16000` hint; capture at native rate, downsample in AudioWorklet/ScriptProcessor
    - Create `AudioContext` (store ref in `audioContextRef`)
    - Create `AnalyserNode` (`fftSize: 256`, `smoothingTimeConstant: 0.8`) and connect source → analyser
    - Start `requestAnimationFrame` loop to read `analyser.getByteFrequencyData()` → compute mean amplitude (0–255 → 0–1) → update `audioAmplitude` in Zustand (for VoiceWaveform)
    - **PCM capture via ScriptProcessorNode** (CRITICAL — see Dev Notes): implemented with downsampler and binary WS send
    - Open WebSocket via `createAudioWebSocket(sessionId)` (store ref in `wsRef`)
    - On `ws.onopen`: set `voiceStatus: "listening"`, `isVoiceConnecting: false`
    - On `ws.onmessage` (binary): process as inbound PCM audio → playback (see below)
    - On `ws.onerror` / `ws.onclose`: call disconnect cleanup; set `voiceStatus: "disconnected"`
  - [x] **PCM playback via Web Audio API** (AC: 3): gapless scheduling with `nextPlayTimeRef`, separate 24kHz playback AudioContext
  - [x] **Disconnect flow** — export `disconnectMicrophone()` (AC: 1): stops tracks, closes nodes, closes WS, cancels RAF
  - [x] Return `{ isSupported, voiceStatus, connectMicrophone, disconnectMicrophone }` from the hook
  - [x] Clean up all refs in `useEffect` return to prevent leaks on unmount

- [x] Task 3: Extend Zustand store `aria-store.ts` for audio amplitude (AC: 5)
  - [x] Add `audioAmplitude: number` (0–1) to `VoiceSlice` interface and `ARIA_INITIAL_STATE` (default `0`)
  - [x] The `useVoice` hook writes directly via `useARIAStore.setState({ audioAmplitude: value })` — follows same pattern as `useSSEConsumer`

- [x] Task 4: Create `aria-frontend/src/components/voice/VoiceWaveform.tsx` — amplitude visualizer (AC: 5)
  - [x] **5 vertical bars** only — no canvas; use CSS transitions driven by `audioAmplitude` from Zustand
  - [x] Read `voiceStatus` and `audioAmplitude` from Zustand store
  - [x] Bar heights per state as specified (idle/connecting/listening/speaking/paused/disconnected)
  - [x] `duration-[50ms]` transition for 50ms-within-speech-onset requirement (AC: 5)
  - [x] Accessibility: `role="img"` `aria-label={\`Voice activity: ${voiceStatus}\`}` `aria-live="polite"`
  - [x] Export `VoiceWaveform` as named export

- [x] Task 5: Create `aria-frontend/src/components/voice/VoiceMic.tsx` — mic control + fallback (AC: 1, 4)
  - [x] Check `isVoiceSupported()` (from `useVoice`); if false, render fallback with correct message
  - [x] If supported, render `VoiceWaveform`, "Always listening" label, and connect/disconnect button
  - [x] Button states: "Connect Microphone" → "Connecting..." (disabled) → "Disconnect" per `voiceStatus`
  - [x] Export `VoiceMic` as named export; marked `"use client"`

- [x] Task 6: Wire `useVoice` into `aria-frontend/src/app/page.tsx` and add `VoiceMic` to layout (AC: 1)
  - [x] Call `useVoice()` at the top of `Home()` alongside `useSSEConsumer()`
  - [x] Add `VoiceMic` to left panel above `TaskConfirmedBanner` + `TaskInput` with `px-4 py-3`
  - [x] Guard: `{sessionId && <VoiceMic />}`

- [x] Task 7: Write unit tests (AC: 1, 3, 4, 5)
  - [x] `aria-frontend/src/lib/ws/audioWebSocket.test.ts`: 3 tests for `buildWsUrl` — all passing
  - [x] `aria-frontend/src/lib/hooks/useVoice.test.ts`: 9 tests covering `isVoiceSupported`, `downsampleAndConvert`, connect/disconnect flows, PCM playback — all passing
  - [x] `aria-frontend/src/components/voice/VoiceMic.test.tsx`: 5 tests for fallback, connect/disconnect button states — all passing
  - [x] `aria-frontend/src/components/voice/VoiceWaveform.test.tsx`: 5 tests for role, 5 bars, aria-label, aria-live — all passing

## Dev Notes

### 🚨 CRITICAL: MediaRecorder Does NOT Produce Raw PCM

**The #1 mistake to avoid:** `MediaRecorder` produces **Opus/WebM blobs**, NOT raw PCM. The Gemini Live API requires **raw PCM L16 (16-bit, 16kHz, mono)**. Do NOT use `MediaRecorder` for audio capture in this story.

**Correct approach — ScriptProcessorNode (widely supported in all browsers):**
```typescript
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);

source.connect(processor);
processor.connect(audioContext.destination); // MUST connect or Chrome silences it

processor.onaudioprocess = (e) => {
  const float32 = e.inputBuffer.getChannelData(0);
  // audioContext.sampleRate is typically 48000 or 44100 — must downsample to 16000
  const pcm16 = downsampleAndConvert(float32, audioContext.sampleRate, 16000);
  ws.send(pcm16.buffer); // Send raw ArrayBuffer — binary WebSocket message
};
```

**Downsampling implementation:**
```typescript
function downsampleAndConvert(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Int16Array {
  const ratio = fromRate / toRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = Math.floor(i * ratio);
    const sample = Math.max(-1, Math.min(1, input[srcIndex]));
    output[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return output;
}
```

> Note: `ScriptProcessorNode` is deprecated in the Web Audio API spec but has full browser support as of Chrome 120 / Edge 120. `AudioWorkletNode` is the modern replacement but requires extra setup. For this story, `ScriptProcessorNode` is the correct choice — it is simpler and guaranteed to work in target browsers.

### Gemini Live API Audio Output Format

The Gemini Live API returns audio as **PCM L16 at 24kHz mono** by default. This is raw 16-bit little-endian PCM. The backend (`voice_handler.py`) passes it through without transcoding — the frontend receives raw bytes directly.

**Correct playback:**
```typescript
function playPcmChunk(rawBytes: ArrayBuffer, playbackContext: AudioContext, nextPlayTimeRef: { current: number }) {
  const int16 = new Int16Array(rawBytes);
  const SAMPLE_RATE = 24000; // Gemini Live output rate
  const buffer = playbackContext.createBuffer(1, int16.length, SAMPLE_RATE);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < int16.length; i++) {
    channelData[i] = int16[i] / 32768; // normalize to -1..1
  }
  const source = playbackContext.createBufferSource();
  source.buffer = buffer;
  source.connect(playbackContext.destination);
  const startTime = Math.max(playbackContext.currentTime, nextPlayTimeRef.current);
  source.start(startTime);
  nextPlayTimeRef.current = startTime + buffer.duration;
}
```

> **Gapless scheduling:** Each chunk is scheduled to start exactly when the previous one ends using `nextPlayTimeRef`. This prevents pops and gaps between chunks. Initialize `nextPlayTimeRef.current = 0`.

### AudioContext Constraints

- `AudioContext` can only be created after a user gesture (browser autoplay policy). The "Connect Microphone" button click IS the user gesture — create `AudioContext` inside `connectMicrophone()` (not at module level).
- Use two separate `AudioContext` instances: one for capture (`audioContextRef`) and one for playback (`playbackContextRef`, `sampleRate: 24000` if possible). This avoids rate conversion issues.
- On iOS/Safari: `AudioContext` may start suspended — call `playbackContext.resume()` on first message.

### WebSocket URL Construction

The backend URL from `NEXT_PUBLIC_BACKEND_URL` uses `http://` or `https://`. WebSocket requires `ws://` or `wss://`. Pattern used by `useSSEConsumer`:

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

function buildWsUrl(sessionId: string): string {
  const wsBase = BACKEND_URL
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");
  return `${wsBase}/ws/audio/${sessionId}`;
}
```

### Zustand Store Write Pattern

Follow `useSSEConsumer.ts` pattern — write directly to the store without subscribing to avoid circular dependencies:

```typescript
// Correct — direct setState from hook
useARIAStore.setState({ voiceStatus: "listening", isVoiceConnecting: false });

// Anti-pattern — do NOT use useARIAStore.getState() inside useEffect
```

### AnalyserNode for VoiceWaveform

```typescript
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
analyser.smoothingTimeConstant = 0.8;
source.connect(analyser);
// analyser does NOT need to connect to destination — it's a tap-only node

const dataArray = new Uint8Array(analyser.frequencyBinCount); // 128 bins
let rafId: number;

function updateAmplitude() {
  analyser.getByteFrequencyData(dataArray);
  const mean = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
  useARIAStore.setState({ audioAmplitude: mean / 255 }); // normalize 0–1
  rafId = requestAnimationFrame(updateAmplitude);
}
updateAmplitude();
// Cancel: cancelAnimationFrame(rafId)
```

### VoiceWaveform: CSS vs. Canvas

The architecture specifies "Canvas renderer with CSS animation fallback." For this story, implement **CSS-only** (5 divs with `transition-all duration-[50ms]`). Canvas renderer is a Story 4.3 enhancement if needed. The CSS approach satisfies the 50ms response AC because `transition-duration: 50ms` means bar height changes start animating within one paint cycle after amplitude update.

### Project Structure Notes

- `src/lib/ws/` directory: does not exist yet — create it. Architecture spec: `ws/ # WebSocket audio relay client`
- `src/lib/hooks/useVoice.ts`: place alongside `useSSEConsumer.ts` and `useFirestoreSession.ts`
- `src/components/voice/`: directory exists (`ls` shows `.gitkeep` only) — add `VoiceWaveform.tsx`, `VoiceMic.tsx` alongside `.gitkeep`
- Test files: follow the pattern `ComponentName.test.tsx` in the same directory as the component

### TypeScript Types to Extend

Add to `src/types/aria.ts` or in the store file:
```typescript
// In VoiceSlice (aria-store.ts):
interface VoiceSlice {
  voiceStatus: "idle" | "connecting" | "listening" | "speaking" | "paused" | "disconnected";
  isVoiceConnecting: boolean;
  audioAmplitude: number; // ADD THIS: 0–1 from AnalyserNode, drives VoiceWaveform bars
}
```

### No New Dependencies Required

- `AudioContext`, `ScriptProcessorNode`, `AnalyserNode`, `AudioBufferSourceNode`: native Web Audio API — no npm install
- `WebSocket`: native browser API — no npm install
- `navigator.mediaDevices.getUserMedia`: native — no npm install
- All imports are from React, Zustand, and native browser globals

### References

- Audio relay architecture: [architecture/implementation-patterns-consistency-rules.md](../_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md) — "Audio relay queue pattern" section
- WebSocket endpoint behavior: [implementation-artifacts/4-1-websocket-audio-relay-backend.md](./4-1-websocket-audio-relay-backend.md) — "Three concurrent asyncio tasks" and Gemini Live API usage sections
- Zustand store interface: [aria-frontend/src/lib/store/aria-store.ts](../../aria-frontend/src/lib/store/aria-store.ts)
- SSEConsumer hook pattern: [aria-frontend/src/lib/hooks/useSSEConsumer.ts](../../aria-frontend/src/lib/hooks/useSSEConsumer.ts)
- VoiceWaveform UX spec: [ux-design-specification/component-strategy.md](../_bmad-output/planning-artifacts/ux-design-specification/component-strategy.md) — section "1. VoiceWaveform"
- Architecture component structure: [architecture/core-architectural-decisions.md](../_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md) — "Frontend Architecture" section
- Architecture boundary rules: [architecture/project-structure-boundaries.md](../_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md)
- [Source: architecture/implementation-patterns-consistency-rules.md#WebSocket audio chunks] — "Raw PCM, 16kHz, 16-bit, mono. Fixed format — no runtime encoding negotiation."
- [Source: architecture/core-architectural-decisions.md#Frontend Architecture] — `isVoiceConnecting` as separate loading boolean
- [Source: epics.md#Story 4.2] — Acceptance criteria

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- `isVoiceSupported()` required a null-guard (`!!navigator.mediaDevices`) instead of `'mediaDevices' in navigator` to handle test environments where `mediaDevices` is set to `undefined` rather than removed entirely.
- `useVoice.test.ts` referenced `WebSocket.CONNECTING` constant before the WebSocket global stub was active — replaced with the literal value `0`.
- `page.tsx` partial replacement dropped the `return (` and `<main>` tag — fixed in two passes.

### Completion Notes List

- Task 1: `audioWebSocket.ts` — `buildWsUrl` + `createAudioWebSocket` factory. No external deps. 3 tests passing.
- Task 2: `useVoice.ts` — full connect/disconnect/playback pipeline with `ScriptProcessorNode`, `AnalyserNode` RAF loop, gapless PCM playback scheduling. `downsampleAndConvert` exported as testable pure function. 9 tests passing.
- Task 3: `aria-store.ts` — `audioAmplitude: number` added to `VoiceSlice` and initial state.
- Task 4: `VoiceWaveform.tsx` — 5-bar CSS visualizer with per-state height and color logic. `duration-[50ms]` transition. Accessibility attributes present. 5 tests passing.
- Task 5: `VoiceMic.tsx` — browser capability guard, connect/disconnect button states, "Always listening" label. 5 tests passing.
- Task 6: `page.tsx` — `useVoice()` hook mounted, `VoiceMic` renders conditionally when `sessionId` is set.
- Task 7: 22 new tests across 4 test files; all pass. Full regression suite: 19 test files, 151 tests, all passing.

### File List

- `aria-frontend/src/lib/ws/audioWebSocket.ts` — new
- `aria-frontend/src/lib/ws/audioWebSocket.test.ts` — new
- `aria-frontend/src/lib/hooks/useVoice.ts` — new
- `aria-frontend/src/lib/hooks/useVoice.test.ts` — new
- `aria-frontend/src/lib/store/aria-store.ts` — modified (added `audioAmplitude`)
- `aria-frontend/src/components/voice/VoiceWaveform.tsx` — new
- `aria-frontend/src/components/voice/VoiceWaveform.test.tsx` — new
- `aria-frontend/src/components/voice/VoiceMic.tsx` — new
- `aria-frontend/src/components/voice/VoiceMic.test.tsx` — new
- `aria-frontend/src/app/page.tsx` — modified (added `useVoice`, `VoiceMic`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (`4-2` status → review)

## Change Log

| Date | Change |
|------|--------|
| 2026-03-03 | Implemented story 4.2: audioWebSocket.ts, useVoice.ts, VoiceWaveform.tsx, VoiceMic.tsx, store audioAmplitude field, page.tsx wiring. 22 new tests added; 151 total passing. |
| 2026-03-03 | Code review: fixed 6 issues (H1: mic echo via zero-gain node, H2: playback AudioContext leak on reconnect, M1: idle→disconnected on error paths, M2: fake HTTPS→WSS test now calls buildWsUrl, M3: double-connect guard, M4: speaking→listening debounce). 151 tests still passing. |
