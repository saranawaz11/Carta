"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type VoiceState = "idle" | "connecting" | "listening" | "error";

type Phrase = {
  order: number;
  text: string;
  completed: boolean;
};

type ServerMessage =
  | { type: "ready" }
  | { type: "stopped" }
  | { type: "delta" | "completed"; item_id: string; text: string; order: number }
  | { type: "error"; message: string };

function websocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("The API URL is not configured.");
  const url = new URL("/ws/transcribe", apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function useVoiceInput(getToken: () => Promise<string | null>) {
  const [state, setState] = useState<VoiceState>("idle");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<Record<string, Phrase>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushResolverRef = useRef<(() => void) | null>(null);
  const stopResolverRef = useRef<(() => void) | null>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const stateRef = useRef<VoiceState>("idle");
  const stopRequestedRef = useRef(false);
  const mountedRef = useRef(true);

  const setVoiceState = useCallback((next: VoiceState) => {
    stateRef.current = next;
    if (mountedRef.current) setState(next);
  }, []);

  const releaseAudio = useCallback(async () => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = null;
    const worklet = workletRef.current;
    if (worklet) {
      worklet.port.onmessage = null;
      try {
        worklet.disconnect();
      } catch {}
    }
    workletRef.current = null;
    try {
      sourceRef.current?.disconnect();
    } catch {}
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") await context.close();
  }, []);

  const fail = useCallback(
    (message: string) => {
      stopRequestedRef.current = true;
      if (mountedRef.current) setError(message);
      setPhrases((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([, phrase]) => phrase.completed),
        ),
      );
      setVoiceState("error");
      void releaseAudio();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
      stopResolverRef.current?.();
    },
    [releaseAudio, setVoiceState],
  );

  const start = useCallback(async () => {
    if (stateRef.current === "connecting" || stateRef.current === "listening") return;
    stopRequestedRef.current = false;
    setError(null);
    setPhrases({});
    setVoiceState("connecting");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof AudioWorkletNode === "undefined" ||
      typeof AudioContext === "undefined"
    ) {
      fail("Voice dictation is not supported in this browser.");
      return;
    }

    let socket: WebSocket | null = null;
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in again to use voice dictation.");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const context = new AudioContext();
      contextRef.current = context;
      await context.audioWorklet.addModule("/pcm-capture-worklet.js");
      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;
      const worklet = new AudioWorkletNode(context, "pcm-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        outputChannelCount: [1],
      });
      workletRef.current = worklet;

      socket = new WebSocket(websocketUrl());
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;
      let resolveReady: (() => void) | null = null;
      let rejectReady: ((reason: Error) => void) | null = null;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", token }));
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(event.data) as ServerMessage;
        } catch {
          fail("Received an invalid transcription response.");
          return;
        }
        if (message.type === "ready") {
          resolveReady?.();
        } else if (message.type === "stopped") {
          stopResolverRef.current?.();
        } else if (message.type === "error") {
          if (message.message.includes("session limit reached")) {
            if (!stopRequestedRef.current) {
              void stopRef.current?.().then(() => {
                if (mountedRef.current) {
                  setError(message.message);
                  setVoiceState("error");
                }
              });
            }
          } else {
            rejectReady?.(new Error(message.message));
            fail(message.message);
          }
        } else if (message.type === "delta" || message.type === "completed") {
          setPhrases((current) => {
            const previous = current[message.item_id];
            return {
              ...current,
              [message.item_id]: {
                order: message.order,
                text:
                  message.type === "completed"
                    ? message.text
                    : `${previous?.text ?? ""}${message.text}`,
                completed:
                  message.type === "completed" || previous?.completed === true,
              },
            };
          });
        }
      };
      socket.onerror = () => rejectReady?.(new Error("The transcription connection failed."));
      socket.onclose = (event) => {
        if (stopRequestedRef.current) {
          stopResolverRef.current?.();
        } else {
          rejectReady?.(
            new Error(
              event.code === 4401
                ? "Your sign-in session could not be verified."
                : "The transcription connection was lost. Start again.",
            ),
          );
          if (stateRef.current === "listening")
            fail("The transcription connection was lost. Start again.");
        }
      };

      await new Promise<void>((resolve, reject) => {
        if (!socket) return reject(new Error("Unable to open the transcription connection."));
        const timeout = setTimeout(
          () => reject(new Error("The transcription service did not become ready.")),
          15000,
        );
        void ready.then(
          () => {
            clearTimeout(timeout);
            resolve();
          },
          (cause) => {
            clearTimeout(timeout);
            reject(cause);
          },
        );
      });

      await context.resume();
      worklet.port.onmessage = (event: MessageEvent<ArrayBuffer | { type: string }>) => {
        if (event.data instanceof ArrayBuffer) {
          if (socket?.readyState === WebSocket.OPEN) socket.send(event.data);
          return;
        }
        if (event.data.type === "flushed") {
          flushResolverRef.current?.();
          flushResolverRef.current = null;
        }
      };
      source.connect(worklet);
      worklet.connect(context.destination);
      setVoiceState("listening");
      sessionTimerRef.current = setTimeout(() => {
        void (async () => {
          await stopRef.current?.();
          if (mountedRef.current) {
            setError("Dictation session limit reached (5 minutes).");
            setVoiceState("error");
          }
        })();
      }, 5 * 60 * 1000);
    } catch (cause) {
      const message =
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : cause instanceof Error
            ? cause.message
            : "Unable to start voice dictation.";
      fail(message);
    }
  }, [fail, getToken, setVoiceState]);

  const stop = useCallback(async () => {
    if (stateRef.current !== "listening" && stateRef.current !== "connecting") return;
    stopRequestedRef.current = true;
    const worklet = workletRef.current;
    const socket = socketRef.current;
    if (worklet && socket?.readyState === WebSocket.OPEN) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 250);
        flushResolverRef.current = () => {
          clearTimeout(timeout);
          resolve();
        };
        worklet.port.postMessage("flush");
      });
    }
    await releaseAudio();
    if (socket?.readyState === WebSocket.OPEN) {
      const stopped = new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 5500);
        stopResolverRef.current = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
      socket.send(JSON.stringify({ type: "stop" }));
      await stopped;
    }
    socketRef.current = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    if (mountedRef.current) setVoiceState("idle");
  }, [releaseAudio, setVoiceState]);
  useEffect(() => {
    mountedRef.current = true;
    const supportTimer = window.setTimeout(
      () =>
        setSupported(
          Boolean(navigator.mediaDevices?.getUserMedia) &&
            typeof AudioContext !== "undefined" &&
            typeof AudioWorkletNode !== "undefined",
        ),
      0,
    );
    stopRef.current = stop;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(supportTimer);
      if (stopRef.current === stop) stopRef.current = null;
      stopRequestedRef.current = true;
      void releaseAudio();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    };
  }, [releaseAudio, stop]);

  const transcript = useMemo(
    () => {
      const ordered = Object.values(phrases).sort((a, b) => a.order - b.order);
      return ordered.reduce((text, phrase) => {
        const needsSpace =
          text.length > 0 &&
          !/\s$/.test(text) &&
          phrase.text.length > 0 &&
          !/^[,.;!?]/.test(phrase.text);
        return `${text}${needsSpace ? " " : ""}${phrase.text}`;
      }, "");
    },
    [phrases],
  );
  const hasLivePhrase = Object.values(phrases).some((phrase) => !phrase.completed);

  return { state, error, phrases, transcript, hasLivePhrase, supported, start, stop };
}
