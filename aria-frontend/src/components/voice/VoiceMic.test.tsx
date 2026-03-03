import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoiceMic } from "./VoiceMic";
import { useARIAStore } from "@/lib/store/aria-store";
import { ARIA_INITIAL_STATE } from "@/lib/store/aria-store";

// Mock isVoiceSupported and useVoice from the hook module
vi.mock("@/lib/hooks/useVoice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/hooks/useVoice")>();
  return {
    ...actual,
    isVoiceSupported: vi.fn(() => true),
    useVoice: vi.fn(() => ({
      isSupported: true,
      connectMicrophone: vi.fn(),
      disconnectMicrophone: vi.fn(),
    })),
  };
});

import { isVoiceSupported } from "@/lib/hooks/useVoice";

function resetStore() {
  useARIAStore.setState(ARIA_INITIAL_STATE);
}

describe("VoiceMic", () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(isVoiceSupported).mockReturnValue(true);
  });

  it("renders fallback text when voice is not supported", () => {
    vi.mocked(isVoiceSupported).mockReturnValue(false);
    render(<VoiceMic />);
    expect(
      screen.getByText(/Voice input requires Chrome 120\+ or Edge 120\+/i)
    ).toBeTruthy();
  });

  it("renders Connect Microphone button when voiceStatus is idle", () => {
    useARIAStore.setState({ voiceStatus: "idle" });
    render(<VoiceMic />);
    expect(screen.getByText("Connect Microphone")).toBeTruthy();
  });

  it("renders Disconnect button when voiceStatus is listening", () => {
    useARIAStore.setState({ voiceStatus: "listening" });
    render(<VoiceMic />);
    expect(screen.getByText("Disconnect")).toBeTruthy();
  });

  it("renders Connecting... (disabled) when voiceStatus is connecting", () => {
    useARIAStore.setState({ voiceStatus: "connecting" });
    render(<VoiceMic />);
    const btn = screen.getByText("Connecting...") as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
  });

  it("renders Always listening label when supported", () => {
    render(<VoiceMic />);
    expect(screen.getByText("Always listening")).toBeTruthy();
  });
});
