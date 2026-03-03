"use client";

import { useARIAStore } from "@/lib/store/aria-store";

const BAR_MULTIPLIERS = [0.6, 0.8, 1.0, 0.8, 0.6] as const;

function getSpeakingHeight(index: number): number {
  // Sinusoidal oscillation per bar for a wave effect
  const phase = (Date.now() / 200 + index * 0.6) % (Math.PI * 2);
  return Math.round(30 + Math.abs(Math.sin(phase)) * 60);
}

export function VoiceWaveform() {
  const voiceStatus = useARIAStore((state) => state.voiceStatus);
  const audioAmplitude = useARIAStore((state) => state.audioAmplitude);

  function getBarHeight(index: number): number {
    switch (voiceStatus) {
      case "idle":
        return 20;
      case "connecting":
        return 40;
      case "listening": {
        const multiplier = BAR_MULTIPLIERS[index];
        return Math.round(multiplier * audioAmplitude * 80 + 20);
      }
      case "speaking":
        return getSpeakingHeight(index);
      case "paused":
        return 60;
      case "disconnected":
        return 10;
      default:
        return 20;
    }
  }

  function getBarColor(): string {
    switch (voiceStatus) {
      case "listening":
        return "bg-blue-500"; // signal-active #3B82F6
      case "speaking":
        return "bg-emerald-500"; // signal-success #10B981
      case "paused":
        return "bg-violet-400"; // signal-pause #A78BFA
      case "connecting":
        return "bg-zinc-600";
      case "disconnected":
        return "bg-zinc-800";
      default:
        return "bg-zinc-600";
    }
  }

  const isPulse = voiceStatus === "connecting" || voiceStatus === "paused";

  return (
    <div
      role="img"
      aria-label={`Voice activity: ${voiceStatus}`}
      aria-live="polite"
      className="flex items-end gap-1 h-8"
    >
      {BAR_MULTIPLIERS.map((_, index) => (
        <div
          key={index}
          style={{ height: `${getBarHeight(index)}%` }}
          className={[
            "w-1 rounded-full transition-all duration-[50ms]",
            getBarColor(),
            isPulse ? "animate-pulse" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </div>
  );
}
