"""
Unit tests for Story 3.3: GCS Screenshot Upload — services/gcs_service.py

AC coverage:
  AC 2 — upload_screenshot uploads to correct GCS path and returns public URL
  AC 2 — non-fatal failure: upload_screenshot returns "" on exception

Tests:
  1. Returns "" immediately when GCS_BUCKET_NAME is empty
  2. Returns "" immediately when image_bytes is empty
  3. Correct blob path used for given session_id and step_index
  4. Returns blob.public_url on success
  5. Returns "" (non-fatal) when _upload_sync raises an exception
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


_SESSION_ID = "sess_abc"
_IMAGE_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16  # minimal PNG-like bytes


# ─────────────────────────────── Test 1 ──────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_screenshot_no_bucket_returns_empty():
    """When GCS_BUCKET_NAME is empty, returns "" without touching storage."""
    with patch("services.gcs_service.GCS_BUCKET_NAME", ""):
        from services.gcs_service import upload_screenshot
        result = await upload_screenshot(_SESSION_ID, 0, _IMAGE_BYTES)

    assert result == ""


# ─────────────────────────────── Test 2 ──────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_screenshot_empty_bytes_returns_empty():
    """When image_bytes is b"", returns "" without touching storage."""
    with patch("services.gcs_service.GCS_BUCKET_NAME", "test-bucket"):
        from services.gcs_service import upload_screenshot
        result = await upload_screenshot(_SESSION_ID, 0, b"")

    assert result == ""


# ─────────────────────────────── Test 3 ──────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_screenshot_uses_correct_blob_path():
    """Blob path must follow sessions/{session_id}/steps/{step_index:04d}.png convention."""
    mock_blob = MagicMock()
    mock_blob.public_url = "https://storage.googleapis.com/test-bucket/sessions/sess_abc/steps/0003.png"
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob
    mock_client = MagicMock()
    mock_client.bucket.return_value = mock_bucket

    with (
        patch("services.gcs_service.GCS_BUCKET_NAME", "test-bucket"),
        patch("google.cloud.storage.Client", return_value=mock_client),
    ):
        from services import gcs_service

        # Reset module-level GCS_BUCKET_NAME to ensure patch is effective
        gcs_service.GCS_BUCKET_NAME = "test-bucket"

        result = await gcs_service.upload_screenshot(_SESSION_ID, 3, _IMAGE_BYTES)

    mock_bucket.blob.assert_called_once_with("sessions/sess_abc/steps/0003.png")
    assert result == mock_blob.public_url


# ─────────────────────────────── Test 4 ──────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_screenshot_returns_public_url_on_success():
    """Returns the blob's public_url string when GCS upload succeeds."""
    expected_url = "https://storage.googleapis.com/my-bucket/sessions/sess_abc/steps/0000.png"

    mock_blob = MagicMock()
    mock_blob.public_url = expected_url
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob
    mock_client = MagicMock()
    mock_client.bucket.return_value = mock_bucket

    with (
        patch("services.gcs_service.GCS_BUCKET_NAME", "my-bucket"),
        patch("google.cloud.storage.Client", return_value=mock_client),
    ):
        from services import gcs_service

        gcs_service.GCS_BUCKET_NAME = "my-bucket"
        result = await gcs_service.upload_screenshot(_SESSION_ID, 0, _IMAGE_BYTES)

    assert result == expected_url


# ─────────────────────────────── Test 5 ──────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_screenshot_non_fatal_on_exception():
    """When _upload_sync raises, upload_screenshot returns "" (non-fatal)."""
    mock_client = MagicMock()
    mock_client.bucket.side_effect = RuntimeError("GCS unavailable")

    with (
        patch("services.gcs_service.GCS_BUCKET_NAME", "test-bucket"),
        patch("google.cloud.storage.Client", return_value=mock_client),
    ):
        from services import gcs_service

        gcs_service.GCS_BUCKET_NAME = "test-bucket"
        # Must not raise — returns "" silently
        result = await gcs_service.upload_screenshot(_SESSION_ID, 1, _IMAGE_BYTES)

    assert result == ""
