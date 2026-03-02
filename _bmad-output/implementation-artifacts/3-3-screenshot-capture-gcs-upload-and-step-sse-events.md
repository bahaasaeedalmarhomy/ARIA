# Story 3.3: Screenshot Capture, GCS Upload, and Step SSE Events

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want each Executor action to emit a real-time event to my thinking panel and capture a screenshot stored in GCS,
So that I can follow along live and have a complete visual record of every action taken.

## Acceptance Criteria

1. **Given** the Executor begins a step, **When** the step starts, **Then** a `step_start` SSE event is emitted within 500ms with `payload: {step_index, action_type, description, confidence}` (NFR4).

2. **Given** a step completes, **When** the step result is available, **Then** a full-page screenshot is taken, uploaded to GCS at `sessions/{session_id}/steps/{step_index:04d}.png`, and a `step_complete` SSE event is emitted with `payload: {step_index, screenshot_url, result_summary, confidence}`.

3. **Given** a screenshot is uploaded to GCS, **When** the `screenshot_url` is received by the frontend, **Then** it renders in the active `StepItem` as a thumbnail in `ScreenshotViewer` within 300ms of receipt (NFR5).

4. **Given** a `step_error` SSE event is received, **When** the thinking panel processes it, **Then** the affected `StepItem` shows a rose error icon, the error description is displayed, and execution is paused awaiting user input.

5. **Given** a `step_start` SSE event updates the active step, **When** the thinking panel renders, **Then** the previously active step transitions to `status: "complete"` (or `"error"`) and the new step transitions to `status: "active"` with the blue pulse animation.

## Tasks / Subtasks

- [x] Task 1: Implement `gcs_service.upload_screenshot()` in `aria-backend/services/gcs_service.py` (AC: 2, 3)
  - [x] Import `asyncio`, `logging`; keep existing `GCS_BUCKET_NAME` env-var loader
  - [x] Add sync helper `_upload_sync(blob_path: str, image_bytes: bytes) -> str` that: creates `storage.Client()`, gets bucket via `client.bucket(GCS_BUCKET_NAME)`, creates blob at `f"sessions/{session_id}/steps/{step_index:04d}.png"`, calls `blob.upload_from_string(image_bytes, content_type="image/png")`, calls `blob.make_public()`, returns `blob.public_url` (`https://storage.googleapis.com/{bucket}/{path}`)
  - [x] Implement `async def upload_screenshot(session_id, step_index, image_bytes) -> str`: if `not GCS_BUCKET_NAME` or `not image_bytes` → return `""` immediately; run `_upload_sync` in executor via `asyncio.get_event_loop().run_in_executor(None, _upload_sync, blob_path, image_bytes)`; wrap in `try/except` — log error and return `""` on failure (non-fatal: screenshot failure must NOT crash execution)
  - [x] The blob path variable must be assembled before calling run_in_executor (closure over session_id + step_index should not be inside _upload_sync signature; instead compose `blob_path = f"sessions/{session_id}/steps/{step_index:04d}.png"` in the async function and pass it directly)

- [x] Task 2: Emit `step_start` and `step_complete` SSE events in `aria-backend/services/executor_service.py` (AC: 1, 2, 5)
  - [x] Add import: `from services.gcs_service import upload_screenshot`
  - [x] In the `for step in steps:` loop, immediately after extracting `current_step_index` and `step_description` (before the `for attempt in range(_MAX_STEP_ATTEMPTS):` loop), emit `step_start`:
    ```python
    emit_event(
        session_id,
        "step_start",
        {
            "step_index": current_step_index,
            "action_type": step.get("action"),
            "description": step_description,
            "confidence": step.get("confidence", 1.0),
        },
        step_index=current_step_index,
    )
    ```
  - [x] After the retry loop succeeds (`last_exc is None`), BEFORE appending to `completed_steps` and AFTER the `break`, capture screenshot and emit `step_complete`:
    ```python
    # Capture post-action screenshot for GCS and SSE step_complete
    post_screenshot_bytes = await pc.screenshot()
    screenshot_url = await upload_screenshot(session_id, current_step_index, post_screenshot_bytes)
    emit_event(
        session_id,
        "step_complete",
        {
            "step_index": current_step_index,
            "screenshot_url": screenshot_url or None,
            "result_summary": step_description,
            "confidence": step.get("confidence", 1.0),
        },
        step_index=current_step_index,
    )
    ```
  - [x] Update the `completed_steps.append(...)` call to include `confidence` and `action_type` for context continuity:
    ```python
    completed_steps.append({
        "step_index": current_step_index,
        "description": step_description,
        "action_type": step.get("action"),
        "confidence": step.get("confidence", 1.0),
        "result": "done",
        "screenshot_url": screenshot_url or None,
    })
    ```
  - [x] Note: `emit_event` is synchronous (no `await`) — `upload_screenshot` IS async and must be `await`ed
  - [x] The screenshot bytes have been captured earlier in the attempt loop for context building. Do NOT reuse the base64-encoded `screenshot_bytes` from the attempt loop as the post-action screenshot. Always call `await pc.screenshot()` fresh AFTER the ADK runner loop has completed the action — this gives an up-to-date browser state.

- [x] Task 3: Create `aria-frontend/src/components/thinking-panel/ScreenshotViewer.tsx` (AC: 3)
  - [x] Component receives `props: { screenshotUrl: string; alt?: string }`
  - [x] Render a `<div>` wrapper with class `mt-2 rounded overflow-hidden border border-border-aria`
  - [x] Inside, render `<img src={screenshotUrl} alt={alt ?? "Step screenshot"} className="w-full h-auto max-h-32 object-cover object-top" loading="lazy" />`
  - [x] Export as named export `ScreenshotViewer` and default export
  - [x] Add `data-testid="screenshot-viewer"` on the wrapper div
  - [x] No modal/lightbox in this story (that is Story 3.6's `ScreenshotViewer` with full-resolution modal)

- [x] Task 4: Extend `aria-frontend/src/components/thinking-panel/StepItem.tsx` to display screenshot (AC: 3, 4, 5)
  - [x] Import `ScreenshotViewer` from `"./ScreenshotViewer"`
  - [x] After the existing step content div, add a conditional screenshot section:
    ```tsx
    {step.status === "complete" && step.screenshot_url && (
      <ScreenshotViewer screenshotUrl={step.screenshot_url} alt={`Screenshot for step ${step.step_index + 1}`} />
    )}
    ```
  - [x] The `step.screenshot_url` field already exists on `PlanStep` in `aria.ts` with type `string | null | undefined` — no type changes needed
  - [x] The error state (rose icon with `X`) is already rendered by the existing `statusIcon` switch — no changes needed for AC 4 visual
  - [x] Ensure the screenshotViewer renders below the main step row content (description + badge), not inside the flex row

- [x] Task 5: Write unit tests for `gcs_service.upload_screenshot` in `aria-backend/tests/test_gcs_service.py` (AC: 2)
  - [x] Test: `upload_screenshot` with `GCS_BUCKET_NAME=""` → returns `""` without calling `storage.Client`
  - [x] Test: `upload_screenshot` with empty `image_bytes=b""` → returns `""` without calling `storage.Client`
  - [x] Test: `upload_screenshot` with valid inputs → calls `_upload_sync` via executor; assert `bucket.blob` called with `f"sessions/sess_abc/steps/0003.png"` for `step_index=3`
  - [x] Test: `upload_screenshot` returns `blob.public_url` when GCS succeeds
  - [x] Test: `upload_screenshot` returns `""` when `_upload_sync` raises an exception (non-fatal)
  - [x] Mock `google.cloud.storage.Client` via `unittest.mock.patch`; do NOT import the real client in tests
  - [x] Use `@pytest.mark.asyncio` and `AsyncMock`/`patch` patterns consistent with existing test files

- [x] Task 6: Write/update unit tests for SSE events in `aria-backend/tests/test_executor_service.py` (AC: 1, 2)
  - [x] Test: `run_executor` — verify `step_start` SSE event is emitted for each step with correct `step_index`, `action_type`, `description`, `confidence`
  - [x] Test: `run_executor` — verify `step_complete` SSE event is emitted after each successful step with correct `step_index` and `screenshot_url` from `upload_screenshot`
  - [x] Test: `run_executor` — when `upload_screenshot` returns `""`, `step_complete` SSE still emitted with `screenshot_url: None`
  - [x] Mock `upload_screenshot` via `patch("services.executor_service.upload_screenshot", new_callable=AsyncMock)`
  - [x] Existing tests for `task_paused`, `step_error`, retry logic must continue to pass — do NOT break them

- [x] Task 7: Write frontend tests for `ScreenshotViewer` and extended `StepItem` (AC: 3)
  - [x] `ScreenshotViewer.test.tsx`: renders `<img>` with correct `src` and `alt`; includes `data-testid="screenshot-viewer"` in output
  - [x] `StepItem.test.tsx`: add test that `ScreenshotViewer` is rendered when `step.status === "complete"` and `screenshot_url` is set; add test that `ScreenshotViewer` is NOT rendered when `screenshot_url` is null
  - [x] Follow existing test patterns in `StepItem.test.tsx` (Vitest + React Testing Library pattern)

- [x] Task 8: Git commit
  - [x] `git add -A && git commit -m "feat(story-3.3): screenshot capture, GCS upload, and step SSE events"`

## Dev Notes

### Current State — What Already Exists vs. What Story 3.3 Builds

| File | Current State | Story 3.3 Action |
|---|---|---|
| `services/gcs_service.py` | **STUB** — `upload_screenshot` returns `""` always | Implement real GCS upload (Task 1) |
| `services/executor_service.py` | Executes steps but emits NO `step_start`/`step_complete` events | Add SSE events + upload_screenshot calls (Task 2) |
| `services/sse_service.py` | **COMPLETE** — `emit_event()` fully implemented and synchronous | Import and call as-is |
| `tools/playwright_computer.py` | **COMPLETE** — `screenshot()` returns PNG bytes via `_current_screenshot()` | Call `await pc.screenshot()` after each step |
| `components/thinking-panel/ScreenshotViewer.tsx` | **DOES NOT EXIST** | Create from scratch (Task 3) |
| `components/thinking-panel/StepItem.tsx` | Shows status icon + confidence badge only | Add ScreenshotViewer render when screenshot_url present (Task 4) |
| `lib/hooks/useSSEConsumer.ts` | **Already handles** `step_start` (sets `status: "active"`) and `step_complete` (sets `status: "complete"`, stores `screenshot_url`) | No changes needed |
| `types/aria.ts` | `PlanStep.screenshot_url?: string \| null` already defined | No changes needed |
| `handlers/audit_writer.py` | **STUB** — `write_audit_log` is a no-op | **DO NOT TOUCH** — Story 3.5 responsibility |

**DO NOT TOUCH:**
- `handlers/audit_writer.py` — stub intentionally left for Story 3.5
- `lib/hooks/useSSEConsumer.ts` — step_start and step_complete handlers already correctly implemented
- `types/aria.ts` — screenshot_url field already on PlanStep
- `tools/playwright_computer.py` — fully complete; just call `pc.screenshot()`

### GCS Upload Implementation Details

**Path convention** (from architecture spec):
```
sessions/{session_id}/steps/{step_index:04d}.png
# Example: sessions/sess_abc123/steps/0002.png
```

**Python format string**: `f"sessions/{session_id}/steps/{step_index:04d}.png"`  
The `:04d` zero-pads to 4 digits → enables correct lexicographic ordering in GCS.

**Public URL format returned by `blob.public_url`**:
```
https://storage.googleapis.com/{GCS_BUCKET_NAME}/sessions/{session_id}/steps/{step_index:04d}.png
```

**GCS client creation** — use `storage.Client()` (ADC picks up credentials from `GOOGLE_APPLICATION_CREDENTIALS` or GCP metadata endpoint on Cloud Run). No explicit credentials needed in code.

**Blocking GCS upload in async context** — use `loop.run_in_executor(None, ...)` to avoid blocking the FastAPI event loop. Pattern:
```python
loop = asyncio.get_event_loop()
url = await loop.run_in_executor(None, _upload_sync, blob_path, image_bytes)
```

**Non-fatal failure** — if GCS upload fails (no bucket configured, ADC missing in dev, network error), log the error and return `""`. The executor must NOT abort step execution for a screenshot failure. The `step_complete` SSE event is still emitted with `screenshot_url: None`.

**Local development** — when `GCS_BUCKET_NAME` is empty string (default), `upload_screenshot` returns `""` immediately without attempting GCS access. This is the correct behavior for local dev/test environments.

### SSE Event Emit Placement in Executor Loop

The executor loop structure after Story 3.3:

```python
steps = step_plan.get("steps", [])
for step in steps:
    current_step_index = step.get("step_index", current_step_index)
    step_description = step.get("description", f"step {current_step_index}")

    # ── NEW in Story 3.3: emit step_start BEFORE retry loop ──
    emit_event(
        session_id,
        "step_start",
        {
            "step_index": current_step_index,
            "action_type": step.get("action"),
            "description": step_description,
            "confidence": step.get("confidence", 1.0),
        },
        step_index=current_step_index,
    )

    last_exc: Exception | None = None
    for attempt in range(_MAX_STEP_ATTEMPTS):
        try:
            # [existing screenshot + context + runner code unchanged]
            screenshot_bytes = await pc.screenshot()
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode() if screenshot_bytes else ""
            context = build_executor_context(step_plan, completed_steps, screenshot_b64)
            async for _event in runner.run_async(...):
                pass
            last_exc = None
            break  # Step succeeded

        except BargeInException:
            raise
        except Exception as exc:
            last_exc = exc
            # [existing retry/logging unchanged]

    if last_exc is not None:
        # [existing step_error emit + return unchanged]
        ...
        return

    # ── NEW in Story 3.3: capture screenshot + GCS upload + step_complete ──
    post_screenshot_bytes = await pc.screenshot()
    screenshot_url = await upload_screenshot(session_id, current_step_index, post_screenshot_bytes)
    emit_event(
        session_id,
        "step_complete",
        {
            "step_index": current_step_index,
            "screenshot_url": screenshot_url or None,
            "result_summary": step_description,
            "confidence": step.get("confidence", 1.0),
        },
        step_index=current_step_index,
    )
    completed_steps.append({
        "step_index": current_step_index,
        "description": step_description,
        "action_type": step.get("action"),
        "confidence": step.get("confidence", 1.0),
        "result": "done",
        "screenshot_url": screenshot_url or None,
    })
```

**Critical ordering**: `step_start` → ADK runner executes action → `step_complete` → next step's `step_start`. This is what creates the visual transition described in AC 5.

### `emit_event` Signature Reminder

```python
# services/sse_service.py — emit_event is SYNCHRONOUS (no await)
def emit_event(
    session_id: str,
    event_type: str,
    payload: dict,
    step_index: int | None = None,
) -> None:
```

Always pass `step_index=current_step_index` for step-scoped events so the frontend can correlate events with steps correctly.

### Step Plan Dict Field Names

The Planner outputs (from `planner_system.py` schema):
- `step.get("action")` → action type string (`"navigate"`, `"click"`, `"type"`, etc.) ← use this as `action_type` in SSE payload
- `step.get("confidence", 1.0)` → float 0.0–1.0
- `step.get("step_index")` → int (zero-based)
- `step.get("description")` → string

The field is `"action"` in the dict (NOT `"action_type"`). Map it to `action_type` key in the SSE payload.

### ScreenshotViewer Component — NFR5 Compliance

NFR5 requires: "Screenshot render in thinking panel < 300ms after receipt"

The browser renders the `<img>` tag as soon as `screenshot_url` is non-null in the step state. Since `useSSEConsumer.ts` already sets `step.screenshot_url` on `step_complete` and Zustand triggers a re-render, the timing depends entirely on image download speed from GCS + React re-render (typically < 50ms for re-render). The NFR5 target is achievable.

Use `loading="lazy"` on img to avoid blocking render of other steps.

### Frontend ScreenshotViewer Placement in StepItem

The screenshot thumbnail must render **below** the main content row (not inside the flex row with description + badge + status icon). Correct structure:

```tsx
<div data-testid="step-card" className={cardClasses} ...>
  <div className="shrink-0 ...">  {/* step number */} </div>
  <div className="flex-1 min-w-0 flex flex-col">  {/* ← change items-center flex to flex-col */}
    <div className="flex items-center gap-2">  {/* ← wrap existing content */}
      <span className={descriptionClasses}>{step.description}</span>
      <span className="shrink-0 ..."> {statusIcon} </span>
      <ConfidenceBadge confidence={step.confidence} />
    </div>
    {step.status === "complete" && step.screenshot_url && (
      <ScreenshotViewer screenshotUrl={step.screenshot_url} alt={`Screenshot for step ${step.step_index + 1}`} />
    )}
  </div>
</div>
```

This requires changing the inner flex div from `flex items-center gap-2` to `flex flex-col` with a nested flex row for description + icons.

### Previous Story Learnings (Story 3.2)

From [Story 3.2](../implementation-artifacts/3-2-playwright-browser-actions.md):

1. **ADK Runner session isolation**: Use `InMemorySessionService` + `Runner` per execution (already in executor_service.py). Do NOT reuse sessions across steps.
2. **emit_event is synchronous**: No `await` before `emit_event(...)` — calling it directly. This is critical — students often mistakenly add `await`.
3. **screenshot() returns empty bytes when page is None**: `_current_screenshot()` returns `b""` if `self.page` is None. Always check for falsy bytes before uploading.
4. **BargeInException re-raise pattern**: Always re-raise `BargeInException` from inner try/except to outer handler. Do NOT catch it alongside retry logic.
5. **Per-session `PlaywrightComputer`**: The module-level `executor_agent` uses a placeholder `PlaywrightComputer(session_id="")`. Never use it for actual execution — the per-session agent+computer created in `run_executor` is the real one.
6. **`asyncio.create_task` vs `await`**: The executor is launched as a background task from the router — the FastAPI endpoint returns immediately. The executor runs independently.

### Git History Context

Recent commits show the project is on `master` branch:
- `8f287a8` — feat: update status to done for Story 3.2, extract task completion handler
- `2158680` — feat(story-3.2): playwright browser actions executor service
- `a6d6fe1` — feat: update status to done for Story 3.1

Pattern established: commit message format is `feat(story-X.Y): brief description`.

### Architecture Compliance Checklist

| Constraint | Implementation |
|---|---|
| GCS path: `sessions/{session_id}/steps/{step_index:04d}.png` | ✅ enforced in `_upload_sync` |
| SSE event types: `step_start`, `step_complete` in spec | ✅ both implemented |
| `step_complete` payload: `{step_index, screenshot_url, result_summary, confidence}` | ✅ matches spec |
| `step_start` payload: `{step_index, action_type, description, confidence}` | ✅ matches spec |
| Non-fatal GCS failure | ✅ log + return `""` |
| `GCS_BUCKET_NAME` env var | ✅ already loaded in `gcs_service.py` |
| `google-cloud-storage>=2.18.0` | ✅ already in `requirements.txt` |
| Frontend renders within 300ms (NFR5) | ✅ `loading="lazy"` img tag; Zustand re-render < 50ms |
| Step transitions: previous active → complete, new → active (AC 5) | ✅ `useSSEConsumer.ts` already handles this correctly |

### Project Structure Notes

- All new files go in existing established directories — no new directories needed
- Backend test file: `aria-backend/tests/test_gcs_service.py` (new)
- Frontend component: `aria-frontend/src/components/thinking-panel/ScreenshotViewer.tsx` (new)
- Frontend test: `aria-frontend/src/components/thinking-panel/ScreenshotViewer.test.tsx` (new)
- Updates only (no new files): `services/gcs_service.py`, `services/executor_service.py`, `components/thinking-panel/StepItem.tsx`, `tests/test_executor_service.py`, `components/thinking-panel/StepItem.test.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 3.3 Acceptance Criteria]
- [Source: _bmad-output/planning-artifacts/epics.md — Architecture: GCS screenshot path convention]
- [Source: _bmad-output/planning-artifacts/epics.md — Architecture: SSE event types]
- [Source: aria-backend/services/gcs_service.py — Current stub]
- [Source: aria-backend/services/executor_service.py — Current loop structure]
- [Source: aria-backend/services/sse_service.py — emit_event signature]
- [Source: aria-backend/tools/playwright_computer.py — screenshot() method]
- [Source: aria-frontend/src/lib/hooks/useSSEConsumer.ts — step_start/step_complete handlers already wired]
- [Source: aria-frontend/src/types/aria.ts — PlanStep.screenshot_url field]
- [Source: aria-frontend/src/components/thinking-panel/StepItem.tsx — current structure to extend]
- [Source: aria-backend/requirements.txt — google-cloud-storage already present]
- [Source: aria-backend/prompts/planner_system.py — step dict field names (action, confidence, etc.)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

- Story created with comprehensive implementation guide to prevent: wrong field names (action vs action_type), blocking GCS upload in async context, using await on synchronous emit_event, screenshot failure crashing execution, StepItem layout breakage when adding ScreenshotViewer
- **[2026-03-02] Implementation complete**: All 8 tasks implemented and tested.
  - `gcs_service.py`: Real GCS upload with non-blocking `run_in_executor`, early-return guards, non-fatal error handling
  - `executor_service.py`: `step_start` emitted before retry loop, `step_complete` (with GCS URL) emitted after successful step; `completed_steps` entries enriched with `action_type`, `confidence`, `screenshot_url`
  - `ScreenshotViewer.tsx`: New component with `data-testid`, `loading="lazy"`, `max-h-32` thumbnail
  - `StepItem.tsx`: Inner div refactored to `flex-col`, `ScreenshotViewer` conditionally rendered when `status === "complete"` and `screenshot_url` is non-null
  - Backend: 98 tests pass (5 new GCS tests + 3 new executor SSE tests)
  - Frontend: 74 tests pass (4 new ScreenshotViewer tests + 3 new StepItem tests)

### Change Log

- 2026-03-02: Implemented `gcs_service.upload_screenshot` with real GCS upload, `_upload_sync` helper, non-fatal error handling
- 2026-03-02: Added `step_start` and `step_complete` SSE events to executor loop; enriched `completed_steps` entries
- 2026-03-02: Created `ScreenshotViewer` component
- 2026-03-02: Extended `StepItem` to render `ScreenshotViewer` for completed steps with screenshots
- 2026-03-02: Added 5 unit tests for `gcs_service`, 3 new SSE tests for `executor_service`, 4 frontend tests for `ScreenshotViewer`, 3 new frontend tests for `StepItem`
- 2026-03-02: **Code review fixes** — H1: wrapped post-step `pc.screenshot()` in try/except to prevent crash on Playwright failure; M1: replaced deprecated `asyncio.get_event_loop()` with `asyncio.get_running_loop()` in gcs_service; M2: updated test_executor_service.py docstring to include Story 3.3 AC coverage

### File List

**New files:**
- `aria-backend/tests/test_gcs_service.py`
- `aria-frontend/src/components/thinking-panel/ScreenshotViewer.tsx`
- `aria-frontend/src/components/thinking-panel/ScreenshotViewer.test.tsx`

**Modified files:**
- `aria-backend/services/gcs_service.py`
- `aria-backend/services/executor_service.py`
- `aria-backend/tests/test_executor_service.py`
- `aria-frontend/src/components/thinking-panel/StepItem.tsx`
- `aria-frontend/src/components/thinking-panel/StepItem.test.tsx`
