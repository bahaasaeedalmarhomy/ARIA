"""
SSE stream endpoint — GET /api/stream/{session_id}

Validates that the session exists in Firestore, then opens a long-lived
Server-Sent Events stream. Events are broadcast via the SSE event manager
(services/sse_service.py) from other request handlers (e.g., task_router).
"""
import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from services.session_service import get_session
from services.sse_service import subscribe, unsubscribe

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stream"])


@router.get("/stream/{session_id}")
async def stream_events(session_id: str):
    """
    GET /api/stream/{session_id}

    Opens an SSE stream for the given session.

    - Validates session exists in Firestore (404 if not).
    - Sends an initial `:keepalive` comment to establish the SSE channel.
    - Yields `data: <json>\\n\\n` lines as events are emitted.
    - Cleans up the session queue on client disconnect (finally block).

    Response headers:
        Content-Type: text/event-stream
        Cache-Control: no-cache
        Connection: keep-alive
        X-Accel-Buffering: no  (prevents nginx/proxy from buffering the stream)
    """
    # Validate session exists before opening stream
    try:
        session = await get_session(session_id)
    except Exception:
        logger.exception("Firestore error while validating session %s for SSE", session_id)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "data": None,
                "error": {"code": "INTERNAL_ERROR", "message": "Session lookup failed"},
            },
        )

    if not session:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "data": None,
                "error": {"code": "SESSION_NOT_FOUND", "message": "Session not found"},
            },
        )

    async def event_generator():
        try:
            # Initial keepalive comment establishes the SSE channel before any events arrive
            yield ": keepalive\n\n"
            async for event in subscribe(session_id):
                yield f"data: {event}\n\n"
        except Exception:
            logger.exception("Error in SSE event generator for session %s", session_id)
        finally:
            unsubscribe(session_id)
            logger.debug("SSE connection closed for session %s", session_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
