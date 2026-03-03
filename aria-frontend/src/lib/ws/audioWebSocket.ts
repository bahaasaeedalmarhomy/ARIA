/**
 * WebSocket audio relay client utility.
 *
 * Constructs the audio WebSocket URL from the backend env var and creates
 * the native WebSocket. Lifecycle (open/close/reconnect) is managed by
 * useVoice.ts.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

/**
 * Converts an HTTP(S) backend URL to a WS(S) URL and appends the audio
 * WebSocket path for the given session.
 */
export function buildWsUrl(sessionId: string): string {
  const wsBase = BACKEND_URL.replace(/^https:\/\//, "wss://").replace(
    /^http:\/\//,
    "ws://"
  );
  return `${wsBase}/ws/audio/${sessionId}`;
}

/**
 * Creates and returns a native WebSocket connected to the audio relay
 * endpoint. The caller is responsible for attaching event handlers and
 * closing the socket when done.
 */
export function createAudioWebSocket(sessionId: string): WebSocket {
  const url = buildWsUrl(sessionId);
  return new WebSocket(url);
}
