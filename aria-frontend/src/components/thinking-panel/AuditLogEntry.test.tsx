import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditLogEntry } from "./AuditLogEntry";
import type { FirestoreAuditStep } from "@/types/aria";

// Mock ScreenshotModal to avoid Radix Dialog complexity in unit tests
vi.mock("./ScreenshotModal", () => ({
  ScreenshotModal: ({ onClose, stepIndex }: { onClose: () => void; stepIndex: number }) => (
    <div data-testid="screenshot-modal" data-step-index={stepIndex}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ConfidenceBadge to simplify test assertions
vi.mock("./ConfidenceBadge", () => ({
  ConfidenceBadge: ({ confidence }: { confidence: number }) => (
    <span data-testid="confidence-badge">{confidence}</span>
  ),
}));

const baseEntry: FirestoreAuditStep = {
  step_index: 0,
  action_type: "navigate",
  description: "Navigate to example.com",
  result: "done",
  screenshot_url: null,
  confidence: 0.9,
  timestamp: "2026-03-03T14:22:33.456Z",
  status: "complete",
};

describe("AuditLogEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step number, action badge, description, and confidence badge", () => {
    render(<AuditLogEntry entry={baseEntry} />);

    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText("NAV")).toBeTruthy();
    expect(screen.getByText("Navigate to example.com")).toBeTruthy();
    expect(screen.getByTestId("confidence-badge")).toBeTruthy();
  });

  it("renders screenshot thumbnail button when screenshot_url is non-null", () => {
    const entryWithScreenshot: FirestoreAuditStep = {
      ...baseEntry,
      screenshot_url: "https://storage.googleapis.com/bucket/step0.png",
    };
    render(<AuditLogEntry entry={entryWithScreenshot} />);

    const btn = screen.getByRole("button", { name: /view screenshot for step 1/i });
    expect(btn).toBeTruthy();
    const img = btn.querySelector("img");
    expect(img).not.toBeNull();
    expect((img as HTMLImageElement).src).toContain("step0.png");
  });

  it("opens ScreenshotModal when thumbnail is clicked", () => {
    const entryWithScreenshot: FirestoreAuditStep = {
      ...baseEntry,
      screenshot_url: "https://storage.googleapis.com/bucket/step0.png",
    };
    render(<AuditLogEntry entry={entryWithScreenshot} />);

    expect(screen.queryByTestId("screenshot-modal")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /view screenshot for step 1/i }));

    expect(screen.getByTestId("screenshot-modal")).toBeTruthy();
  });

  it("does not render thumbnail when screenshot_url is null", () => {
    render(<AuditLogEntry entry={baseEntry} />);

    expect(screen.queryByRole("button", { name: /view screenshot/i })).toBeNull();
    expect(screen.queryByTestId("screenshot-modal")).toBeNull();
  });

  it("uses correct step number display (1-based)", () => {
    const entry3: FirestoreAuditStep = { ...baseEntry, step_index: 2 };
    render(<AuditLogEntry entry={entry3} />);
    expect(screen.getByText("#3")).toBeTruthy();
  });

  it("uses fallback action label for unknown action types", () => {
    const entryUnknown: FirestoreAuditStep = {
      ...baseEntry,
      action_type: "hover",
    };
    render(<AuditLogEntry entry={entryUnknown} />);
    expect(screen.getByText("HOVE")).toBeTruthy();
  });

  it("applies correct data-testid based on step_index", () => {
    const { container } = render(<AuditLogEntry entry={{ ...baseEntry, step_index: 4 }} />);
    expect(container.querySelector("[data-testid='audit-entry-4']")).not.toBeNull();
  });
});
