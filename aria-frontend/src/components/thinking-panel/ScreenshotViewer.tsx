type ScreenshotViewerProps = {
  screenshotUrl: string;
  alt?: string;
};

export function ScreenshotViewer({ screenshotUrl, alt }: ScreenshotViewerProps) {
  return (
    <div
      data-testid="screenshot-viewer"
      className="mt-2 rounded overflow-hidden border border-border-aria"
    >
      <img
        src={screenshotUrl}
        alt={alt ?? "Step screenshot"}
        className="w-full h-auto max-h-32 object-cover object-top"
        loading="lazy"
      />
    </div>
  );
}

export default ScreenshotViewer;
