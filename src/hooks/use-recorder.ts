
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
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final_transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        }
      }
      if (final_transcript) {
          onTranscript(final_transcript.trim() + ' ');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "aborted" is a common error when programmatically stopping. We can safely ignore it.
      if (event.error !== 'aborted') {
          console.error(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
       setIsRecording(false);
    };
    
    return () => {
      recognitionRef.current?.stop();
    };
  }, [onTranscript]);

  useEffect(() => {
    if (recognitionRef.current && lang) {
      recognitionRef.current.lang = lang;
    }
  }, [lang]);
  
  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch(e) {
        console.error("Could not start recording: ", e);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
        setIsRecording(false);
      } catch(e) {
        console.error("Could not stop recording: ", e);
      }
    }
  };

  return { isRecording, startRecording, stopRecording };
};

    
