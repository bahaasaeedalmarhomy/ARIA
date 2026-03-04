"""
Backend tests for Story 4.5: Destructive Action Guard — Voice and Visual Confirmation.

Tests:
  1. POST /api/task/{session_id}/confirm with confirmed=true returns 200
  2. POST /api/task/{session_id}/confirm with confirmed=false returns 200
  3. POST /api/task/{session_id}/confirm returns 404 when no confirmation queue exists
  4. wait_for_confirmation() returns None after timeout
  5. Executor emits awaiting_confirmation SSE and does NOT execute step when is_destructive=True
  6. Executor emits task_paused with reason "destructive_action_cancelled" when confirmed=False
  7. Executor proceeds to execute step when confirmed=True
  8. confirmation_queue_service — create, deliver, wait_for cycle completes correctly
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from main import app

client = TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Test 1: POST /confirm with confirmed=true returns 200
# ---------------------------------------------------------------------------

def test_confirm_true_returns_200():
    from services.confirmation_queue_service import create_confirmation_queue, release_confirmation_queue

    session_id = "sess_confirm_true_test"
    create_confirmation_queue(session_id)

    try:
        response = client.post(
            f"/api/task/{session_id}/confirm",
            json={"confirmed": True},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["data"]["confirmed"] is True
        assert body["error"] is None
    finally:
        release_confirmation_queue(session_id)


# ---------------------------------------------------------------------------
# Test 2: POST /confirm with confirmed=false returns 200
# ---------------------------------------------------------------------------

def test_confirm_false_returns_200():
    from services.confirmation_queue_service import create_confirmation_queue, release_confirmation_queue

    session_id = "sess_confirm_false_test"
    create_confirmation_queue(session_id)

    try:
        response = client.post(
            f"/api/task/{session_id}/confirm",
            json={"confirmed": False},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["data"]["confirmed"] is False
        assert body["error"] is None
    finally:
        release_confirmation_queue(session_id)


# ---------------------------------------------------------------------------
# Test 3: POST /confirm returns 404 when no confirmation queue exists
# ---------------------------------------------------------------------------

def test_confirm_returns_404_no_queue():
    from services.confirmation_queue_service import release_confirmation_queue

    session_id = "sess_confirm_no_queue_test"
    release_confirmation_queue(session_id)  # ensure no queue exists

    response = client.post(
        f"/api/task/{session_id}/confirm",
        json={"confirmed": True},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "CONFIRMATION_NOT_EXPECTED"


# ---------------------------------------------------------------------------
# Test 4: wait_for_confirmation() returns None after timeout
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_wait_for_confirmation_timeout():
    from services.confirmation_queue_service import (
        create_confirmation_queue,
        wait_for_confirmation,
        release_confirmation_queue,
    )

    session_id = "sess_confirm_timeout_test"
    create_confirmation_queue(session_id)

    try:
        result = await wait_for_confirmation(session_id, timeout=0.05)
        assert result is None
    finally:
        release_confirmation_queue(session_id)


# ---------------------------------------------------------------------------
# Test 5: Executor emits awaiting_confirmation and does NOT execute step
#          when is_destructive=True and confirmed=None (timeout/no response)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_executor_emits_awaiting_confirmation_for_destructive_step():
    """Executor must emit awaiting_confirmation and halt (not execute) when is_destructive=True."""
    from services.executor_service import run_executor

    session_id = "sess_destructive_guard_test"

    step_plan = {
        "task_summary": "Test destructive guard",
        "steps": [
            {
                "step_index": 0,
                "description": "submit the purchase form",
                "action": "click",
                "target": "#submit",
                "value": None,
                "confidence": 0.9,
                "is_destructive": True,
                "requires_user_input": False,
                "user_input_reason": None,
            }
        ],
    }

    emitted_events: list[dict] = []

    def capture_emit(sid, event_type, payload=None, **kwargs):
        emitted_events.append({"event_type": event_type, "payload": payload or {}})

    mock_pc = AsyncMock()
    mock_pc.start = AsyncMock()
    mock_pc.stop = AsyncMock()
    mock_pc.screenshot = AsyncMock(return_value=b"")
    mock_pc.detect_captcha = AsyncMock(return_value=False)

    with (
        patch("services.executor_service.emit_event", side_effect=capture_emit),
        patch("services.executor_service.update_session_status", new_callable=AsyncMock),
        patch("services.executor_service.PlaywrightComputer", return_value=mock_pc),
        patch("services.confirmation_queue_service.wait_for_confirmation", new_callable=AsyncMock, return_value=None),
    ):
        await run_executor(session_id, step_plan, existing_pc=mock_pc)

    event_types = [e["event_type"] for e in emitted_events]
    assert "step_start" in event_types, "step_start must be emitted before guard"
    assert "awaiting_confirmation" in event_types, "awaiting_confirmation must be emitted"

    # Executor must NOT have proceeded to execute (no step_complete)
    assert "step_complete" not in event_types, "step must NOT be completed when unconfirmed"

    # Find the awaiting_confirmation payload
    ac_event = next(e for e in emitted_events if e["event_type"] == "awaiting_confirmation")
    assert ac_event["payload"]["step_index"] == 0
    assert "action_description" in ac_event["payload"]
    assert ac_event["payload"]["warning"] == "This action cannot be undone"


# ---------------------------------------------------------------------------
# Test 6: Executor emits task_paused with reason "destructive_action_cancelled"
#          when confirmed=False
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_executor_emits_task_paused_when_denied():
    from services.executor_service import run_executor

    session_id = "sess_destructive_denied_test"

    step_plan = {
        "task_summary": "Test denied destructive step",
        "steps": [
            {
                "step_index": 0,
                "description": "delete the record",
                "action": "click",
                "target": "#delete",
                "value": None,
                "confidence": 0.9,
                "is_destructive": True,
                "requires_user_input": False,
                "user_input_reason": None,
            }
        ],
    }

    emitted_events: list[dict] = []

    def capture_emit(sid, event_type, payload=None, **kwargs):
        emitted_events.append({"event_type": event_type, "payload": payload or {}})

    mock_pc = AsyncMock()
    mock_pc.start = AsyncMock()
    mock_pc.stop = AsyncMock()
    mock_pc.screenshot = AsyncMock(return_value=b"")
    mock_pc.detect_captcha = AsyncMock(return_value=False)

    with (
        patch("services.executor_service.emit_event", side_effect=capture_emit),
        patch("services.executor_service.update_session_status", new_callable=AsyncMock),
        patch("services.executor_service.PlaywrightComputer", return_value=mock_pc),
        patch("services.confirmation_queue_service.wait_for_confirmation", new_callable=AsyncMock, return_value=False),
    ):
        await run_executor(session_id, step_plan, existing_pc=mock_pc)

    paused_events = [e for e in emitted_events if e["event_type"] == "task_paused"]
    assert len(paused_events) == 1
    assert paused_events[0]["payload"]["reason"] == "destructive_action_cancelled"
    assert "step_complete" not in [e["event_type"] for e in emitted_events]


# ---------------------------------------------------------------------------
# Test 7: Executor proceeds to execute step when confirmed=True
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_executor_proceeds_when_confirmed():
    from services.executor_service import run_executor

    session_id = "sess_destructive_confirmed_test"

    step_plan = {
        "task_summary": "Test confirmed destructive step",
        "steps": [
            {
                "step_index": 0,
                "description": "publish the post",
                "action": "click",
                "target": "#publish",
                "value": None,
                "confidence": 0.9,
                "is_destructive": True,
                "requires_user_input": False,
                "user_input_reason": None,
            }
        ],
    }

    emitted_events: list[dict] = []

    def capture_emit(sid, event_type, payload=None, **kwargs):
        emitted_events.append({"event_type": event_type, "payload": payload or {}})

    mock_pc = AsyncMock()
    mock_pc.start = AsyncMock()
    mock_pc.stop = AsyncMock()
    mock_pc.screenshot = AsyncMock(return_value=b"fake_screenshot")
    mock_pc.detect_captcha = AsyncMock(return_value=False)

    with (
        patch("services.executor_service.emit_event", side_effect=capture_emit),
        patch("services.executor_service.update_session_status", new_callable=AsyncMock),
        patch("services.executor_service.PlaywrightComputer", return_value=mock_pc),
        patch("services.confirmation_queue_service.wait_for_confirmation", new_callable=AsyncMock, return_value=True),
        patch("services.executor_service.get_cancel_flag") as mock_cancel_flag,
        patch("services.executor_service.LlmAgent"),
        patch("services.executor_service.Runner") as mock_runner_cls,
        patch("services.executor_service.InMemorySessionService") as mock_session_svc_cls,
        patch("services.executor_service.upload_screenshot", new_callable=AsyncMock, return_value="https://example.com/shot.png"),
        patch("handlers.audit_writer.write_audit_log", new_callable=AsyncMock),
        patch("services.executor_service.handle_task_complete", new_callable=AsyncMock),
    ):
        # cancel flag not set
        mock_flag = MagicMock()
        mock_flag.is_set.return_value = False
        mock_cancel_flag.return_value = mock_flag

        # Set up ADK runner mock to yield no events
        mock_session_svc = AsyncMock()
        mock_session_svc.create_session = AsyncMock(return_value=MagicMock(id="adk_sess"))
        mock_session_svc_cls.return_value = mock_session_svc

        mock_runner = MagicMock()
        async def empty_gen(*args, **kwargs):
            return
            yield  # make it an async generator
        mock_runner.run_async = MagicMock(return_value=empty_gen())
        mock_runner_cls.return_value = mock_runner

        await run_executor(session_id, step_plan, existing_pc=mock_pc)

    event_types = [e["event_type"] for e in emitted_events]
    assert "awaiting_confirmation" in event_types
    assert "step_complete" in event_types, "step_complete must be emitted when confirmed=True"
    assert "task_paused" not in event_types


# ---------------------------------------------------------------------------
# Test 8: confirmation_queue_service — create, deliver, wait_for cycle
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_confirmation_queue_service_full_cycle():
    from services.confirmation_queue_service import (
        create_confirmation_queue,
        deliver_confirmation,
        wait_for_confirmation,
        release_confirmation_queue,
        has_confirmation_queue,
    )

    session_id = "sess_confirm_cycle_test"

    # Initially no queue
    assert not has_confirmation_queue(session_id)

    # Create queue
    q = create_confirmation_queue(session_id)
    assert has_confirmation_queue(session_id)
    assert q is not None

    # Deliver confirmation
    deliver_confirmation(session_id, True)

    # Wait should return immediately with True
    result = await wait_for_confirmation(session_id, timeout=1.0)
    assert result is True

    # Release queue
    release_confirmation_queue(session_id)
    assert not has_confirmation_queue(session_id)

    # Delivering after release is a no-op (no error)
    deliver_confirmation(session_id, False)  # should not raise


# ---------------------------------------------------------------------------
# Test 9: Executor handles barge-in during destructive confirmation wait
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_executor_barge_in_during_destructive_confirmation():
    """If cancel flag is set after user confirms, BargeInException fires before step execution."""
    from services.executor_service import run_executor

    session_id = "sess_barge_during_confirm"

    step_plan = {
        "task_summary": "Test barge-in during destructive confirmation",
        "steps": [
            {
                "step_index": 0,
                "description": "submit the purchase",
                "action": "click",
                "target": "#submit",
                "value": None,
                "confidence": 0.9,
                "is_destructive": True,
                "requires_user_input": False,
                "user_input_reason": None,
            }
        ],
    }

    emitted_events: list[dict] = []

    def capture_emit(sid, event_type, payload=None, **kwargs):
        emitted_events.append({"event_type": event_type, "payload": payload or {}})

    mock_pc = AsyncMock()
    mock_pc.start = AsyncMock()
    mock_pc.stop = AsyncMock()
    mock_pc.screenshot = AsyncMock(return_value=b"")
    mock_pc.detect_captcha = AsyncMock(return_value=False)

    with (
        patch("services.executor_service.emit_event", side_effect=capture_emit),
        patch("services.executor_service.update_session_status", new_callable=AsyncMock),
        patch("services.executor_service.PlaywrightComputer", return_value=mock_pc),
        patch("services.confirmation_queue_service.wait_for_confirmation", new_callable=AsyncMock, return_value=True),
        patch("services.executor_service.get_cancel_flag") as mock_cancel_flag,
        patch("services.executor_service.is_user_cancel", return_value=False),
        patch("services.executor_service.set_paused_step"),
        patch("services.session_service.set_browser_instance"),
        patch("services.voice_instruction_service.create_voice_instruction_queue"),
        patch("services.replan_service.wait_for_voice_instruction_and_replan", new_callable=AsyncMock),
    ):
        # Cancel flag IS set — simulates barge-in arriving during confirmation wait
        mock_flag = MagicMock()
        mock_flag.is_set.return_value = True
        mock_cancel_flag.return_value = mock_flag

        await run_executor(session_id, step_plan, existing_pc=mock_pc)

    event_types = [e["event_type"] for e in emitted_events]
    assert "awaiting_confirmation" in event_types
    assert "task_paused" in event_types, "Barge-in during confirmation must emit task_paused"
    paused = next(e for e in emitted_events if e["event_type"] == "task_paused")
    assert paused["payload"]["reason"] == "barge_in"
    assert "step_complete" not in event_types
