"use client"

import * as React from 'react';
import { Mic, MicOff, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { realTimeNoteTaking } from '@/ai/flows/real-time-note-taking';
import { useRecorder } from '@/hooks/use-recorder';

interface SpeechToTextProps {
  onTranscriptionComplete: (text: string) => void;
}

export function SpeechToText({ onTranscriptionComplete }: SpeechToTextProps) {
  const { toast } = useToast();
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const { isRecording, startRecording, stopRecording, audioBlob } = useRecorder();

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  React.useEffect(() => {
    const transcribeAudio = async () => {
      if (!audioBlob) return;

      setIsTranscribing(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const result = await realTimeNoteTaking({ audioDataUri: base64Audio });
          onTranscriptionComplete(result.transcription);
          toast({
            title: 'Transcription Successful',
            description: 'Your speech has been converted to text.',
          });
        };
      } catch (error) {
        console.error('Transcription error:', error);
        toast({
          title: 'Transcription Failed',
          description: 'Could not transcribe the audio. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsTranscribing(false);
      }
    };

    transcribeAudio();
  }, [audioBlob, onTranscriptionComplete, toast]);

  const getButtonContent = () => {
    if (isTranscribing) {
      return (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Transcribing...
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
