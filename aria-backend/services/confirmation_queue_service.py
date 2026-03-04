"""
Confirmation Queue Service — Story 4.5: Destructive Action Guard.

Per-session asyncio.Queue[bool] for delivering user confirmation decisions
(True = proceed, False = cancel) to the waiting executor during a destructive
action guard pause.

Pattern mirrors input_queue_service.py, using a bounded maxsize=1 queue
(only one confirmation per destructive step guard).

Usage:
    # In executor_service.py (waiting side):
    create_confirmation_queue(session_id)
    confirmed = await wait_for_confirmation(session_id, timeout=60.0)
    release_confirmation_queue(session_id)

    # In task_router.py (delivery side via POST /{session_id}/confirm):
    deliver_confirmation(session_id, confirmed=True)

    # In voice_handler.py (delivery side via voice keyword detection):
    if has_confirmation_queue(session_id):
        deliver_confirmation(session_id, True)  # or False
"""
import asyncio

_confirmation_queues: dict[str, asyncio.Queue[bool]] = {}


def create_confirmation_queue(session_id: str) -> asyncio.Queue[bool]:
    """Create a bounded (maxsize=1) confirmation queue for the session."""
    q: asyncio.Queue[bool] = asyncio.Queue(maxsize=1)
    _confirmation_queues[session_id] = q
    return q


def deliver_confirmation(session_id: str, confirmed: bool) -> None:
    """
    Non-blocking put of confirmation result.
    Silently drops duplicates if queue is already full (put_nowait).
    Safe to call from synchronous or asynchronous context.
    """
    q = _confirmation_queues.get(session_id)
    if q:
        try:
            q.put_nowait(confirmed)
        except asyncio.QueueFull:
            pass  # Already has a response — ignore duplicate


async def wait_for_confirmation(session_id: str, timeout: float = 60.0) -> bool | None:
    """
    Await the user's confirmation response.

    Returns:
        True  — user confirmed (proceed with destructive action)
        False — user denied (cancel destructive action)
        None  — timeout (safe default: treat as cancel)
    """
    q = _confirmation_queues.get(session_id)
    if not q:
        return None
    try:
        return await asyncio.wait_for(q.get(), timeout=timeout)
    except asyncio.TimeoutError:
        return None


def release_confirmation_queue(session_id: str) -> None:
    """Remove the queue for a session (cleanup after guard completes or fails)."""
    _confirmation_queues.pop(session_id, None)


def has_confirmation_queue(session_id: str) -> bool:
    """Return True if an active confirmation queue exists for `session_id`."""
    return session_id in _confirmation_queues
