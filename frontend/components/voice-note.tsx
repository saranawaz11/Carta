"use client";

import { useAuth } from "@clerk/nextjs";
import { Loader2, Mic, Square, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Fraunces } from "next/font/google";

import { useVoiceInput, type VoiceState } from "@/lib/voice";

const display = Fraunces({ subsets: ["latin"], display: "swap" });

export function VoiceNote({
  title = "Voice note",
  onTranscriptChange,
  onStateChange,
  onStart,
  onLimit,
  maxCharacters,
  onClose,
  className = "",
}: {
  title?: string;
  onTranscriptChange: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  onStart?: () => void;
  onLimit?: () => void;
  maxCharacters?: number;
  onClose?: () => void;
  className?: string;
}) {
  const { getToken } = useAuth();
  const voice = useVoiceInput(getToken);
  const stop = voice.stop;
  const transcriptLength = voice.transcript.length;
  const active = voice.state === "connecting" || voice.state === "listening";
  const limitTriggeredRef = useRef(false);

  useEffect(() => {
    onTranscriptChange(voice.transcript);
  }, [onTranscriptChange, voice.transcript]);

  useEffect(() => {
    onStateChange?.(voice.state);
  }, [onStateChange, voice.state]);

  useEffect(() => {
    if (!active) limitTriggeredRef.current = false;
    if (
      active &&
      maxCharacters !== undefined &&
      maxCharacters > 0 &&
      transcriptLength >= maxCharacters &&
      !limitTriggeredRef.current
    ) {
      limitTriggeredRef.current = true;
      onLimit?.();
      void stop();
    }
  }, [active, maxCharacters, onLimit, stop, transcriptLength]);

  return (
    <section
      aria-label={title}
      className={`rounded-2xl border border-line bg-panel p-5 motion-safe:animate-fade-up sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            <Mic size={11} />
            A thought, spoken
          </p>
          <h3 className={`${display.className} mt-2 text-2xl font-normal text-ink`}>
            {title}
          </h3>
          <p className="mt-1 text-xs text-gray-500" aria-live="polite">
            {voice.state === "connecting"
              ? "Connecting..."
              : voice.state === "listening"
                ? "Listening"
                : voice.state === "error"
                  ? "Dictation stopped"
                  : "Ready to dictate"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (active) {
                void stop();
              } else {
                onStart?.();
                void voice.start();
              }
            }}
            disabled={
              !voice.supported ||
              voice.state === "connecting" ||
              maxCharacters === 0
            }
            aria-label={active ? "Stop dictation" : "Start dictation"}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-ink
              transition-[background-color,border-color,opacity] duration-200 hover:border-brand/50 hover:bg-tint disabled:pointer-events-none disabled:opacity-40"
          >
            {voice.state === "connecting" ? (
              <Loader2 size={14} className="animate-spin text-brand" />
            ) : active ? (
              <Square size={13} className="fill-current text-brand" />
            ) : (
              <Mic size={14} className="text-brand" />
            )}
            {active ? "Stop" : "Dictate"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={() => {
                if (active) void stop().finally(onClose);
                else onClose();
              }}
              aria-label="Close voice dictation"
              className="rounded-lg p-1.5 text-gray-500 transition-colors duration-200 hover:bg-tint hover:text-brand"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      {!voice.supported && (
        <p className="mt-4 text-xs text-gray-500" role="status">
          Voice dictation requires microphone and AudioWorklet support in this browser.
        </p>
      )}
      {voice.error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {voice.error}
        </p>
      )}
    </section>
  );
}
