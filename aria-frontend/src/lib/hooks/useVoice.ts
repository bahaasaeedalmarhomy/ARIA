"use client";

import { useEffect, useRef } from "react";
import { useARIAStore } from "@/lib/store/aria-store";
import { createAudioWebSocket } from "@/lib/ws/audioWebSocket";

// ─────────────────────────────────────────────────────────────────
// Browser capability check
// ─────────────────────────────────────────────────────────────────

export function isVoiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices &&
    "getUserMedia" in navigator.mediaDevices &&
    "WebSocket" in window
  );
}

// ─────────────────────────────────────────────────────────────────
// PCM helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Downsamples a Float32 PCM buffer from `fromRate` to `toRate` using nearest-
 * neighbour interpolation, then converts to Int16.
 * Note: ScriptProcessorNode captures at the AudioContext sample rate (often
 * 44100 or 48000). Gemini Live requires 16 kHz — this function handles the
 * conversion.
 */
export function downsampleAndConvert(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Int16Array {
  const ratio = fromRate / toRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = Math.floor(i * ratio);
    const sample = Math.max(-1, Math.min(1, input[srcIndex]));
    output[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return output;
}

// ─────────────────────────────────────────────────────────────────
// useVoice hook
// ─────────────────────────────────────────────────────────────────

export function useVoice() {
  const sessionId = useARIAStore((state) => state.sessionId);

  // Refs for capture pipeline
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Refs for playback pipeline
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);

  // ── Amplitude RAF loop ─────────────────────────────────────────

  function startAmplitudeLoop(analyser: AnalyserNode) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteFrequencyData(dataArray);
      const mean =
        dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
      useARIAStore.setState({ audioAmplitude: mean / 255 });
      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }

  function stopAmplitudeLoop() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  // ── PCM playback ───────────────────────────────────────────────

  function playPcmChunk(rawBytes: ArrayBuffer) {
    const playbackContext = playbackContextRef.current;
    if (!playbackContext) return;

    // Resume suspended context (iOS/Safari autoplay policy)
    if (playbackContext.state === "suspended") {
      playbackContext.resume().catch(() => undefined);
    }

    const int16 = new Int16Array(rawBytes);
    const SAMPLE_RATE = 24000; // Gemini Live output is 24 kHz PCM L16
    const buffer = playbackContext.createBuffer(1, int16.length, SAMPLE_RATE);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      channelData[i] = int16[i] / 32768; // normalize to –1…1
    }

    const source = playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackContext.destination);

    const startTime = Math.max(
      playbackContext.currentTime,
      nextPlayTimeRef.current
    );
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;

    // First chunk → mark speaking; last chunk → reset to listening
    useARIAStore.setState({ voiceStatus: "speaking" });
    source.onended = () => {
      // Only reset if no more chunks are queued (nextPlayTime already passed)
      if (
        playbackContextRef.current &&
        nextPlayTimeRef.current <= playbackContextRef.current.currentTime + 0.05
      ) {
        useARIAStore.setState({ voiceStatus: "listening" });
      }
    };
  }

  // ── Connect ────────────────────────────────────────────────────

  async function connectMicrophone() {
    if (!isVoiceSupported()) return;
    if (!sessionId) return;

    useARIAStore.setState({ isVoiceConnecting: true, voiceStatus: "connecting" });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // hint only — browser may ignore
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // ── Capture AudioContext ─────────────────────────────────
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // AnalyserNode for VoiceWaveform amplitude
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      startAmplitudeLoop(analyser);

      // ScriptProcessorNode for raw PCM → WebSocket
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const pcm16 = downsampleAndConvert(
          float32,
          audioContext.sampleRate,
          16000
        );
        ws.send(pcm16.buffer);
      };

      // Must connect to destination or Chrome silences the processor
      source.connect(processor);
      processor.connect(audioContext.destination);

      // ── Playback AudioContext ────────────────────────────────
      const playbackContext = new AudioContext({ sampleRate: 24000 });
      playbackContextRef.current = playbackContext;
      nextPlayTimeRef.current = 0;

      // ── WebSocket ────────────────────────────────────────────
      const ws = createAudioWebSocket(sessionId);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        useARIAStore.setState({
          voiceStatus: "listening",
          isVoiceConnecting: false,
        });
      };

      ws.onmessage = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          playPcmChunk(event.data);
        }
      };

      ws.onerror = () => {
        disconnect();
      };

      ws.onclose = () => {
        disconnect();
      };
    } catch {
      // getUserMedia permission denied or other error
      useARIAStore.setState({
        voiceStatus: "disconnected",
        isVoiceConnecting: false,
      });
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────

  function disconnect() {
    // Stop amplitude loop
    stopAmplitudeLoop();

    // Stop media tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Disconnect and close audio nodes
    processorRef.current?.disconnect();
    processorRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;

    // Close capture AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    // Close WebSocket cleanly
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000);
      }
      wsRef.current = null;
    }

    useARIAStore.setState({
      voiceStatus: "idle",
      isVoiceConnecting: false,
      audioAmplitude: 0,
    });
  }

  function disconnectMicrophone() {
    disconnect();
  }

  // ── Cleanup on unmount ─────────────────────────────────────────

  useEffect(() => {
    if (!isVoiceSupported()) {
      useARIAStore.setState({ voiceStatus: "disconnected" });
    }

    return () => {
      stopAmplitudeLoop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      processorRef.current?.disconnect();
      analyserRef.current?.disconnect();
      audioContextRef.current?.close().catch(() => undefined);
      wsRef.current?.close(1000);
      playbackContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  return {
    isSupported: isVoiceSupported(),
    connectMicrophone,
    disconnectMicrophone,
  };
}
