"use client";

import { useARIAStore } from "@/lib/store/aria-store";
import { isVoiceSupported, useVoice } from "@/lib/hooks/useVoice";
import { VoiceWaveform } from "./VoiceWaveform";

export function VoiceMic() {
  const voiceStatus = useARIAStore((state) => state.voiceStatus);
  const isVoiceConnecting = useARIAStore((state) => state.isVoiceConnecting);
  const { connectMicrophone, disconnectMicrophone } = useVoice();

  // AC 4: Fallback for unsupported browsers
  if (!isVoiceSupported()) {
    return (
      <p className="text-xs text-zinc-500">
        Voice input requires Chrome 120+ or Edge 120+
      </p>
    );
  }

  const isConnected =
    voiceStatus === "listening" ||
    voiceStatus === "speaking" ||
    voiceStatus === "paused";

  const isConnecting =
    voiceStatus === "connecting" || isVoiceConnecting;

  return (
    <div className="flex flex-col items-start gap-2">
      {/* AC 5: Waveform visualiser */}
      <VoiceWaveform />

      {/* AC 1: "Always listening" label */}
      <span className="text-xs text-zinc-400">Always listening</span>

      {/* AC 1 + 4: Mic connect / disconnect button */}
      {isConnecting ? (
        <button
          disabled
          className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-400 cursor-not-allowed"
        >
          Connecting...
        </button>
      ) : isConnected ? (
        <button
          onClick={disconnectMicrophone}
          className="text-xs px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={connectMicrophone}
          className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          Connect Microphone
        </button>
      )}
    </div>
  );
}
