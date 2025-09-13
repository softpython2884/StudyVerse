
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
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { spellCheck } from '@/ai/flows/spell-check-flow';
import { getBriefAnswer } from '@/ai/flows/get-brief-answer';
import { refineAndStructureNotes } from '@/ai/flows/refine-and-structure-notes';
import { translateText } from '@/ai/flows/translate-text';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, PenLine, Sparkles, Wand, Languages, Scissors, Copy, ClipboardPaste, Check, X } from 'lucide-react';
import { Button } from './ui/button';

interface CustomContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  x: number;
  y: number;
  selectedText: string;
  selectedHtml: string;
  onReplaceText: (newText: string, isHtml?: boolean) => void;
  getSelectionRect: () => DOMRect | null;
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
  getSelectionRect,
}: CustomContextMenuProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [suggestionState, setSuggestionState] = useState<{
    open: boolean;
    title: string;
    suggestion: string;
    rect: DOMRect | null;
  }>({ open: false, title: '', suggestion: '', rect: null });

  const handleStandardCommands = async (command: 'cut' | 'copy' | 'paste') => {
    if (command === 'paste') {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                if (item.types.includes("text/html")) {
                    const blob = await item.getType("text/html");
                    const html = await blob.text();
                    onReplaceText(html, true);
                    break;
                }
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
  
  const showSuggestion = (title: string, suggestion: string) => {
    const selectionRect = getSelectionRect();
    setSuggestionState({
      open: true,
      title: title,
      suggestion: suggestion,
      rect: selectionRect,
    });
  }

  const handleAcceptSuggestion = () => {
    onReplaceText(suggestionState.suggestion, true);
    setSuggestionState({ open: false, title: '', suggestion: '', rect: null });
  };

  const handleDeclineSuggestion = () => {
    setSuggestionState({ open: false, title: '', suggestion: '', rect: null });
  };


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
                     showSuggestion("Correction Suggestion", spellResult.correctedText);
                } else {
                    toast({ title: "No corrections found." });
                }
                break;
            case 'answer':
                const answerResult = await getBriefAnswer({ question: textToProcess });
                toast({ title: 'Brief Answer', description: answerResult.answer, duration: 10000 });
                break;
            case 'refine':
                const refineResult = await refineAndStructureNotes({ rawNotes: textToProcess });
                 showSuggestion("Refinement Suggestion", refineResult.refinedNotes);
                break;
            case 'translate':
                 if (lang) {
                    const translateResult = await translateText({ text: textToProcess, targetLanguage: lang });
                    showSuggestion(`Translation to ${lang}`, translateResult.translatedText);
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
    <>
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

    <Popover open={suggestionState.open} onOpenChange={(isOpen) => !isOpen && handleDeclineSuggestion()}>
        <PopoverAnchor style={{
            position: 'fixed',
            top: suggestionState.rect ? suggestionState.rect.bottom + 4 : 0,
            left: suggestionState.rect ? suggestionState.rect.left + suggestionState.rect.width / 2 : 0,
        }} />
        <PopoverContent className="w-auto max-w-md p-2" align="center">
            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">{suggestionState.title}</div>
                 <div className="p-2 border rounded-md bg-secondary text-secondary-foreground max-h-40 overflow-y-auto w-full prose prose-sm dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: suggestionState.suggestion }}></div>
                </div>
                <div className="flex justify-end gap-2">
                     <Button variant="ghost" size="icon" onClick={handleDeclineSuggestion} className="h-7 w-7">
                        <X className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleAcceptSuggestion} className="h-7 w-7">
                        <Check className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </PopoverContent>
    </Popover>
    </>
  );
}
