"use client";

import { useRef, useState, useCallback } from "react";

export interface SpeechState {
  transcript: string;        // all finalized text
  interimText: string;       // in-progress (not yet final)
  isListening: boolean;
  error: string | null;
}

export interface SpeechControls {
  start: () => void;
  stop: () => void;
  reset: () => void;
}

type FinalCallback = (newChunk: string) => void;

export function useSpeechRecognition(onFinalChunk?: FinalCallback): SpeechState & SpeechControls {
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    // Web Speech API is Chrome-only — guard for SSR / other browsers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: new () => SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition as new () => SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition as new () => SpeechRecognition;

    if (!SR) {
      setError("Web Speech API not supported. Use Chrome.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalChunk) {
        setTranscript((prev) => prev + finalChunk);
        onFinalChunk?.(finalChunk);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech") {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      // Auto-restart if still supposed to be listening (handles Chrome's 60s timeout)
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
          setIsListening(true);
        } catch {
          // Already stopped intentionally
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onFinalChunk]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setInterimText("");
    setError(null);
  }, [stop]);

  return { transcript, interimText, isListening, error, start, stop, reset };
}
