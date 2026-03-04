"""
TTS Queue Service — Story 4.5: Destructive Action Guard (Voice Confirmation).

Per-session asyncio.Queue[str | None] for delivering text-to-speech requests
to the Gemini Live session via voice_handler.py's inject_tts_to_gemini() task.

The queue is created when the WebSocket audio relay connects (audio_relay in
voice_handler.py) and released when it disconnects. The executor calls
try_put_tts_text() to enqueue a TTS prompt — it silently drops if no queue
exists (voice relay not connected), since TTS is best-effort and the visual
ConfirmActionDialog is the mandatory confirmation gate.

Pattern mirrors voice_instruction_service.py.

Usage:
    # In voice_handler.py (queue lifecycle):
    tts_queue = create_tts_queue(session_id)
    # ... inject_tts_to_gemini(tts_queue, gemini_session) runs as task ...
    tts_queue.put_nowait(None)  # signal stop
    release_tts_queue(session_id)

    # In executor_service.py (TTS injection):
    try_put_tts_text(session_id, "I'm about to submit the form. Shall I proceed?")
"""
import asyncio

_tts_queues: dict[str, asyncio.Queue[str | None]] = {}


def create_tts_queue(session_id: str) -> asyncio.Queue[str | None]:
    """Create an unbounded TTS queue for the session."""
    q: asyncio.Queue[str | None] = asyncio.Queue()
    _tts_queues[session_id] = q
    return q


def try_put_tts_text(session_id: str, text: str) -> None:
    """
    Non-blocking put of TTS text.
    Silently drops if no queue exists (voice relay not connected).
    Called from executor hot path — must never block.
    """
    q = _tts_queues.get(session_id)
    if q:
        try:
            q.put_nowait(text)
        except asyncio.QueueFull:
            pass  # Unbounded queue — should not happen, but guard anyway


def get_tts_text(session_id: str) -> asyncio.Queue[str | None] | None:
    """Return the TTS queue for ``session_id``, or ``None`` if no queue exists."""
    return _tts_queues.get(session_id)


def release_tts_queue(session_id: str) -> None:
    """Remove the TTS queue for a session (cleanup on WebSocket disconnect)."""
    _tts_queues.pop(session_id, None)
