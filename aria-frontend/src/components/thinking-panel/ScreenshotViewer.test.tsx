import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScreenshotViewer } from "./ScreenshotViewer";

describe("ScreenshotViewer", () => {
  it("renders an img with the correct src", () => {
    render(
      <ScreenshotViewer screenshotUrl="https://storage.googleapis.com/bucket/steps/0000.png" />
    );
    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe(
      "https://storage.googleapis.com/bucket/steps/0000.png"
    );
  });

  it("renders default alt text when alt prop is omitted", () => {
    render(
      <ScreenshotViewer screenshotUrl="https://example.com/shot.png" />
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("alt")).toBe("Step screenshot");
  });

  it("renders custom alt text when provided", () => {
    render(
      <ScreenshotViewer
        screenshotUrl="https://example.com/shot.png"
        alt="Screenshot for step 3"
      />
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("alt")).toBe("Screenshot for step 3");
  });

  it("includes data-testid='screenshot-viewer' on the wrapper div", () => {
    render(
      <ScreenshotViewer screenshotUrl="https://example.com/shot.png" />
    );
    const wrapper = screen.getByTestId("screenshot-viewer");
    expect(wrapper).toBeTruthy();
  });
});
