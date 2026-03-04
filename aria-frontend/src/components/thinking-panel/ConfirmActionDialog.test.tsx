import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import type { ConfirmationRequest } from "@/types/aria";

const mockRequest: ConfirmationRequest = {
  step_index: 2,
  action_description: "submit the purchase form",
  warning: "This action cannot be undone",
};

describe("ConfirmActionDialog", () => {
  const onDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
  });

  it("renders the action description and rose warning banner", () => {
    render(
      <ConfirmActionDialog
        request={mockRequest}
        sessionId="sess_test"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("submit the purchase form")).toBeTruthy();
    expect(screen.getByText(/This action cannot be undone/)).toBeTruthy();
    expect(screen.getByText("Confirm Irreversible Action")).toBeTruthy();
  });

  it("renders Cancel and Confirm buttons", () => {
    render(
      <ConfirmActionDialog
        request={mockRequest}
        sessionId="sess_test"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeTruthy();
  });

  it('Confirm button calls POST /confirm with { confirmed: true } and calls onDismiss', async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { confirmed: true }, error: null }),
    } as Response);

    render(
      <ConfirmActionDialog
        request={mockRequest}
        sessionId="sess_test"
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/task/sess_test/confirm"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ confirmed: true }),
        })
      );
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it('Cancel button calls POST /confirm with { confirmed: false } and calls onDismiss', async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { confirmed: false }, error: null }),
    } as Response);

    render(
      <ConfirmActionDialog
        request={mockRequest}
        sessionId="sess_test"
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/task/sess_test/confirm"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ confirmed: false }),
        })
      );
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it("Enter keypress triggers confirm (POST with confirmed: true)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { container } = render(
      <ConfirmActionDialog
        request={mockRequest}
        sessionId="sess_enter_key"
        onDismiss={onDismiss}
      />
    );

    const dialogDiv = container.firstChild as HTMLElement;
    fireEvent.keyDown(dialogDiv, { key: "Enter" });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/task/sess_enter_key/confirm"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ confirmed: true }),
        })
      );
    });
  });

  it("Escape keypress triggers decline (POST with confirmed: false)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { container } = render(
      <ConfirmActionDialog
        request={mockRequest}
        sessionId="sess_escape_key"
        onDismiss={onDismiss}
      />
    );

    const dialogDiv = container.firstChild as HTMLElement;
    fireEvent.keyDown(dialogDiv, { key: "Escape" });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/task/sess_escape_key/confirm"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ confirmed: false }),
        })
      );
    });
  });

  it("Cancel button has autoFocus (cancelRef is focused on mount)", () => {
    render(
      <ConfirmActionDialog
        request={mockRequest}
        sessionId="sess_focus_test"
        onDismiss={onDismiss}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeTruthy();
    expect(document.activeElement).toBe(cancelButton);
  });
});
