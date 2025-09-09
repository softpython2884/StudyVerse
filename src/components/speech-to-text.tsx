"use client"

import * as React from 'react';
import { Mic, MicOff, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRecorder } from '@/hooks/use-recorder';

interface SpeechToTextProps {
  onTranscriptionComplete: (text: string) => void;
}

export function SpeechToText({ onTranscriptionComplete }: SpeechToTextProps) {
  const { toast } = useToast();
  const [isTranscribing, setIsTranscribing] = React.useState(false);

  const onTranscript = (transcript: string) => {
    onTranscriptionComplete(transcript);
    setIsTranscribing(false);
     toast({
        title: 'Transcription Updated',
        description: 'Your speech has been converted to text.',
     });
  };

  const { isRecording, startRecording, stopRecording } = useRecorder({ onTranscript });

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      setIsTranscribing(true); // Show loading while final transcript is processed
    } else {
      startRecording();
    }
  };

  const getButtonContent = () => {
    if (isTranscribing) {
      return (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      );
    }
    if (isRecording) {
      return (
        <>
          <MicOff className="mr-2 h-4 w-4" />
          Stop Recording
        </>
      );
    }
    return (
      <>
        <Mic className="mr-2 h-4 w-4" />
        Start Recording
      </>
    );
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleRecording}
      disabled={isTranscribing}
      className={isRecording ? 'text-destructive' : ''}
    >
      {getButtonContent()}
    </Button>
  );
}
