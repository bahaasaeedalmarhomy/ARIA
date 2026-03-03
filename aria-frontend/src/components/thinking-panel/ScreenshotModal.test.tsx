import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScreenshotModal } from "./ScreenshotModal";

// Mock the Dialog primitives to simplify testing (avoid Radix portal complexity)
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
      <button data-testid="dialog-close" onClick={() => onOpenChange(false)}>
        Close
      </button>
    </div>
  ),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
}));

describe("ScreenshotModal", () => {
  const defaultProps = {
    screenshotUrl: "https://storage.googleapis.com/bucket/sessions/sess_abc/steps/0002.png",
    stepIndex: 2,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with the correct screenshot URL in the img src", () => {
    render(<ScreenshotModal {...defaultProps} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe(defaultProps.screenshotUrl);
  });

  it("renders 1-based step number in the title", () => {
    render(<ScreenshotModal {...defaultProps} />);
    const title = screen.getByTestId("dialog-title");
    expect(title.textContent).toContain("Step #3");
  });

  it("renders alt text with 1-based step number", () => {
    render(<ScreenshotModal {...defaultProps} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("alt")).toBe("Step 3 screenshot");
  });

  it("calls onClose when dialog is closed", () => {
    render(<ScreenshotModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("dialog-close"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("opens in an open state (Dialog open prop is true)", () => {
    render(<ScreenshotModal {...defaultProps} />);
    const dialog = screen.getByTestId("dialog");
    expect(dialog.getAttribute("data-open")).toBe("true");
  });

  it("renders step index 0 as Step #1 in title", () => {
    render(<ScreenshotModal {...defaultProps} stepIndex={0} />);
    const title = screen.getByTestId("dialog-title");
    expect(title.textContent).toContain("Step #1");
  });

  it("applies font-mono class to the title", () => {
    render(<ScreenshotModal {...defaultProps} />);
    const title = screen.getByTestId("dialog-title");
    expect(title.className).toContain("font-mono");
  });

  it("img has lazy loading attribute", () => {
    render(<ScreenshotModal {...defaultProps} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("loading")).toBe("lazy");
  });
});
