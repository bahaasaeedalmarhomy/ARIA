"""
Unit tests for POST /api/task/{session_id}/input endpoint.

Story 3.4 AC: 4, 6
Tests:
  1. POST /{session_id}/input returns 200 with queued: true when queue exists
  2. POST /{session_id}/input returns 404 when no queue exists
  3. POST /{session_id}/input validates body (empty value rejected)
  4. POST /{session_id}/input places the value in the session queue
  5. POST /{session_id}/input with missing body returns 422
"""
import asyncio
import pytest
from unittest.mock import patch

from fastapi.testclient import TestClient
from main import app

from services.input_queue_service import get_input_queue, clear_input_queue

client = TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Test 1: Returns 200 when queue exists
# ---------------------------------------------------------------------------

def test_input_returns_200_when_queue_exists():
    """POST /{session_id}/input returns 200 with queued: true when an active queue exists."""
    sid = "sess_input_200_test"
    # Create the queue (simulates executor waiting for input)
    get_input_queue(sid)
    try:
        response = client.post(
            f"/api/task/{sid}/input",
            json={"value": "my response"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["data"]["queued"] is True
        assert body["error"] is None
    finally:
        clear_input_queue(sid)


# ---------------------------------------------------------------------------
# Test 2: Returns 404 when no queue exists
# ---------------------------------------------------------------------------

def test_input_returns_404_when_no_queue():
    """POST /{session_id}/input returns 404 when no executor is waiting for input."""
    sid = "sess_no_queue_test"
    clear_input_queue(sid)  # ensure no queue

    response = client.post(
        f"/api/task/{sid}/input",
        json={"value": "my response"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INPUT_NOT_EXPECTED"


# ---------------------------------------------------------------------------
# Test 3: Validates body — empty value rejected
# ---------------------------------------------------------------------------

def test_input_rejects_empty_value():
    """POST /{session_id}/input returns 422 when value is empty string."""
    sid = "sess_empty_val_test"
    get_input_queue(sid)
    try:
        response = client.post(
            f"/api/task/{sid}/input",
            json={"value": ""},
        )
        assert response.status_code == 422
    finally:
        clear_input_queue(sid)


# ---------------------------------------------------------------------------
# Test 4: Places value in the session queue
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_input_places_value_in_queue():
    """POST /{session_id}/input delivers the value to the per-session asyncio.Queue."""
    sid = "sess_queue_delivery_test"
    queue = get_input_queue(sid)
    try:
        response = client.post(
            f"/api/task/{sid}/input",
            json={"value": "solved it!"},
        )
        assert response.status_code == 200

        # Value should be in the queue
        value = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert value == "solved it!"
    finally:
        clear_input_queue(sid)


# ---------------------------------------------------------------------------
# Test 5: Missing body returns 422
# ---------------------------------------------------------------------------

def test_input_missing_body_returns_422():
    """POST /{session_id}/input without a JSON body returns 422."""
    response = client.post("/api/task/sess_nobody/input")
    assert response.status_code == 422
