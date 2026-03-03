import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CancelTaskButton } from "./CancelTaskButton";
import { useARIAStore, resetAllSlices } from "@/lib/store/aria-store";

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("CancelTaskButton", () => {
  beforeEach(() => {
    useARIAStore.setState(resetAllSlices());
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when taskStatus is idle", () => {
    useARIAStore.setState({ taskStatus: "idle" });
    const { container } = render(<CancelTaskButton />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when taskStatus is completed", () => {
    useARIAStore.setState({ taskStatus: "completed" });
    const { container } = render(<CancelTaskButton />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when taskStatus is failed", () => {
    useARIAStore.setState({ taskStatus: "failed" });
    const { container } = render(<CancelTaskButton />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Cancel Task button when taskStatus is running", () => {
    useARIAStore.setState({ taskStatus: "running", sessionId: "sess_abc" });
    render(<CancelTaskButton />);
    expect(screen.getByRole("button", { name: /cancel current task/i })).toBeTruthy();
    expect(screen.getByText("Cancel Task")).toBeTruthy();
  });

  it("renders Cancel Task button when taskStatus is paused", () => {
    useARIAStore.setState({ taskStatus: "paused", sessionId: "sess_abc" });
    render(<CancelTaskButton />);
    expect(screen.getByRole("button", { name: /cancel current task/i })).toBeTruthy();
  });

  it("renders Cancel Task button when taskStatus is awaiting_input", () => {
    useARIAStore.setState({ taskStatus: "awaiting_input", sessionId: "sess_abc" });
    render(<CancelTaskButton />);
    expect(screen.getByRole("button", { name: /cancel current task/i })).toBeTruthy();
  });

  it("calls fetch POST /api/task/{sessionId}/interrupt on click", async () => {
    useARIAStore.setState({ taskStatus: "running", sessionId: "sess_xyz" });
    render(<CancelTaskButton />);

    fireEvent.click(screen.getByRole("button", { name: /cancel current task/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/task/sess_xyz/interrupt", {
        method: "POST",
      });
    });
  });

  it("shows Cancelling\u2026 text while request is in-flight", async () => {
    let resolveRequest!: () => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = () => resolve({ ok: true } as Response);
      })
    );

    useARIAStore.setState({ taskStatus: "running", sessionId: "sess_abc" });
    render(<CancelTaskButton />);

    fireEvent.click(screen.getByRole("button", { name: /cancel current task/i }));

    await waitFor(() => {
      expect(screen.getByText("Cancelling\u2026")).toBeTruthy();
    });

    resolveRequest();

    // After successful fetch, button stays in "Cancelling…" state
    // (SSE task_failed event will hide the button by changing taskStatus)
    await waitFor(() => {
      expect(screen.getByText("Cancelling\u2026")).toBeTruthy();
    });
  });

  it("resets to Cancel Task on network error so user can retry", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    useARIAStore.setState({ taskStatus: "running", sessionId: "sess_abc" });
    render(<CancelTaskButton />);

    fireEvent.click(screen.getByRole("button", { name: /cancel current task/i }));

    await waitFor(() => {
      expect(screen.getByText("Cancel Task")).toBeTruthy();
    });
  });

  it("does not call fetch when sessionId is null", () => {
    useARIAStore.setState({ taskStatus: "running", sessionId: null });
    render(<CancelTaskButton />);

    fireEvent.click(screen.getByRole("button", { name: /cancel current task/i }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
