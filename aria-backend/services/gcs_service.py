import asyncio
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")


def _upload_sync(blob_path: str, image_bytes: bytes) -> str:
    """Blocking GCS upload — run via run_in_executor to avoid blocking event loop."""
    from google.cloud import storage  # noqa: PLC0415 — deferred import to allow mocking

    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(blob_path)
    blob.upload_from_string(image_bytes, content_type="image/png")
    blob.make_public()
    return blob.public_url


async def upload_screenshot(session_id: str, step_index: int, image_bytes: bytes) -> str:
    """Upload a screenshot to GCS and return its public URL.

    Returns "" immediately when GCS is not configured (GCS_BUCKET_NAME empty) or
    when image_bytes is empty. Any upload failure is logged and swallowed so that
    screenshot failures never crash execution.
    """
    if not GCS_BUCKET_NAME or not image_bytes:
        return ""

    blob_path = f"sessions/{session_id}/steps/{step_index:04d}.png"
    try:
        loop = asyncio.get_running_loop()
        url: str = await loop.run_in_executor(None, _upload_sync, blob_path, image_bytes)
        return url
    except Exception as exc:  # noqa: BLE001 — non-fatal; log and continue
        logger.error(
            "GCS upload failed for session %s step %d: %s",
            session_id,
            step_index,
            exc,
        )
        return ""
