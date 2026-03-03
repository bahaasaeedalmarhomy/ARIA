import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BargeInPulse } from "./BargeInPulse";
import { useARIAStore } from "@/lib/store/aria-store";
import { ARIA_INITIAL_STATE } from "@/lib/store/aria-store";

function resetStore() {
  useARIAStore.setState(ARIA_INITIAL_STATE);
}

describe("BargeInPulse", () => {
  beforeEach(() => {
    resetStore();
  });

  it("does NOT render when voiceStatus is idle and vadActive is false", () => {
    useARIAStore.setState({ voiceStatus: "idle", vadActive: false });
    const { container } = render(<BargeInPulse />);
    expect(container.firstChild).toBeNull();
  });

  it("does NOT render when voiceStatus is listening and vadActive is false", () => {
    useARIAStore.setState({ voiceStatus: "listening", vadActive: false });
    const { container } = render(<BargeInPulse />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when voiceStatus is paused", () => {
    useARIAStore.setState({ voiceStatus: "paused", vadActive: false });
    render(<BargeInPulse />);
    const el = screen.getByRole("status");
    expect(el).toBeTruthy();
  });

  it("renders when vadActive is true (voiceStatus can be listening)", () => {
    useARIAStore.setState({ voiceStatus: "listening", vadActive: true });
    render(<BargeInPulse />);
    const el = screen.getByRole("status");
    expect(el).toBeTruthy();
  });

  it("has role='status' attribute", () => {
    useARIAStore.setState({ voiceStatus: "paused" });
    render(<BargeInPulse />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("role")).toBe("status");
  });

  it("has aria-live='assertive' attribute", () => {
    useARIAStore.setState({ voiceStatus: "paused" });
    render(<BargeInPulse />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-live")).toBe("assertive");
  });

  it("has aria-label='Voice activity detected'", () => {
    useARIAStore.setState({ voiceStatus: "paused" });
    render(<BargeInPulse />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-label")).toBe("Voice activity detected");
  });
});
