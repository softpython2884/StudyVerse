
"use client"

import { useState, useRef, useEffect, useCallback } from 'react';

// Type definition for the SpeechRecognition API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface UseRecorderProps {
    onTranscript: (transcript: string) => void;
    lang: string | null;
}


export const useRecorder = ({ onTranscript, lang }: UseRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const handleTranscript = useCallback(onTranscript, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang || 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final_transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        }
      }
      if (final_transcript) {
          handleTranscript(final_transcript.trim() + ' ');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
       // Check the ref to see if we are in a recording state.
       // The onend event can fire unexpectedly, so we check our own state.
       if (recognitionRef.current && isRecording) {
            setIsRecording(false);
       }
    };
    
    recognitionRef.current = recognition;

    return () => {
      if(recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  // We re-run this effect if the language changes
  }, [handleTranscript, lang, isRecording]);
  
  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return { isRecording, startRecording, stopRecording };
};

    
