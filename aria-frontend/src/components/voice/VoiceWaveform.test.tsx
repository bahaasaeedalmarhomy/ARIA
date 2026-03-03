import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoiceWaveform } from "./VoiceWaveform";
import { useARIAStore } from "@/lib/store/aria-store";
import { ARIA_INITIAL_STATE } from "@/lib/store/aria-store";

function resetStore() {
  useARIAStore.setState(ARIA_INITIAL_STATE);
}

describe("VoiceWaveform", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders exactly 5 bar elements", () => {
    const { container } = render(<VoiceWaveform />);
    // All bars are direct children of the wrapper div
    const bars = container.querySelectorAll(".w-1.rounded-full");
    expect(bars.length).toBe(5);
  });

  it("has role='img' attribute", () => {
    render(<VoiceWaveform />);
    const waveform = screen.getByRole("img");
    expect(waveform).toBeTruthy();
  });

  it("aria-label contains current voiceStatus", () => {
    useARIAStore.setState({ voiceStatus: "listening" });
    render(<VoiceWaveform />);
    const waveform = screen.getByRole("img");
    expect(waveform.getAttribute("aria-label")).toContain("listening");
  });

  it("aria-label contains idle status by default", () => {
    render(<VoiceWaveform />);
    const waveform = screen.getByRole("img");
    expect(waveform.getAttribute("aria-label")).toContain("idle");
  });

  it("has aria-live='polite'", () => {
    render(<VoiceWaveform />);
    const waveform = screen.getByRole("img");
    expect(waveform.getAttribute("aria-live")).toBe("polite");
  });

  it("speaking state bars have bg-emerald-500 class", () => {
    useARIAStore.setState({ voiceStatus: "speaking" });
    const { container } = render(<VoiceWaveform />);
    const bars = container.querySelectorAll(".bg-emerald-500");
    expect(bars.length).toBe(5);
  });

  it("listening state bars have bg-blue-500 class", () => {
    useARIAStore.setState({ voiceStatus: "listening", audioAmplitude: 0.5 });
    const { container } = render(<VoiceWaveform />);
    const bars = container.querySelectorAll(".bg-blue-500");
    expect(bars.length).toBe(5);
  });

  it("paused state bars have bg-violet-400 class", () => {
    useARIAStore.setState({ voiceStatus: "paused" });
    const { container } = render(<VoiceWaveform />);
    const bars = container.querySelectorAll(".bg-violet-400");
    expect(bars.length).toBe(5);
  });
});
