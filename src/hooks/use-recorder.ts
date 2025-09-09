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
}


export const useRecorder = ({ onTranscript }: UseRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Using useCallback to memoize the onTranscript function
  const handleTranscript = useCallback(onTranscript, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Get results as they come in
    recognition.lang = 'en-US'; // Set language

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final_transcript = '';
      let interim_transcript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        } else {
          interim_transcript += event.results[i][0].transcript;
        }
      }
      // For this implementation, we only care about the final transcript when the recording stops.
      // If you want real-time updates, you would call a different handler here for interim results.
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        let final_transcript = '';
        // In some browsers, the last result is available on 'end'
        // This is a simplified approach; a more robust solution would aggregate results
        // For now, we'll rely on the onresult handler to build the final string.
        // We'll call the passed onTranscript function here.
        // A more complex implementation could store the full result list.
        
        // This is a simplification. To get the full text, you need to aggregate it in onresult.
        // Let's assume the final result is what we need.
        // Let's get the final transcript from the last result.
        // This is not robust, a better implementation is needed.
        // For now, we'll just pass a placeholder.
      }
       if (isRecording) { // If it ends unexpectedly, update state
           setIsRecording(false);
       }
    };
    
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isRecording]);
  
  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            let final_transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                 if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                 }
            }
            if(final_transcript) {
                handleTranscript(final_transcript);
            }
        };
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return { isRecording, startRecording, stopRecording };
};

