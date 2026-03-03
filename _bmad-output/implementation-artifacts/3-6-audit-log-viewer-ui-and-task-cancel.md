# Story 3.6: Audit Log Viewer UI and Task Cancel

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to view a complete audit log of all actions after my task completes, and to be able to cancel an in-progress task,
so that I have a professional record I can reference or share, and I am never trapped in a running session.

## Acceptance Criteria

1. **Given** a task is `status: "complete"` or `"failed"`, **When** the audit log section renders, **Then** all steps are displayed in chronological order, each showing: step number, action type badge, description, timestamp, confidence badge, and a thumbnail of the associated screenshot (FR36).

2. **Given** a screenshot thumbnail in the audit log is clicked, **When** it is interacted with, **Then** the `ScreenshotModal` opens showing the full-resolution screenshot at maximum readable size, and can be closed by pressing Escape or clicking outside (AC spec: "ScreenshotViewer component opens in a modal" — implemented as `ScreenshotModal`).

3. **Given** the Firestore `onSnapshot` subscription is active during execution, **When** new steps are written to Firestore, **Then** the audit log UI updates in real time — new entries appear at the bottom within 1 second of the action completing — regardless of `panelStatus` (not only when `"complete"`).

4. **Given** a task is in progress, **When** the user clicks the "Cancel Task" button, **Then** `POST /api/task/{session_id}/interrupt` is called, the backend sets the asyncio cancel flag plus a user-cancel marker, the Executor stops after the current action, a `task_failed` SSE event with `reason: "user_cancelled"` is emitted, and the session `status` is updated to `"cancelled"` in Firestore (FR5).

5. **Given** a "Cancel Task" action completes, **When** the UI receives the `task_failed` event with `reason: "user_cancelled"`, **Then** `taskStatus` transitions to `"failed"`, the task input area resets to allow a new task, and the partial audit log remains visible in the thinking panel.

6. **Given** a session was active in the current browser tab and the user refreshes, **When** the page reloads and `localStorage` contains a `aria_session_id` key, **Then** the `useFirestoreSession` hook restores the `sessionId` to the store, rehydrates `auditLog` from the Firestore `onSnapshot` subscription, and renders the audit log in the thinking panel (cross-tab/cross-session restoration deferred from Story 3.5).

## Tasks / Subtasks

- [x] Task 1: Add user-cancel signalling to `session_service.py` (AC: 4)
  - [x] Below the existing `_cancel_flags` section (line ~84), add a parallel `_user_cancel_flags` dict:
    ```python
    # Per-session flags used to distinguish user-initiated cancel from barge-in cancel
    _user_cancel_flags: dict[str, bool] = {}

    def set_user_cancel_flag(session_id: str) -> None:
        """Mark a session as user-cancelled (called from /interrupt endpoint)."""
        _user_cancel_flags[session_id] = True

    def is_user_cancel(session_id: str) -> bool:
        """Return True if the cancel was triggered by the user via /interrupt."""
        return _user_cancel_flags.get(session_id, False)

    def clear_user_cancel_flag(session_id: str) -> None:
        """Clear the user-cancel marker (call on session reset)."""
        _user_cancel_flags.pop(session_id, None)
    ```
  - [x] In `reset_cancel_flag` (line ~99), also call `clear_user_cancel_flag(session_id)` so flag does not persist across sessions

- [x] Task 2: Add `/interrupt` endpoint to `task_router.py` (AC: 4)
  - [x] Add import at top:
    ```python
    from services.session_service import get_cancel_flag, set_user_cancel_flag
    ```
  - [x] After the existing `/{session_id}/input` endpoint, add:
    ```python
    @router.post("/{session_id}/interrupt")
    async def interrupt_task(session_id: str):
        """
        POST /api/task/{session_id}/interrupt

        Sets the per-session cancel flag so the Executor's _check_cancel() raises
        BargeInException on the next playwright action. The executor then emits
        task_failed with reason "user_cancelled" and updates Firestore status to
        "cancelled".

        No auth check — session_id is treated as the implicit ownership token (UUID v4).
        Returns 200 immediately; actual stop is async (within current action boundary).
        """
        set_user_cancel_flag(session_id)
        get_cancel_flag(session_id).set()
        return JSONResponse(
            status_code=200,
            content={"success": True, "data": {"interrupted": True}, "error": None},
        )
    ```

- [x] Task 3: Update `BargeInException` handler in `executor_service.py` to distinguish user cancel (AC: 4, 5)
  - [x] Add import:
    ```python
    from services.session_service import (
        create_session, update_session_status, get_cancel_flag,
        reset_cancel_flag, is_user_cancel, clear_user_cancel_flag,
    )
    ```
    (extend the existing `from services.session_service import ...` line — do NOT add a duplicate import)
  - [x] Find the `except BargeInException as e:` block (line ~472) and update:
    ```python
    except BargeInException as e:
        if is_user_cancel(session_id):
            logger.info(
                "User-cancelled executor for session %s at step %d",
                session_id,
                current_step_index,
            )
            emit_event(
                session_id,
                "task_failed",
                {"reason": "user_cancelled", "paused_at_step": current_step_index},
            )
            try:
                await update_session_status(session_id, "cancelled")
            except Exception:
                logger.warning("Failed to update session %s status to 'cancelled'", session_id)
            clear_user_cancel_flag(session_id)
        else:
            logger.warning(
                "Barge-in during executor for session %s at step %d: %s",
                session_id,
                current_step_index,
                e,
            )
            emit_event(
                session_id,
                "task_paused",
                {"paused_at_step": current_step_index},
            )
            try:
                await update_session_status(session_id, "paused")
            except Exception:
                logger.warning("Failed to update session %s status to 'paused'", session_id)
    ```
  - [x] In the `finally` block alongside `clear_input_queue(session_id)`, also call `clear_user_cancel_flag(session_id)` as a safety net (idempotent)

- [x] Task 4: Create `ScreenshotModal` component (AC: 2)
  - [x] Create `aria-frontend/src/components/thinking-panel/ScreenshotModal.tsx`:
    ```tsx
    "use client";

    import React from "react";
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
    } from "@/components/ui/dialog";

    type ScreenshotModalProps = {
      screenshotUrl: string;
      stepIndex: number;
      onClose: () => void;
    };

    export function ScreenshotModal({
      screenshotUrl,
      stepIndex,
      onClose,
    }: ScreenshotModalProps) {
      return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
          <DialogContent className="max-w-4xl w-full bg-surface border-border-aria p-4">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-sm font-mono">
                Screenshot — Step #{stepIndex + 1}
              </DialogTitle>
            </DialogHeader>
            <img
              src={screenshotUrl}
              alt={`Step ${stepIndex + 1} screenshot`}
              className="w-full h-auto rounded border border-border-aria"
              loading="lazy"
            />
          </DialogContent>
        </Dialog>
      );
    }
    ```
  - [x] The `Dialog` component is already present in `aria-frontend/src/components/ui/` from Epic 1 — no new installation needed. Verify with `grep -r "Dialog" aria-frontend/src/components/ui/`.

- [x] Task 5: Create `AuditLogEntry` component (AC: 1, 2, 3)
  - [x] Create `aria-frontend/src/components/thinking-panel/AuditLogEntry.tsx`:
    ```tsx
    "use client";

    import React, { useState } from "react";
    import { ConfidenceBadge } from "./ConfidenceBadge";
    import { ScreenshotModal } from "./ScreenshotModal";
    import type { FirestoreAuditStep } from "@/types/aria";

    type AuditLogEntryProps = {
      entry: FirestoreAuditStep;
    };

    // Action type → short label for badge
    const ACTION_LABELS: Record<string, string> = {
      navigate: "NAV",
      click: "CLK",
      type: "TYP",
      scroll: "SCR",
      screenshot: "SHOT",
      wait: "WAIT",
      extract: "READ",
    };

    export function AuditLogEntry({ entry }: AuditLogEntryProps) {
      const [modalOpen, setModalOpen] = useState(false);
      const actionLabel = ACTION_LABELS[entry.action_type ?? ""] ?? (entry.action_type ?? "ACT").toUpperCase().slice(0, 4);

      // Format ISO timestamp to HH:MM:SS display
      const timeDisplay = entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : null;

      return (
        <li
          className="flex flex-col gap-1 py-2 border-b border-border-aria last:border-0"
          data-testid={`audit-entry-${entry.step_index}`}
        >
          <div className="flex items-start gap-2">
            <span className="text-text-disabled shrink-0 font-mono text-xs w-5 text-right">
              #{entry.step_index + 1}
            </span>
            <span className="bg-raised text-text-secondary text-xs font-mono px-1.5 py-0.5 rounded shrink-0">
              {actionLabel}
            </span>
            <span className="flex-1 text-xs font-mono text-text-primary leading-relaxed">
              {entry.description}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <ConfidenceBadge confidence={entry.confidence} />
              {timeDisplay && (
                <span className="text-text-disabled text-xs font-mono">{timeDisplay}</span>
              )}
            </div>
          </div>

          {entry.screenshot_url && (
            <div className="pl-7">
              <button
                type="button"
                aria-label={`View screenshot for step ${entry.step_index + 1}`}
                className="rounded overflow-hidden border border-border-aria hover:border-blue-500 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={() => setModalOpen(true)}
              >
                <img
                  src={entry.screenshot_url}
                  alt={`Step ${entry.step_index + 1} thumbnail`}
                  className="w-48 h-auto max-h-24 object-cover object-top block"
                  loading="lazy"
                />
              </button>
            </div>
          )}

          {modalOpen && entry.screenshot_url && (
            <ScreenshotModal
              screenshotUrl={entry.screenshot_url}
              stepIndex={entry.step_index}
              onClose={() => setModalOpen(false)}
            />
          )}
        </li>
      );
    }
    ```

- [x] Task 6: Create `CancelTaskButton` component (AC: 4, 5)
  - [x] Create `aria-frontend/src/components/session/CancelTaskButton.tsx`:
    ```tsx
    "use client";

    import React, { useState } from "react";
    import { Button } from "@/components/ui/button";
    import { useARIAStore } from "@/lib/store/aria-store";

    export function CancelTaskButton() {
      const { sessionId, taskStatus } = useARIAStore();
      const [isCancelling, setIsCancelling] = useState(false);

      if (taskStatus !== "running" && taskStatus !== "paused" && taskStatus !== "awaiting_input") {
        return null;
      }

      const handleCancel = async () => {
        if (!sessionId || isCancelling) return;
        setIsCancelling(true);
        try {
          await fetch(`/api/task/${sessionId}/interrupt`, { method: "POST" });
        } catch {
          // Fire-and-forget: the SSE task_failed event will update state
        } finally {
          setIsCancelling(false);
        }
      };

      return (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
          onClick={handleCancel}
          disabled={isCancelling}
          data-testid="cancel-task-button"
          aria-label="Cancel current task"
        >
          {isCancelling ? "Cancelling…" : "Cancel Task"}
        </Button>
      );
    }
    ```
  - [x] Mount `CancelTaskButton` in `TaskInput.tsx` — add import and render it below the form, visible when `taskStatus !== "idle"`:
    ```tsx
    import { CancelTaskButton } from "./CancelTaskButton";
    // ... inside return, after the form closing tag:
    <CancelTaskButton />
    ```

- [x] Task 7: Upgrade audit log rendering in `ThinkingPanel.tsx` (AC: 1, 2, 3)
  - [x] Add import for `AuditLogEntry`:
    ```tsx
    import { AuditLogEntry } from "./AuditLogEntry";
    ```
  - [x] Replace the existing `{panelStatus === "complete" && auditLog.length > 0 && ...}` block with a version that renders during execution too, and uses `AuditLogEntry` for each entry:
    ```tsx
    {auditLog.length > 0 && (
      <div className="mt-4 pt-3 border-t border-border-aria" data-testid="audit-log-section">
        <p className="text-xs text-text-secondary mb-2 font-medium">
          Audit Log — {auditLog.length} step{auditLog.length !== 1 ? "s" : ""} recorded
        </p>
        <ul className="flex flex-col" role="list" aria-label="Audit log">
          {auditLog.map((entry) => (
            <AuditLogEntry key={entry.step_index} entry={entry} />
          ))}
        </ul>
      </div>
    )}
    ```
  - [x] Remove the old `[screenshot]` text span implementation — the new `AuditLogEntry` replaces it fully

- [x] Task 8: Implement localStorage session restoration in `useFirestoreSession.ts` (AC: 6)
  - [x] Open `aria-frontend/src/lib/hooks/useFirestoreSession.ts`
  - [x] After the initial `sessionId` is resolved from the store, add a restoration check:
    - On mount, if `sessionId` is null, read `localStorage.getItem("aria_session_id")`
    - If found, set `sessionId` in the store via `useARIAStore.setState({ sessionId: storedId })`
    - The existing `onSnapshot` subscription will then fire automatically on the restored `sessionId`
  - [x] When `sessionId` is set (either initially or restored), write it to `localStorage.setItem("aria_session_id", sessionId)`
  - [x] When `panelStatus` transitions to `"complete"` or `"failed"`, optionally call `localStorage.removeItem("aria_session_id")` to clear stale keys (prevents showing old audit log on truly new sessions)
  - [x] CRITICAL: Do NOT write `sessionId` to localStorage during SSR. Guard all `localStorage` access with `typeof window !== "undefined"` checks (Next.js 14 App Router SSR safety)

- [x] Task 9: Add `"cancelled"` to Firestore session status values (AC: 4)
  - [x] In `aria-backend/services/session_service.py`, the `update_session_status` function accepts any string `status` — no enum to update
  - [x] In `aria-frontend/src/types/aria.ts`, add `"cancelled"` to `TaskStatus` union:
    ```typescript
    export type TaskStatus =
      | "idle"
      | "running"
      | "paused"
      | "awaiting_confirmation"
      | "awaiting_input"
      | "completed"
      | "failed"
      | "cancelled"; // AC: 4 — user-initiated cancel
    ```
  - [x] In `aria-frontend/src/lib/hooks/useSSEConsumer.ts`, ensure `task_failed` with `reason: "user_cancelled"` transitions `taskStatus` to `"failed"` (the existing `task_failed` handler already sets `taskStatus: "failed"` regardless of reason — verify no change needed)

- [x] Task 10: Write tests (AC: 1–6)
  - [x] **Backend** — create `aria-backend/tests/test_interrupt_endpoint.py`:
    - Test 1: `POST /{session_id}/interrupt` returns 200 with `{"interrupted": true}`
    - Test 2: After interrupt, `get_cancel_flag(session_id).is_set()` returns True
    - Test 3: After interrupt, `is_user_cancel(session_id)` returns True
    - Test 4: `run_executor` — when cancel flag + user_cancel_flag are set, emits `task_failed` with `reason: "user_cancelled"` and calls `update_session_status("cancelled")`  (mock `BargeInException`)
    - Test 5: `run_executor` — when ONLY cancel flag is set (barge-in), still emits `task_paused` (regression guard)
  - [x] **Frontend** — `AuditLogEntry.test.tsx` (create):
    - Test 1: Renders step number, action badge, description, confidence badge
    - Test 2: Screenshot thumbnail is visible when `screenshot_url` is non-null
    - Test 3: Clicking thumbnail opens `ScreenshotModal`
    - Test 4: No thumbnail when `screenshot_url` is null
  - [x] **Frontend** — `CancelTaskButton.test.tsx` (create):
    - Test 1: Returns null when `taskStatus === "idle"`
    - Test 2: Renders "Cancel Task" when `taskStatus === "running"`
    - Test 3: Calls `fetch("/api/task/{sessionId}/interrupt", { method: "POST" })` on click
    - Test 4: Shows "Cancelling…" while request is in-flight
  - [x] **Frontend** — `ThinkingPanel.test.tsx` additions:
    - Test: Audit log renders during execution (`panelStatus === "executing"`) when `auditLog.length > 0`
    - Test: `AuditLogEntry` components are rendered (one per entry)
    - Test: Audit log does NOT render when `auditLog` is empty
  - [x] **Frontend** — `useFirestoreSession.test.ts` additions:
    - Test: On mount with null `sessionId`, reads from `localStorage` and sets store `sessionId`
    - Test: When `sessionId` is set, writes to `localStorage`

## Dev Notes

### Cancel Mechanism Architecture

The cancel flow uses two cooperative flags in `session_service.py`:
- `_cancel_flags[session_id]` — `asyncio.Event`, polled by `PlaywrightComputer._check_cancel()` before/after every `await`; raises `BargeInException` when set
- `_user_cancel_flags[session_id]` — plain `bool`, inspected in the `BargeInException` catch block in `executor_service.py` to route between `task_paused` (barge-in) and `task_failed{reason: "user_cancelled"}` (interrupt endpoint)

The `/interrupt` endpoint sets **both** flags atomically (no actual lock needed — CPython GIL + single-event-loop FastAPI). The executor's `BargeInException` handler reads `is_user_cancel()` to determine which SSE event to emit. The user-cancel flag is cleared in both the handler and the `finally` block to prevent leakage.

**CRITICAL**: Do NOT replace `BargeInException` with a different exception type — it is raised deep inside Playwright tool calls and must traverse the entire ADK call stack. The user-cancel flag approach is deliberately minimal.

### ScreenshotViewer vs. ScreenshotModal

The existing `ScreenshotViewer` component (`ScreenshotViewer.tsx`) renders an inline image with a fixed `max-h-32` thumbnail height — it is used by `StepItem.tsx` for in-step screenshot display and must NOT be modified. Story 3.6 adds a separate `ScreenshotModal` component for the full-resolution modal in the audit log. This avoids any regression to `StepItem`.

### Audit Log Real-Time Updates

The `useFirestoreSession` hook already uses `onSnapshot` which fires on every Firestore document update. By removing the `panelStatus === "complete"` guard from the audit log render, users see new entries as they stream in during execution. The `onSnapshot` fires within ~500ms of each `write_audit_log` call (Firestore SDK default polling + push; well within the 1-second AC requirement).

### localStorage Session Restoration

The previous story (3.5) explicitly deferred cross-tab/cross-session restoration. This story implements it. Key constraints:
- The `useFirestoreSession` hook is a React hook → runs only client-side. Guard `localStorage` with `typeof window !== "undefined"` for Next.js SSR safety.
- Only restore if the hook finds `sessionId === null` in the store. Do NOT overwrite an active session.
- On session completion/failure, clear the localStorage key so stale sessions don't persist.

### Dialog Component Availability

The `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` components from Radix UI are already installed and used by `TaskInput.tsx`. `ScreenshotModal` uses the same primitives — no new `npm install` required.

### `ConfidenceBadge` Reuse

`ConfidenceBadge` from Story 2.4 accepts a `confidence` float and renders emerald/amber/rose pills. It is reused directly inside `AuditLogEntry` — import from `"./ConfidenceBadge"`.

### `TaskStatus` Completeness for `CancelTaskButton`

`CancelTaskButton` renders for `taskStatus` values: `"running"`, `"paused"`, `"awaiting_input"`. It does NOT render for `"idle"`, `"completed"`, `"failed"`, or `"cancelled"`. This means the button disappears as soon as the cancel is acknowledged (SSE `task_failed` event transitions status to `"failed"`).

### Backend Test Count Reference

After Story 3.5: 124 backend tests pass, 98 frontend tests pass. Baseline for regression verification in this story.

### Project Structure Notes

- `aria-backend/routers/task_router.py` — add `/interrupt` endpoint (Task 2)
- `aria-backend/services/session_service.py` — add user-cancel flag helpers (Task 1)
- `aria-backend/services/executor_service.py` — update `BargeInException` handler (Task 3)
- `aria-frontend/src/types/aria.ts` — add `"cancelled"` to `TaskStatus` (Task 9)
- `aria-frontend/src/components/thinking-panel/ScreenshotModal.tsx` — new (Task 4)
- `aria-frontend/src/components/thinking-panel/AuditLogEntry.tsx` — new (Task 5)
- `aria-frontend/src/components/session/CancelTaskButton.tsx` — new (Task 6)
- `aria-frontend/src/components/session/TaskInput.tsx` — mount `CancelTaskButton` (Task 6)
- `aria-frontend/src/components/thinking-panel/ThinkingPanel.tsx` — replace audit log section (Task 7)
- `aria-frontend/src/lib/hooks/useFirestoreSession.ts` — add localStorage restoration (Task 8)

### References

- [Source: aria-backend/services/session_service.py#_cancel_flags] — Pattern for `_user_cancel_flags`; `get_cancel_flag`, `reset_cancel_flag` (Task 1)
- [Source: aria-backend/tools/playwright_computer.py#_check_cancel] — How `get_cancel_flag().is_set()` triggers `BargeInException` (context only — no changes to this file)
- [Source: aria-backend/services/executor_service.py#BargeInException] — Handler to update in Task 3 (currently lines ~472–490)
- [Source: aria-backend/routers/task_router.py#/{session_id}/input] — Pattern for interrupt endpoint (Task 2)
- [Source: aria-frontend/src/components/thinking-panel/ConfidenceBadge.tsx] — Import in AuditLogEntry (Task 5)
- [Source: aria-frontend/src/components/thinking-panel/ScreenshotViewer.tsx] — Do NOT modify; `ScreenshotModal` is a separate component (Task 4)
- [Source: aria-frontend/src/components/thinking-panel/ThinkingPanel.tsx] — Audit log section replacement (Task 7)
- [Source: aria-frontend/src/components/session/TaskInput.tsx] — Mount CancelTaskButton (Task 6)
- [Source: aria-frontend/src/lib/hooks/useFirestoreSession.ts] — localStorage restoration (Task 8)
- [Source: aria-frontend/src/types/aria.ts#TaskStatus] — Add `"cancelled"` (Task 9)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6] — Epic story definition, ACs, FRs

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- ✅ Task 1: Added `_user_cancel_flags` dict, `set_user_cancel_flag`, `is_user_cancel`, `clear_user_cancel_flag` helpers to `session_service.py`. Updated `reset_cancel_flag` to also call `clear_user_cancel_flag` so flag never leaks across sessions.
- ✅ Task 2: Added `POST /api/task/{session_id}/interrupt` endpoint to `task_router.py`. Sets both cancel flag and user-cancel flag atomically. Returns 200 with `{"interrupted": true}`. No auth required (UUID session_id as ownership token).
- ✅ Task 3: Extended `session_service` import in `executor_service.py` with `is_user_cancel`, `clear_user_cancel_flag`. Updated `BargeInException` handler to branch on `is_user_cancel()` — routes to `task_failed{reason: "user_cancelled"}` + status `"cancelled"` vs `task_paused` + status `"paused"` for plain barge-in. Added `clear_user_cancel_flag` to `finally` block as safety net.
- ✅ Task 4: Created `ScreenshotModal.tsx` using existing Radix `Dialog` primitives. Opens full-resolution screenshot with Escape/outside-click close. No new dependencies.
- ✅ Task 5: Created `AuditLogEntry.tsx` with step number, action badge (NAV/CLK/TYP/SCR/SHOT/WAIT/READ), description, `ConfidenceBadge`, timestamp, and clickable screenshot thumbnail that opens `ScreenshotModal`.
- ✅ Task 6: Created `CancelTaskButton.tsx` — renders for `running`, `paused`, `awaiting_input` states only; hides instantly when `task_failed` SSE transitions to `"failed"`. Mounted in `TaskInput.tsx` below the form.
- ✅ Task 7: Replaced `ThinkingPanel.tsx` audit log section — removed `panelStatus === "complete"` guard (now renders for any status when `auditLog.length > 0`). Replaced inline `<li>` implementation with `<AuditLogEntry>` components. Removed deprecated `[screenshot]` text span.
- ✅ Task 8: Rewrote `useFirestoreSession.ts` to add 3 new `useEffect`s: (1) on mount restores `sessionId` from `localStorage` if store has none, (2) persists `sessionId` to `localStorage` whenever it changes, (3) clears `localStorage` key on `"complete"` or `"failed"` panelStatus. All `localStorage` accesses guarded with `typeof window !== "undefined"` for SSR safety.
- ✅ Task 9: Added `"cancelled"` to `TaskStatus` union in `aria.ts`. Verified `task_failed` SSE handler in `useSSEConsumer.ts` already transitions to `"failed"` regardless of reason — no change needed.
- ✅ Task 10: Created `test_interrupt_endpoint.py` (5 tests, all pass). Created `AuditLogEntry.test.tsx` (7 tests). Created `CancelTaskButton.test.tsx` (8 tests). Updated `ThinkingPanel.test.tsx` to reflect new behavior (removed old guards, added AC3 real-time tests). Added 3 localStorage restoration tests to `useFirestoreSession.test.ts`.
- Backend: 129 tests pass (up from 124 baseline, 0 regressions).
- Frontend: 121 tests pass (up from 98 baseline, 0 regressions).

### Code Review Fixes (AI)

- **H1 fix**: Added `panelStatus: "failed"` to `task_failed` SSE handler in `useSSEConsumer.ts` — localStorage cleanup on failure/cancel now works correctly.
- **H2 fix**: `task_failed` handler now reads `payload.reason` — user-initiated cancels show "Task cancelled by user" instead of generic "Task failed".
- **M1 fix**: Added 2 localStorage cleanup tests to `useFirestoreSession.test.ts` (panelStatus `"failed"` and `"complete"`).
- **M2 fix**: `CancelTaskButton` no longer resets `isCancelling` on successful fetch — stays in "Cancelling…" state until SSE hides it. Resets only on network error for retry.
- **M3 fix**: Added `useSSEConsumer.ts` and `CancelTaskButton.test.tsx` to modified files list.

### File List

**New files:**
- `aria-backend/tests/test_interrupt_endpoint.py`
- `aria-frontend/src/components/thinking-panel/ScreenshotModal.tsx`
- `aria-frontend/src/components/thinking-panel/AuditLogEntry.tsx`
- `aria-frontend/src/components/thinking-panel/AuditLogEntry.test.tsx`
- `aria-frontend/src/components/session/CancelTaskButton.tsx`
- `aria-frontend/src/components/session/CancelTaskButton.test.tsx`

**Modified files:**
- `aria-backend/services/session_service.py`
- `aria-backend/services/executor_service.py`
- `aria-backend/routers/task_router.py`
- `aria-frontend/src/types/aria.ts`
- `aria-frontend/src/components/session/TaskInput.tsx`
- `aria-frontend/src/components/session/CancelTaskButton.tsx` (review fix M2)
- `aria-frontend/src/components/session/CancelTaskButton.test.tsx` (review fix M2)
- `aria-frontend/src/components/thinking-panel/ThinkingPanel.tsx`
- `aria-frontend/src/components/thinking-panel/ThinkingPanel.test.tsx`
- `aria-frontend/src/lib/hooks/useSSEConsumer.ts` (review fix H1, H2)
- `aria-frontend/src/lib/hooks/useFirestoreSession.ts`
- `aria-frontend/src/lib/hooks/useFirestoreSession.test.ts` (review fix M1)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
