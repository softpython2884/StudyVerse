
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { spellCheck } from '@/ai/flows/spell-check-flow';
import { getBriefAnswer } from '@/ai/flows/get-brief-answer';
import { refineAndStructureNotes } from '@/ai/flows/refine-and-structure-notes';
import { translateText } from '@/ai/flows/translate-text';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, PenLine, Sparkles, Wand, Languages, Scissors, Copy, ClipboardPaste } from 'lucide-react';
import { Button } from './ui/button';

interface CustomContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  x: number;
  y: number;
  selectedText: string;
  selectedHtml: string;
  onReplaceText: (newText: string, isHtml?: boolean) => void;
}

const targetLanguages = ['English', 'Spanish', 'German', 'Japanese', 'Chinese'];

export function CustomContextMenu({
  open,
  onOpenChange,
  x,
  y,
  selectedText,
  selectedHtml,
  onReplaceText,
}: CustomContextMenuProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleStandardCommands = async (command: 'cut' | 'copy' | 'paste') => {
    if (command === 'paste') {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                // Prefer HTML content if available
                if (item.types.includes("text/html")) {
                    const blob = await item.getType("text/html");
                    const html = await blob.text();
                    onReplaceText(html, true);
                    break;
                }
                // Fallback to plain text
                if (item.types.includes("text/plain")) {
                    const blob = await item.getType("text/plain");
                    const text = await blob.text();
                    onReplaceText(text, false);
                    break;
                }
            }
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                 toast({ title: 'Permission Denied', description: 'Please allow clipboard access in your browser settings to use the paste function.', variant: 'destructive' });
            } else {
                toast({ title: 'Paste Failed', description: 'Could not read from clipboard.', variant: 'destructive' });
            }
        }
    } else {
        document.execCommand(command);
    }
    onOpenChange(false);
  }
  
  const showSuggestionToast = (title: string, suggestion: string) => {
    toast({
      title: title,
      description: "Review the suggestion below.",
      duration: 10000,
      action: (
        <div className="flex flex-col gap-2 items-start w-full">
            <div className="p-2 border rounded-md bg-secondary text-secondary-foreground max-h-20 overflow-y-auto w-full">
                <div dangerouslySetInnerHTML={{ __html: suggestion }}></div>
            </div>
            <Button
                size="sm"
                onClick={() => {
                    onReplaceText(suggestion, true);
                    toast().dismiss();
                }}
            >
            Accept
          </Button>
        </div>
      ),
    });
  }


  const handleAiAction = async (actionType: 'spellcheck' | 'answer' | 'refine' | 'translate', lang?: string) => {
    const textToProcess = actionType === 'answer' ? selectedText : selectedHtml;
    if (!textToProcess) return;

    const loadingId = lang ? `${actionType}:${lang}` : actionType;
    setIsLoading(loadingId);
    try {
        switch (actionType) {
            case 'spellcheck':
                const spellResult = await spellCheck({ text: textToProcess });
                if (spellResult.correctedText.trim() !== textToProcess.trim()) {
                     showSuggestionToast("Correction Suggestion", spellResult.correctedText);
                } else {
                    toast({ title: "No corrections found." });
                }
                break;
            case 'answer': // This still uses plain text
                const answerResult = await getBriefAnswer({ question: textToProcess });
                toast({ title: 'Brief Answer', description: answerResult.answer, duration: 10000 });
                break;
            case 'refine':
                const refineResult = await refineAndStructureNotes({ rawNotes: textToProcess });
                 showSuggestionToast("Refinement Suggestion", refineResult.refinedNotes);
                break;
            case 'translate':
                 if (lang) {
                    const translateResult = await translateText({ text: textToProcess, targetLanguage: lang });
                    showSuggestionToast(`Translation to ${lang}`, translateResult.translatedText);
                }
                break;
        }
    } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
        setIsLoading(null);
        onOpenChange(false);
    }
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
            <div style={{ position: 'fixed', top: y, left: x, width: 1, height: 1 }} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" onFocusOutside={(e) => {
            if (e.target && 'role' in e.target && e.target.role === 'menuitem') {
              e.preventDefault();
            }
        }}>
            <DropdownMenuItem onClick={() => handleStandardCommands('cut')} disabled={!selectedText}>
                <Scissors className="mr-2 h-4 w-4" />
                <span>Cut</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStandardCommands('copy')} disabled={!selectedText}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Copy</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStandardCommands('paste')}>
                <ClipboardPaste className="mr-2 h-4 w-4" />
                <span>Paste</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
             <DropdownMenuItem onClick={() => handleAiAction('spellcheck')} disabled={!selectedText || !!isLoading}>
                {isLoading === 'spellcheck' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
                <span>Correct Spelling & Grammar</span>
            </DropdownMenuItem>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!selectedText || !!isLoading}>
                    {isLoading?.startsWith('translate') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                    <span>Translate</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        {targetLanguages.map(lang => (
                            <DropdownMenuItem key={lang} onClick={() => handleAiAction('translate', lang)}>
                                {isLoading === `translate:${lang}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="w-4 h-4 mr-2"/>}
                                <span>{lang}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAiAction('answer')} disabled={!selectedText || !!isLoading}>
                {isLoading === 'answer' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                <span>Get Brief Answer</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAiAction('refine')} disabled={!selectedText || !!isLoading}>
                {isLoading === 'refine' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand className="mr-2 h-4 w-4" />}
                <span>Refine & Structure Selection</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
