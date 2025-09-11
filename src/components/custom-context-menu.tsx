
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { spellCheck } from '@/ai/flows/spell-check-flow';
import { getBriefAnswer } from '@/ai/flows/get-brief-answer';
import { refineAndStructureNotes } from '@/ai/flows/refine-and-structure-notes';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, PenLine, Sparkles, Wand } from 'lucide-react';

interface CustomContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  x: number;
  y: number;
  selectedText: string;
  onReplaceText: (newText: string) => void;
}

export function CustomContextMenu({
  open,
  onOpenChange,
  x,
  y,
  selectedText,
  onReplaceText,
}: CustomContextMenuProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (actionType: 'spellcheck' | 'answer' | 'refine') => {
    if (!selectedText) return;

    setIsLoading(actionType);
    try {
        switch (actionType) {
            case 'spellcheck':
                const spellResult = await spellCheck({ text: selectedText });
                onReplaceText(spellResult.correctedText);
                break;
            case 'answer':
                const answerResult = await getBriefAnswer({ question: selectedText });
                toast({ title: 'Brief Answer', description: answerResult.answer });
                break;
            case 'refine':
                const refineResult = await refineAndStructureNotes({ rawNotes: selectedText });
                onReplaceText(refineResult.refinedNotes);
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
        <DropdownMenuContent align="start" className="w-56">
             <DropdownMenuItem onClick={() => handleAction('spellcheck')} disabled={!selectedText || !!isLoading}>
                {isLoading === 'spellcheck' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
                <span>Correct Spelling & Grammar</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('answer')} disabled={!selectedText || !!isLoading}>
                {isLoading === 'answer' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                <span>Get Brief Answer</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('refine')} disabled={!selectedText || !!isLoading}>
                {isLoading === 'refine' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand className="mr-2 h-4 w-4" />}
                <span>Refine & Structure Selection</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
