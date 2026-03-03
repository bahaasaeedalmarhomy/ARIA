import { describe, it, expect } from "vitest";
import { buildWsUrl } from "./audioWebSocket";

describe("buildWsUrl", () => {
  it("converts http:// to ws:// and appends the audio path", () => {
    expect(buildWsUrl("test-session")).toBe(
      "ws://localhost:8080/ws/audio/test-session"
    );
  });

  it("converts https:// to wss:// when baseUrl is provided", () => {
    expect(buildWsUrl("test-session", "https://api.example.com")).toBe(
      "wss://api.example.com/ws/audio/test-session"
    );
  });

  it("keeps the session id in the path", () => {
    const url = buildWsUrl("abc-123");
    expect(url).toContain("/ws/audio/abc-123");
  });
});
