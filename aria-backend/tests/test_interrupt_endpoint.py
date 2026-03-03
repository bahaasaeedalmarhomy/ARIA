"""
Unit tests for POST /api/task/{session_id}/interrupt endpoint.

Story 3.6 AC: 4, 5
Tests:
  1. POST /{session_id}/interrupt returns 200 with {"interrupted": true}
  2. After interrupt, get_cancel_flag(session_id).is_set() returns True
  3. After interrupt, is_user_cancel(session_id) returns True
  4. run_executor — when cancel flag + user_cancel_flag set, emits task_failed with reason "user_cancelled" and updates status to "cancelled"
  5. run_executor — when only cancel flag set (barge-in, no user_cancel), emits task_paused (regression guard)
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from main import app

client = TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Test 1: POST /interrupt returns 200 with interrupted: true
# ---------------------------------------------------------------------------

def test_interrupt_returns_200():
    response = client.post("/api/task/sess_test_interrupt/interrupt")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["interrupted"] is True
    assert body["error"] is None


# ---------------------------------------------------------------------------
# Test 2: After interrupt, get_cancel_flag().is_set() returns True
# ---------------------------------------------------------------------------

def test_interrupt_sets_cancel_flag():
    from services.session_service import get_cancel_flag, reset_cancel_flag

    session_id = "sess_cancel_flag_test"
    # Start with a clean state
    reset_cancel_flag(session_id)
    assert not get_cancel_flag(session_id).is_set()

    client.post(f"/api/task/{session_id}/interrupt")

    assert get_cancel_flag(session_id).is_set()


# ---------------------------------------------------------------------------
# Test 3: After interrupt, is_user_cancel(session_id) returns True
# ---------------------------------------------------------------------------

def test_interrupt_sets_user_cancel_flag():
    from services.session_service import is_user_cancel, reset_cancel_flag, clear_user_cancel_flag

    session_id = "sess_user_cancel_test"
    reset_cancel_flag(session_id)
    clear_user_cancel_flag(session_id)
    assert not is_user_cancel(session_id)

    client.post(f"/api/task/{session_id}/interrupt")

    assert is_user_cancel(session_id)


# ---------------------------------------------------------------------------
# Test 4: run_executor with user_cancel_flag → emits task_failed with "user_cancelled"
#         and updates session status to "cancelled"
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_executor_user_cancel_emits_task_failed_cancelled():
    """
    When BargeInException is raised and is_user_cancel() is True,
    task_failed SSE with reason='user_cancelled' is emitted and
    status is updated to 'cancelled'.
    """
    from tools.playwright_computer import BargeInException

    _SESSION_ID = "sess_user_cancel_exec_test"

    _SAMPLE_STEP_PLAN = {
        "task_summary": "Test task",
        "steps": [
            {
                "step_index": 0,
                "description": "Navigate",
                "action": "navigate",
                "target": "https://example.com",
                "value": "",
                "confidence": 0.9,
                "is_destructive": False,
                "requires_user_input": False,
                "user_input_reason": "",
            }
        ],
    }

    mock_adk_session = MagicMock()
    mock_adk_session.id = "adk-session-x"

    with (
        patch("services.executor_service.PlaywrightComputer") as MockPC,
        patch("services.executor_service.LlmAgent"),
        patch("services.executor_service.ComputerUseToolset"),
        patch("services.executor_service.InMemorySessionService") as MockSessionSvc,
        patch("services.executor_service.Runner") as MockRunner,
        patch("services.executor_service.emit_event") as mock_emit,
        patch("services.executor_service.build_executor_context", return_value="ctx"),
        patch("services.executor_service.handle_task_complete", new_callable=AsyncMock) as mock_htc,
        patch("services.executor_service.update_session_status", new_callable=AsyncMock) as mock_update,
        patch("services.executor_service.upload_screenshot", new_callable=AsyncMock, return_value=""),
        patch("services.executor_service.is_user_cancel", return_value=True),
        patch("services.executor_service.clear_user_cancel_flag"),
    ):
        mock_pc = AsyncMock()
        mock_pc.screenshot = AsyncMock(return_value=b"\x89PNG")
        mock_pc.detect_captcha = AsyncMock(return_value=False)
        MockPC.return_value = mock_pc

        mock_svc = AsyncMock()
        mock_svc.create_session = AsyncMock(return_value=mock_adk_session)
        MockSessionSvc.return_value = mock_svc

        async def _raise_barge_in(**kwargs):
            raise BargeInException("user cancel")
            yield  # make it an async generator

        mock_runner = MagicMock()
        mock_runner.run_async = MagicMock(side_effect=lambda **kw: _raise_barge_in(**kw))
        MockRunner.return_value = mock_runner

        from services.executor_service import run_executor
        await run_executor(_SESSION_ID, _SAMPLE_STEP_PLAN)

    # Verify task_failed with reason "user_cancelled" was emitted
    failed_calls = [
        c for c in mock_emit.call_args_list if c.args[1] == "task_failed"
    ]
    assert len(failed_calls) == 1
    payload = failed_calls[0].args[2]
    assert payload["reason"] == "user_cancelled"

    # Verify status updated to "cancelled"
    cancelled_calls = [
        c for c in mock_update.call_args_list if "cancelled" in c.args
    ]
    assert len(cancelled_calls) == 1

    # handle_task_complete must NOT be called
    mock_htc.assert_not_called()


# ---------------------------------------------------------------------------
# Test 5: run_executor with only barge-in (no user_cancel) → emits task_paused (regression)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_executor_barge_in_without_user_cancel_emits_task_paused():
    """
    When BargeInException is raised but is_user_cancel() is False (plain barge-in),
    task_paused is emitted instead of task_failed — regression guard.
    """
    from tools.playwright_computer import BargeInException

    _SESSION_ID = "sess_barge_in_regression"

    _SAMPLE_STEP_PLAN = {
        "task_summary": "Test task",
        "steps": [
            {
                "step_index": 0,
                "description": "Navigate",
                "action": "navigate",
                "target": "https://example.com",
                "value": "",
                "confidence": 0.9,
                "is_destructive": False,
                "requires_user_input": False,
                "user_input_reason": "",
            }
        ],
    }

    mock_adk_session = MagicMock()
    mock_adk_session.id = "adk-session-y"

    with (
        patch("services.executor_service.PlaywrightComputer") as MockPC,
        patch("services.executor_service.LlmAgent"),
        patch("services.executor_service.ComputerUseToolset"),
        patch("services.executor_service.InMemorySessionService") as MockSessionSvc,
        patch("services.executor_service.Runner") as MockRunner,
        patch("services.executor_service.emit_event") as mock_emit,
        patch("services.executor_service.build_executor_context", return_value="ctx"),
        patch("services.executor_service.handle_task_complete", new_callable=AsyncMock),
        patch("services.executor_service.update_session_status", new_callable=AsyncMock) as mock_update,
        patch("services.executor_service.upload_screenshot", new_callable=AsyncMock, return_value=""),
        patch("services.executor_service.is_user_cancel", return_value=False),
        patch("services.executor_service.clear_user_cancel_flag"),
    ):
        mock_pc = AsyncMock()
        mock_pc.screenshot = AsyncMock(return_value=b"\x89PNG")
        mock_pc.detect_captcha = AsyncMock(return_value=False)
        MockPC.return_value = mock_pc

        mock_svc = AsyncMock()
        mock_svc.create_session = AsyncMock(return_value=mock_adk_session)
        MockSessionSvc.return_value = mock_svc

        async def _raise_barge_in(**kwargs):
            raise BargeInException("barge-in")
            yield

        mock_runner = MagicMock()
        mock_runner.run_async = MagicMock(side_effect=lambda **kw: _raise_barge_in(**kw))
        MockRunner.return_value = mock_runner

        from services.executor_service import run_executor
        await run_executor(_SESSION_ID, _SAMPLE_STEP_PLAN)

    # task_paused emitted, NOT task_failed
    paused_calls = [c for c in mock_emit.call_args_list if c.args[1] == "task_paused"]
    failed_calls = [c for c in mock_emit.call_args_list if c.args[1] == "task_failed"]
    assert len(paused_calls) == 1
    assert len(failed_calls) == 0

    # Status updated to "paused"
    paused_status_calls = [c for c in mock_update.call_args_list if "paused" in c.args]
    assert len(paused_status_calls) == 1
