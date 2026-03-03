"use client";

import { useARIAStore } from "@/lib/store/aria-store";

export function BargeInPulse() {
  const voiceStatus = useARIAStore((state) => state.voiceStatus);
  const vadActive = useARIAStore((state) => state.vadActive);

  const isVisible = voiceStatus === "paused" || vadActive;

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-label="Voice activity detected"
      aria-live="assertive"
      className="relative flex items-center justify-center w-8 h-8"
    >
      {/* Inner ring — fast ping */}
      <span className="absolute inset-0 rounded-full bg-violet-400/30 animate-ping" />
      {/* Outer ring — delayed ping for layered ripple effect */}
      <span
        className="absolute inset-0 rounded-full bg-violet-400/15 animate-ping"
        style={{ animationDelay: "150ms" }}
      />
      {/* Solid center dot */}
      <span className="relative w-2 h-2 rounded-full bg-violet-400" />
    </div>
  );
}
