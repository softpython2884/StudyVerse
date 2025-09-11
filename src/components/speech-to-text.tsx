
"use client"

import * as React from 'react';
import { Mic, MicOff, LoaderCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRecorder } from '@/hooks/use-recorder';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface SpeechToTextProps {
  onTranscriptionComplete: (text: string) => void;
}

const supportedLanguages = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'fr-FR', label: 'Français' },
    { value: 'es-ES', label: 'Español' },
    { value: 'de-DE', label: 'Deutsch' },
    { value: 'it-IT', label: 'Italiano' },
    { value: 'ja-JP', label: '日本語' },
    { value: 'ko-KR', label: '한국어' },
    { value: 'pt-BR', label: 'Português (Brasil)' },
    { value: 'ru-RU', label: 'Русский' },
    { value: 'zh-CN', label: '中文 (Mandarin)' },
];


export function SpeechToText({ onTranscriptionComplete }: SpeechToTextProps) {
  const { toast } = useToast();
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [lang, setLang] = React.useState<string | null>(null);
  const [isLangDialogOpen, setIsLangDialogOpen] = React.useState(false);

  React.useEffect(() => {
    const savedLang = localStorage.getItem('speech-to-text-lang');
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  const onTranscript = (transcript: string) => {
    onTranscriptionComplete(transcript);
    setIsTranscribing(false);
     toast({
        title: 'Transcription Updated',
        description: 'Your speech has been converted to text.',
     });
  };

  const { isRecording, startRecording, stopRecording } = useRecorder({ onTranscript, lang });

  const handleToggleRecording = () => {
    if (!lang) {
        setIsLangDialogOpen(true);
        return;
    }
    if (isRecording) {
      stopRecording();
      setIsTranscribing(true);
    } else {
      startRecording();
    }
  };
  
  const handleLangSelect = (selectedLang: string) => {
    setLang(selectedLang);
    localStorage.setItem('speech-to-text-lang', selectedLang);
    setIsLangDialogOpen(false);
    // Directly start recording after language selection
    startRecording();
  }


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
    <>
    <div className="flex items-center gap-1">
        <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleRecording}
            disabled={isTranscribing}
            className={isRecording ? 'text-destructive' : ''}
            >
            {getButtonContent()}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsLangDialogOpen(true)}>
            <Settings className="h-4 w-4" />
        </Button>
    </div>


    <Dialog open={isLangDialogOpen} onOpenChange={setIsLangDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Select your language</DialogTitle>
                <DialogDescription>
                    Choose the language you will be speaking in for accurate transcription. This will be saved for future use.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Select onValueChange={handleLangSelect} defaultValue={lang || undefined}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choose a language..." />
                    </SelectTrigger>
                    <SelectContent>
                        {supportedLanguages.map(l => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsLangDialogOpen(false)}>Cancel</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
