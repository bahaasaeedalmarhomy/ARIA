"""
Unit tests for services/session_service.py — verifying create_session()
produces a Firestore document with the correct fields (AC4).

Run with: cd aria-backend && pytest tests/test_session_service.py -v
"""
import re
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_create_session_returns_session_id_and_stream_url():
    """create_session returns dict with session_id (sess_ prefix) and stream_url."""
    mock_doc_ref = MagicMock()
    mock_doc_ref.set = AsyncMock()

    mock_collection = MagicMock()
    mock_collection.document = MagicMock(return_value=mock_doc_ref)

    mock_db = MagicMock()
    mock_db.collection = MagicMock(return_value=mock_collection)

    with patch("services.session_service._get_db", return_value=mock_db):
        from services.session_service import create_session

        result = await create_session("test-uid-abc", "Search for cats")

    assert "session_id" in result
    assert result["session_id"].startswith("sess_")
    assert "stream_url" in result
    assert result["stream_url"] == f"/api/stream/{result['session_id']}"


@pytest.mark.asyncio
async def test_create_session_firestore_document_has_correct_fields():
    """Firestore doc must contain: session_id, uid, task_description, status, created_at, steps."""
    mock_doc_ref = MagicMock()
    mock_doc_ref.set = AsyncMock()

    mock_collection = MagicMock()
    mock_collection.document = MagicMock(return_value=mock_doc_ref)

    mock_db = MagicMock()
    mock_db.collection = MagicMock(return_value=mock_collection)

    with patch("services.session_service._get_db", return_value=mock_db):
        from services.session_service import create_session

        await create_session("uid-xyz", "Book a flight")

    # Verify Firestore .set() was called exactly once
    mock_doc_ref.set.assert_awaited_once()
    doc_data = mock_doc_ref.set.call_args[0][0]

    # Required fields per AC4
    assert doc_data["uid"] == "uid-xyz"
    assert doc_data["task_description"] == "Book a flight"
    assert doc_data["status"] == "pending"
    assert doc_data["steps"] == []

    # session_id: sess_ prefix + UUID4 format
    pattern = r"^sess_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    assert re.match(pattern, doc_data["session_id"]), f"Invalid session_id: {doc_data['session_id']}"

    # created_at: ISO 8601 with Z suffix
    assert doc_data["created_at"].endswith("Z")
    assert "T" in doc_data["created_at"]


@pytest.mark.asyncio
async def test_create_session_document_path_is_correct():
    """Firestore document must be created at sessions/{session_id}."""
    mock_doc_ref = MagicMock()
    mock_doc_ref.set = AsyncMock()

    mock_collection = MagicMock()
    mock_collection.document = MagicMock(return_value=mock_doc_ref)

    mock_db = MagicMock()
    mock_db.collection = MagicMock(return_value=mock_collection)

    with patch("services.session_service._get_db", return_value=mock_db):
        from services.session_service import create_session

        result = await create_session("uid-123", "Test task")

    # Verify collection path
    mock_db.collection.assert_called_once_with("sessions")
    # Verify document ID matches session_id
    mock_collection.document.assert_called_once_with(result["session_id"])


# ──────────────────────────────────────────────────────────────────────────────
# Cancel flag management (Story 3.1, 3.6)
# ──────────────────────────────────────────────────────────────────────────────

def test_get_cancel_flag_returns_event():
    """get_cancel_flag returns an asyncio.Event instance."""
    import asyncio
    from services.session_service import get_cancel_flag
    flag = get_cancel_flag("test-flag-event")
    assert isinstance(flag, asyncio.Event)


def test_get_cancel_flag_returns_same_instance():
    """Consecutive calls to get_cancel_flag return the same Event for a session."""
    from services.session_service import get_cancel_flag
    f1 = get_cancel_flag("test-flag-same")
    f2 = get_cancel_flag("test-flag-same")
    assert f1 is f2


def test_reset_cancel_flag_clears_event():
    """reset_cancel_flag clears the event so is_set() returns False."""
    from services.session_service import get_cancel_flag, reset_cancel_flag
    flag = get_cancel_flag("test-reset")
    flag.set()
    assert flag.is_set()
    reset_cancel_flag("test-reset")
    assert not get_cancel_flag("test-reset").is_set()


# ──────────────────────────────────────────────────────────────────────────────
# User-cancel flag management (Story 3.6)
# ──────────────────────────────────────────────────────────────────────────────

def test_set_user_cancel_flag_marks_session():
    """set_user_cancel_flag makes is_user_cancel return True."""
    from services.session_service import (
        set_user_cancel_flag, is_user_cancel, clear_user_cancel_flag
    )
    sid = "test-user-cancel-set"
    clear_user_cancel_flag(sid)
    assert not is_user_cancel(sid)
    set_user_cancel_flag(sid)
    assert is_user_cancel(sid)
    clear_user_cancel_flag(sid)


def test_is_user_cancel_false_by_default():
    """is_user_cancel returns False for a session that was never flagged."""
    from services.session_service import is_user_cancel
    assert not is_user_cancel("test-never-cancelled")


def test_clear_user_cancel_flag_resets():
    """clear_user_cancel_flag makes is_user_cancel return False."""
    from services.session_service import (
        set_user_cancel_flag, is_user_cancel, clear_user_cancel_flag
    )
    sid = "test-user-cancel-clear"
    set_user_cancel_flag(sid)
    assert is_user_cancel(sid)
    clear_user_cancel_flag(sid)
    assert not is_user_cancel(sid)


def test_clear_user_cancel_flag_no_op_when_absent():
    """clear_user_cancel_flag is safe to call when session was never flagged."""
    from services.session_service import clear_user_cancel_flag
    clear_user_cancel_flag("test-clear-absent")  # Must not raise


def test_reset_cancel_flag_also_clears_user_cancel():
    """reset_cancel_flag also clears the user-cancel flag."""
    from services.session_service import (
        set_user_cancel_flag, is_user_cancel, reset_cancel_flag
    )
    sid = "test-reset-clears-user"
    set_user_cancel_flag(sid)
    assert is_user_cancel(sid)
    reset_cancel_flag(sid)
    assert not is_user_cancel(sid)
