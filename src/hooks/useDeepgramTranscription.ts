"use client";

import { useRef, useState, useCallback } from "react";
import { highlightHedges } from "@/lib/hedgeDetector";

export interface TranscriptChunk {
  speaker: "you" | "them";
  text: string;
  highlighted: string; // HTML with <mark> tags — only populated for "you"
  timestamp: number;
}

export interface DeepgramState {
  isListening: boolean;
  error: string | null;
}

export interface DeepgramControls {
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
}

type ChunkCallback = (chunk: TranscriptChunk) => void;

// Deepgram word object shape
interface DGWord {
  word: string;
  punctuated_word?: string;
  speaker: number;
  start: number;
  end: number;
}

interface DGResult {
  type: string;
  is_final: boolean;
  speech_final: boolean;
  channel: {
    alternatives: Array<{
      transcript: string;
      words: DGWord[];
    }>;
  };
}

export function useDeepgramTranscription(
  onChunk?: ChunkCallback
): DeepgramState & DeepgramControls {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Group consecutive DGWords by speaker into TranscriptChunks
  function parseWords(words: DGWord[]): TranscriptChunk[] {
    if (!words || words.length === 0) return [];

    const chunks: TranscriptChunk[] = [];
    let currentSpeaker = words[0].speaker;
    let currentWords: DGWord[] = [words[0]];

    for (const w of words.slice(1)) {
      if (w.speaker === currentSpeaker) {
        currentWords.push(w);
      } else {
        chunks.push(buildChunk(currentSpeaker, currentWords));
        currentSpeaker = w.speaker;
        currentWords = [w];
      }
    }
    chunks.push(buildChunk(currentSpeaker, currentWords));
    return chunks;
  }

  function buildChunk(speakerIndex: number, words: DGWord[]): TranscriptChunk {
    const speaker: "you" | "them" = speakerIndex === 0 ? "you" : "them";
    const text = words
      .map((w) => w.punctuated_word ?? w.word)
      .join(" ")
      .trim();

    const highlighted = speaker === "you" ? highlightHedges(text) : text;

    return { speaker, text, highlighted, timestamp: Date.now() };
  }

  const start = useCallback(
    async (deviceId?: string) => {
      setError(null);

      // 1. Fetch Deepgram API key from our backend
      let apiKey: string;
      try {
        const res = await fetch("/api/deepgram-token");
        if (!res.ok) throw new Error("Failed to get Deepgram token");
        const data = await res.json();
        apiKey = data.key;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to get Deepgram token");
        return;
      }

      // 2. Capture audio — use BlackHole device if selected, otherwise default mic
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
      } catch (e) {
        setError("Microphone access denied. Check permissions.");
        console.error(e);
        return;
      }
      streamRef.current = stream;

      // 3. Connect to Deepgram WebSocket
      const url =
        "wss://api.deepgram.com/v1/listen" +
        "?model=nova-2" +
        "&diarize=true" +
        "&punctuate=true" +
        "&smart_format=true" +
        "&language=en-US";

      const ws = new WebSocket(url, ["token", apiKey]);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsListening(true);

        // 4. Start MediaRecorder — Chrome defaults to audio/webm;codecs=opus
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm",
        });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        recorder.start(250); // send chunks every 250ms
      };

      ws.onmessage = (event) => {
        let msg: DGResult;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        // Only act on speech_final=true — ensures words[] has complete speaker labels
        if (
          msg.type === "Results" &&
          msg.speech_final === true &&
          msg.channel?.alternatives?.[0]?.words?.length > 0
        ) {
          const chunks = parseWords(msg.channel.alternatives[0].words);
          for (const chunk of chunks) {
            if (chunk.text.trim()) {
              onChunk?.(chunk);
            }
          }
        }
      };

      ws.onerror = () => {
        setError("Deepgram connection error. Check your API key.");
      };

      ws.onclose = (e) => {
        setIsListening(false);
        if (e.code !== 1000 && e.code !== 1001) {
          // Abnormal close
          setError(`Deepgram disconnected (code ${e.code}). Restarting…`);
          // Auto-reconnect after 2s
          setTimeout(() => {
            if (streamRef.current) start(deviceId);
          }, 2000);
        }
      };
    },
    [onChunk]
  );

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;

    if (wsRef.current) {
      // Send close message to Deepgram first
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
      }
      wsRef.current.close(1000);
      wsRef.current = null;
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setIsListening(false);
    setError(null);
  }, []);

  return { isListening, error, start, stop };
}
