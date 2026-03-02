import os
from dotenv import load_dotenv

load_dotenv()

# Stub: Firestore audit log writer will be implemented in Story 3.5
async def write_audit_log(session_id: str, step_index: int, data: dict) -> None:
    """Write an audit log entry to Firestore. Stub implementation."""
    pass


async def update_session_status(session_id: str, status: str) -> None:
    """
    Update the Firestore session document status field.

    Delegates to session_service.update_session_status so the audit writer
    can be the single call-site for completion state changes (AC: 4).

    Args:
        session_id: The session document ID (e.g., "sess_<uuid>").
        status: New status string (e.g., "complete", "failed").
    """
    from services.session_service import update_session_status as _update
    await _update(session_id, status)
