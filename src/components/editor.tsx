

      "use client";

import * as React from "react";
import type { Page } from "@/lib/types";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Code,
  Quote,
  Undo,
  Redo,
  Printer,
  Save,
  Bot,
  Network,
  Share2,
  Strikethrough,
  Link,
  Table,
  ListChecks,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  Minus,
  Info,
  PanelRightOpen,
  Superscript,
  Subscript,
  MessageSquarePlus,
  Copy,
  Scissors,
  ClipboardPaste,
  Sparkles,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";
import { updatePageContent } from "@/lib/actions";
import { SpeechToText } from "./speech-to-text";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { refineAndStructureNotes } from "@/ai/flows/refine-and-structure-notes";
import { generateDiagram } from "@/ai/flows/generate-diagrams-from-text";
import { cn } from "@/lib/utils";
import showdown from 'showdown';
import { spellCheck } from "@/ai/flows/spell-check-flow";


interface EditorProps {
  page: Page;
}

type ActiveStyles = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  superscript: boolean;
  subscript: boolean;
  code: boolean;
  [key: string]: boolean;
};

type TocItem = {
  id: string;
  level: number;
  text: string;
};

type InlineCorrection = {
  anchor: HTMLElement;
  original: string;
  suggestion: string;
};

export function Editor({ page }: EditorProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [currentBlockStyle, setCurrentBlockStyle] = React.useState("p");
  const [toc, setToc] = React.useState<TocItem[]>([]);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const scrollDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [activeTocId, setActiveTocId] = React.useState<string | null>(null);
  const [isTocVisible, setIsTocVisible] = React.useState(true);


  // --- SELECTION MARKER HELPERS ---
  const savedSelection = React.useRef<Range | null>(null);

  const saveSelection = () => {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
            savedSelection.current = range.cloneRange();
          }
      }
  };

  const restoreSelection = () => {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection();
      if (savedSelection.current && sel) {
          sel.removeAllRanges();
          sel.addRange(savedSelection.current);
      } else {
          const editor = editorRef.current;
          if (editor) {
              const range = document.createRange();
              range.selectNodeContents(editor);
              range.collapse(false); // Go to the end
              sel?.removeAllRanges();
              sel?.addRange(range);
          }
      }
  };
  
  const onToolbarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // prevents blur
    saveSelection();    // mark selection before any popover/dialog steals focus
  };

  const [refinedNotes, setRefinedNotes] = React.useState("");
  const [diagramText, setDiagramText] = React.useState("");
  const [diagramFormat, setDiagramFormat] = React.useState<"markdown" | "latex" | "txt">("txt");
  const [generatedDiagram, setGeneratedDiagram] = React.useState("");
  const [isRefining, setIsRefining] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [htmlToInsert, setHtmlToInsert] = React.useState("");


  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [isTablePopoverOpen, setIsTablePopoverOpen] = React.useState(false);
  const [tableGridSize, setTableGridSize] = React.useState({ rows: 0, cols: 0 });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [isAiPopoverOpen, setIsAiPopoverOpen] = React.useState(false);
  const [aiPopoverAnchor, setAiPopoverAnchor] = React.useState<HTMLElement | null>(null);

  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; visible: boolean; isTextSelected: boolean }>({
    x: 0, y: 0, visible: false, isTextSelected: false
  });
  
  const [inlineCorrection, setInlineCorrection] = React.useState<InlineCorrection | null>(null);
  const spellCheckDebounceTimer = React.useRef<NodeJS.Timeout | null>(null);


  const [activeStyles, setActiveStyles] = React.useState<ActiveStyles>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    superscript: false,
    subscript: false,
    code: false,
  });

  const { toast } = useToast();

  const updateToc = React.useCallback(() => {
    if (!editorRef.current) return;
    const headings = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const newToc: TocItem[] = [];
    headings.forEach((heading) => {
      const id = heading.id || `toc-heading-${Date.now()}-${Math.random()}`;
      if (!heading.id) {
        heading.id = id;
      }
      newToc.push({
        id: id,
        level: parseInt(heading.tagName.substring(1), 10),
        text: heading.textContent || '',
      });
    });
    setToc(newToc);
  }, []);

  const debouncedUpdateToc = React.useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      updateToc();
    }, 300); // 300ms debounce delay
  }, [updateToc]);
  
  const updateActiveTocOnScroll = React.useCallback(() => {
        if (!editorRef.current) return;

        let lastVisibleHeadingId: string | null = null;
        const headings = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const rect = heading.getBoundingClientRect();
            // Check if the heading is at or above the top of the viewport (with a small tolerance)
            if (rect.top <= 130) { // 130px offset from the top
                lastVisibleHeadingId = heading.id;
            } else {
                // Since headings are ordered, we can break early
                break;
            }
        }
        setActiveTocId(lastVisibleHeadingId);

  }, []);

  const debouncedScrollHandler = React. useCallback(() => {
    if (scrollDebounceTimerRef.current) {
      clearTimeout(scrollDebounceTimerRef.current);
    }
    scrollDebounceTimerRef.current = setTimeout(updateActiveTocOnScroll, 100);
  }, [updateActiveTocOnScroll]);


  const updateToolbarState = React.useCallback(() => {
    if (typeof window === 'undefined') return;

    const queryCommandState = (command: string) => document.queryCommandState(command);

    const isNodeIn = (node: Node | null, tagName: string): boolean => {
        if (!node || !editorRef.current?.contains(node)) return false;
        if (node.nodeName.toLowerCase() === tagName.toLowerCase()) return true;
        return isNodeIn(node.parentNode, tagName);
    };

    const selection = window.getSelection();
    let isCode = false;
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.commonAncestorContainer) {
            isCode = isNodeIn(range.commonAncestorContainer, 'code');
        }
    }

    const newActiveStyles: ActiveStyles = {
      bold: queryCommandState('bold'),
      italic: queryCommandState('italic'),
      underline: queryCommandState('underline'),
      strikethrough: queryCommandState('strikeThrough'),
      superscript: queryCommandState('superscript'),
      subscript: queryCommandState('subscript'),
      code: isCode,
    };
    setActiveStyles(newActiveStyles);
    
    if (selection && selection.rangeCount > 0) {
      let node = selection.getRangeAt(0).startContainer;

      if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
        node = node.parentNode;
      }

      if (node && node instanceof HTMLElement && editorRef.current?.contains(node)) {
        const blockElement = node.closest('p, h1, h2, h3, h4, h5, h6, pre, blockquote, li');
        if (blockElement) {
            let blockTag = blockElement.tagName.toLowerCase();
             if (blockTag === 'li' && blockElement.closest('ul[data-type="checklist"]')) {
              blockTag = 'checklist';
            } else if (blockTag === 'li') {
              const list = blockElement.closest('ul, ol');
              if (list) {
                blockTag = list.tagName.toLowerCase();
              }
            } else if (blockTag === 'code' && blockElement.parentElement?.tagName.toLowerCase() === 'pre') {
              blockTag = 'pre';
            }
            setCurrentBlockStyle(blockTag);

            // For active TOC item, we rely on the scroll handler, but this can set an initial one.
            const headingElement = node.closest('h1, h2, h3, h4, h5, h6');
            if (headingElement) {
                setActiveTocId(headingElement.id);
            }

        } else {
            setCurrentBlockStyle('p');
        }
      }
    }
  }, []);

  // init + listeners
  React.useEffect(() => {
    const onSelChange = () => { saveSelection(); updateToolbarState(); };
    const onMouseUp = () => { saveSelection(); updateToolbarState(); };
    const onKeyUp = () => { saveSelection(); updateToolbarState(); };
    
    const scroller = scrollContainerRef.current;

    document.addEventListener('selectionchange', onSelChange);
    document.addEventListener('mouseup', onMouseUp);
    editorRef.current?.addEventListener('keyup', onKeyUp);
    scroller?.addEventListener('scroll', debouncedScrollHandler);
   
    return () => {
      document.removeEventListener('selectionchange', onSelChange);
      document.removeEventListener('mouseup', onMouseUp);
      editorRef.current?.removeEventListener('keyup', onKeyUp);
      scroller?.removeEventListener('scroll', debouncedScrollHandler);

    };
  }, [page.id, updateToolbarState, debouncedScrollHandler]);

  const handleFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode!;
    const element = node as HTMLElement;
    
    if (command === 'formatBlock' && value) {
        if (value === 'pre') {
            const currentBlock = element.closest('p, h1, h2, h3, h4, h5, h6, pre, blockquote, li');
            const isInPre = currentBlock?.tagName.toLowerCase() === 'pre';

            if (isInPre) {
                 document.execCommand('formatBlock', false, 'p');
            } else {
                 document.execCommand('formatBlock', false, value);
            }
        } else {
             const currentBlock = element.closest('p, h1, h2, h3, h4, h5, h6, pre, blockquote, li');
            if (currentBlock && currentBlock.tagName.toLowerCase() === value) {
                document.execCommand('formatBlock', false, 'p');
            } else {
                document.execCommand(command, false, value);
            }
        }

    } else if (command === 'inlineCode') {
        const isAlreadyCode = document.queryCommandState('insertHTML', false, '<code>');
        const commonAncestor = range.commonAncestorContainer;
        const codeNode = (commonAncestor.nodeType === Node.ELEMENT_NODE ? commonAncestor : commonAncestor.parentElement)?.closest('code');

        if (codeNode && !codeNode.closest('pre')) {
            const parent = codeNode.parentNode;
            if (parent) {
                while(codeNode.firstChild) {
                    parent.insertBefore(codeNode.firstChild, codeNode);
                }
                parent.removeChild(codeNode);
                parent.normalize();
            }
        } else {
            const selectionText = selection.toString();
            if (selectionText) {
                document.execCommand('insertHTML', false, `<code>${selectionText}</code>`);
            }
        }

    } else {
      document.execCommand(command, false, value);
    }
    
    setTimeout(() => {
        updateToolbarState();
        debouncedUpdateToc();
    }, 0);
  };
  
  const triggerSpellCheck = async () => {
    if (spellCheckDebounceTimer.current) {
        clearTimeout(spellCheckDebounceTimer.current);
    }

    spellCheckDebounceTimer.current = setTimeout(async () => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        
        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        
        // Only trigger on text nodes within the editor
        if (node.nodeType !== Node.TEXT_NODE || !editorRef.current?.contains(node)) {
            setInlineCorrection(null);
            return;
        }

        const text = node.textContent || "";
        if (text.trim() === "" || text.endsWith(' ')) return; // Don't check empty or just-ended sentences yet.

        // Get the sentence or a reasonable chunk of text around the cursor
        const block = (node.parentElement as HTMLElement)?.closest('p,li');
        if (!block) return;
        const blockText = block.innerText;

        try {
            const result = await spellCheck({ text: blockText });
            if (result.correctedText && result.correctedText !== blockText) {
                const anchor = document.createElement('span');
                anchor.className = "correction-anchor";
                range.insertNode(anchor);
                
                // Add a very small delay for the DOM to update with the anchor
                setTimeout(() => {
                     setInlineCorrection({
                        anchor,
                        original: blockText,
                        suggestion: result.correctedText,
                    });
                }, 10);
            } else {
                setInlineCorrection(null);
            }
        } catch (e) {
            console.error("Spell check failed:", e);
            setInlineCorrection(null);
        }
    }, 1500); // Wait 1.5 seconds after user stops typing
};

  // KeyUp handles markdown-like transforms (# headings, urls) and updates toolbar
  const handleKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
     if (event.key === ' ' || event.key === 'Enter' || event.key === '.') {
      triggerSpellCheck();
      
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;

      // Ensure we are working with a text node
      if (textNode.nodeType !== Node.TEXT_NODE) {
        updateToolbarState();
        debouncedUpdateToc();
        return;
      }
      
      const textContent = textNode.textContent || '';
      const cursorPosition = range.startOffset;
      const textBeforeCursor = textContent.substring(0, cursorPosition);
      
      const urlMatch = textBeforeCursor.match(/(https?:\/\/\S+)\s$/);
      
      if (urlMatch) {
          const url = urlMatch[1];
          const urlStartIndex = textBeforeCursor.lastIndexOf(url);
          
          if(urlStartIndex > -1) {
            
              const urlRange = document.createRange();
              urlRange.setStart(textNode, urlStartIndex);
              urlRange.setEnd(textNode, urlStartIndex + url.length);
              
              let newElement: HTMLElement;
              const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);

              if (ytMatch) {
                  const videoId = ytMatch[1];
                  const iframe = document.createElement('iframe');
                  iframe.width = '560';
                  iframe.height = '315';
                  iframe.src = `https://www.youtube.com/embed/${videoId}`;
                  iframe.title = "YouTube video player";
                  iframe.frameBorder = "0";
                  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                  iframe.allowFullscreen = true;
                  iframe.style.maxWidth = '100%';
                  iframe.style.borderRadius = '0.5rem';
                  newElement = iframe;
              } else if (/\.(jpe?g|png|gif|webp)$/i.test(url)) {
                  const img = document.createElement('img');
                  img.src = url;
                  img.style.maxWidth = '100%';
                  img.style.borderRadius = '0.5rem';
                  newElement = img;
              } else if (/\.(mp4|webm)$/i.test(url)) {
                  const video = document.createElement('video');
                  video.src = url;
                  video.controls = true;
                  video.style.maxWidth = '100%';
                  video.style.borderRadius = '0.5rem';
                  newElement = video;
              } else {
                  const a = document.createElement('a');
                  a.href = url;
                  a.textContent = url;
                  newElement = a;
              }
              
              urlRange.deleteContents();
              urlRange.insertNode(newElement);

              // Place cursor after the new element
              const newRange = document.createRange();
              newRange.setStartAfter(newElement);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              
              // Add a space if the key was space
              if (event.key === ' ') {
                const spaceNode = document.createTextNode(' ');
                newRange.insertNode(spaceNode);
                newRange.setStartAfter(spaceNode);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
              }
              
              event.preventDefault();
          }
      }


      // match headings typed at start of block e.g. "# " or "## " up to 6
      const block = (textNode.parentElement as HTMLElement)?.closest('p,div,li,h1,h2,h3,h4,h5,h6,pre,blockquote');
      if (block) {
          const startRange = document.createRange();
          startRange.setStart(block, 0);
          startRange.setEnd(range.startContainer, range.startOffset);
          const prefixText = startRange.toString();

          const headingMatch = prefixText.match(/^\s*(#{1,6})\s$/);
          if (headingMatch) {
            event.preventDefault();
            const level = headingMatch[1].length;

            // More robust way to remove the markdown prefix
            const firstTextNode = (function findFirstTextNode(node: Node): Node | null {
              if (node.nodeType === Node.TEXT_NODE) return node;
              for (let i = 0; i < node.childNodes.length; i++) {
                  const result = findFirstTextNode(node.childNodes[i]);
                  if (result) return result;
              }
              return null;
            })(block);
            
            if (firstTextNode && firstTextNode.textContent) {
                const matchLength = headingMatch[0].length;
                firstTextNode.textContent = firstTextNode.textContent.slice(matchLength);
            }

            setTimeout(() => {
              handleFormat('formatBlock', `h${level}`);
              const newRange = document.createRange();
              newRange.selectNodeContents(block);
              newRange.collapse(false);
              sel.removeAllRanges();
              sel.addRange(newRange);
              updateToolbarState();
            }, 0);
            return;
          }
      }
    }
    updateToolbarState();
    debouncedUpdateToc();
  };

  const applyCorrection = () => {
    if (!inlineCorrection) return;
    
    const { anchor, suggestion } = inlineCorrection;
    const block = anchor.closest('p, li');
    
    if (block) {
        block.textContent = suggestion;

        // Restore cursor position at the end of the corrected block
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(block);
        range.collapse(false); // false to collapse to the end
        sel?.removeAllRanges();
        sel?.addRange(range);
    }
    
    setInlineCorrection(null);
  };


  // KeyDown handles shortcuts + Enter special behavior + checklist/tab navigation + headings via Ctrl+Shift+N
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab' && inlineCorrection) {
      event.preventDefault();
      applyCorrection();
      return;
    }

    if (event.key !== 'Tab' && inlineCorrection) {
        setInlineCorrection(null);
    }

    // Enter key logic
    if (event.key === 'Enter' && !event.shiftKey) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        let block: HTMLElement | null = null;
        
        if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
            block = node.parentElement.closest('blockquote, pre');
        } else if (node instanceof HTMLElement) {
            block = node.closest('blockquote, pre');
        }

        // Exit from blockquote or code block 
        if (block) {
            event.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '&#8203;'; // Zero-width space for caret
            block.after(p);
            
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            setTimeout(updateToolbarState, 0);
            return;
        }
      
      // In a checklist
      const li = (node.nodeType === Node.TEXT_NODE ? node.parentElement?.closest('li') : (node as HTMLElement).closest?.('li'));
      if (li && li.closest('ul[data-type="checklist"]')) {
          if (li.textContent?.trim() === '') {
             event.preventDefault();
             document.execCommand('outdent');
             handleFormat('formatBlock', 'p');
             return;
          }
        event.preventDefault();
        const newItem = '<li><label contenteditable="false" class="check-label"><input type="checkbox" /><span contenteditable="true">&#8203;</span></label></li>';
        const r = sel.getRangeAt(0);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand('insertHTML', false, newItem);
        setTimeout(() => {
          const nextLi = li.nextElementSibling as HTMLElement | null;
          if (nextLi) {
            const span = nextLi.querySelector('[contenteditable="true"]') as HTMLElement | null;
            if (span) {
              const rng = document.createRange();
              const s = window.getSelection();
              rng.selectNodeContents(span);
              rng.collapse(true);
              s?.removeAllRanges();
              s?.addRange(rng);
            }
          }
          updateToolbarState();
        }, 0);
        return;
      }
      
      // In a heading
      const heading = (node.nodeType === Node.TEXT_NODE ? node.parentElement?.closest('h1, h2, h3, h4, h5, h6') : (node as HTMLElement).closest?.('h1, h2, h3, h4, h5, h6'));
      if (heading && !event.shiftKey) {
        event.preventDefault();
        const p = document.createElement('p');
        p.innerHTML = '&#8203;'; // Zero-width space for caret
        heading.after(p);
        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        return;
      }
    }
    
    if (event.ctrlKey && event.key === '-') {
        event.preventDefault();
        document.execCommand('insertHTML', false, '<hr><p>&#8203;</p>');
        const newRange = document.createRange();
        const p = editorRef.current?.lastElementChild;
        if (p) {
            newRange.setStart(p, 0);
            newRange.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(newRange);
        }
        updateToolbarState();
        return;
    }

    if (event.ctrlKey && event.key === 'k' && !event.shiftKey) {
      event.preventDefault();
      setIsCommandPaletteOpen(true);
      return;
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (r.collapsed && r.startContainer.nodeType === Node.TEXT_NODE) {
          const txt = r.startContainer.textContent || "";
          let start = r.startOffset, end = r.startOffset;
          while (start > 0 && /\w/.test(txt[start - 1])) start--;
          while (end < txt.length && /\w/.test(txt[end])) end++;
          const newRange = document.createRange();
          newRange.setStart(r.startContainer, start);
          newRange.setEnd(r.startContainer, end);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
      saveSelection();
      setIsLinkPopoverOpen(true);
      return;
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        handleFormat('inlineCode');
        return;
    }
    

    if (event.ctrlKey && event.code === 'Space') {
      event.preventDefault();
      saveSelection();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const anchor = document.createElement('span');
        range.insertNode(anchor);
        setAiPopoverAnchor(anchor);
      } else {
        setAiPopoverAnchor(editorRef.current);
      }
      setIsAiPopoverOpen(true);
      return;
    }

    if (event.ctrlKey && !event.altKey) {
      const key = event.key.toLowerCase();
      if (['b', 'i', 'u', 'g'].includes(key)) {
        event.preventDefault();
        editorRef.current?.focus();
        document.execCommand(key === 'b' || key === 'g' ? 'bold' : key === 'i' ? 'italic' : 'underline');
        setTimeout(updateToolbarState, 0);
        return;
      }
      if (['z', 'y'].includes(key)) {
        event.preventDefault();
        editorRef.current?.focus();
        document.execCommand(key === 'z' ? 'undo' : 'redo');
        setTimeout(updateToolbarState, 0);
        return;
      }
    }


    if (event.ctrlKey && event.shiftKey) {
      const keyNumber = parseInt(event.key, 10);
      if (keyNumber >= 0 && keyNumber <= 6) {
        event.preventDefault();
        restoreSelection();
        if (keyNumber === 0) {
            handleFormat('formatBlock', 'p');
        } else {
            handleFormat('formatBlock', `h${keyNumber}`);
        }
        setTimeout(updateToolbarState, 0);
        return;
      }
    }

    if (event.key === 'Tab') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.getRangeAt(0).startContainer;
        const li = (node.nodeType === Node.TEXT_NODE ? node.parentElement?.closest('li') : (node as HTMLElement).closest?.('li'));
        if (li) {
          event.preventDefault();
          if (!event.shiftKey) document.execCommand('indent');
          else document.execCommand('outdent');
          setTimeout(updateToolbarState, 0);
          return;
        }
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    e.preventDefault();
    saveSelection();
    
    const sel = window.getSelection();
    const isTextSelected = !!sel && !sel.isCollapsed;

    const menuWidth = 200;
    const menuHeight = 250;
    let posX = e.clientX;
    let posY = e.clientY;

    if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 10;
    if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 10;
    
    setContextMenu({ x: posX, y: posY, visible: true, isTextSelected });
  };

  const handleApplyLink = () => {
    restoreSelection();
    editorRef.current?.focus();
    setTimeout(() => {
      if (linkUrl) {
        const linkHtml = `<a href="${linkUrl}">${window.getSelection()?.toString() || linkUrl}</a>`;
        document.execCommand("insertHTML", false, linkHtml);
      }
      setLinkUrl("");
      setIsLinkPopoverOpen(false);
      updateToolbarState();
    }, 10);
  };

  const handleInsertTable = () => {
    editorRef.current?.focus();
    restoreSelection();
    setTimeout(() => {
      if (tableGridSize.rows > 0 && tableGridSize.cols > 0) {
        let tableHtml = '<table style="border-collapse: collapse; width: 100%;">';
        for (let i = 0; i < tableGridSize.rows; i++) {
          tableHtml += '<tr style="border: 1px solid #ccc;">';
          for (let j = 0; j < tableGridSize.cols; j++) {
            tableHtml += '<td style="border: 1px solid #ccc; padding: 8px;"><p>&#8203;</p></td>';
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</table><p>&#8203;</p>';
        document.execCommand("insertHTML", false, tableHtml);
      }
      setIsTablePopoverOpen(false);
      setTableGridSize({ rows: 0, cols: 0 });
    }, 10);
  };

  const handleSaveContent = async () => {
    if (!editorRef.current) return;
    setIsSaving(true);
    const currentContent = editorRef.current.innerHTML;
    const result = await updatePageContent({ pageId: page.id, content: currentContent });
    if (result.success) {
      toast({
        title: "Saved",
        description: "Your changes have been saved.",
      });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleRefineNotes = async () => {
    const currentNotes = editorRef.current?.innerText || "";
    if (!currentNotes) {
      toast({
        title: "Error",
        description: "There is no content to refine.",
        variant: "destructive",
      });
      return;
    }
    setIsRefining(true);
    try {
      const result = await refineAndStructureNotes({ rawNotes: currentNotes });
      setRefinedNotes(result.refinedNotes);
    } catch (error) {
      console.error("Error refining notes:", error);
      toast({
        title: "Error",
        description: "Failed to refine notes.",
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateDiagram = async () => {
    if (!diagramText) {
      toast({
        title: "Error",
        description: "Please enter text to generate a diagram.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateDiagram({
        text: diagramText,
        format: diagramFormat,
      });
      setGeneratedDiagram(result.diagram);
    } catch (error) {
      console.error("Error generating diagram:", error);
      toast({
        title: "Error",
        description: "Failed to generate diagram.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleInsertChecklist = () => {
    restoreSelection();
    editorRef.current?.focus();
    setTimeout(() => {
      const html = `<ul data-type="checklist"><li><label contenteditable="false" class="check-label"><input type="checkbox" /><span contenteditable="true">&#8203;To-do item</span></label></li></ul><p>&#8203;</p>`;
      document.execCommand("insertHTML", false, html);
      setTimeout(updateToolbarState, 0);
    }, 0);
  };

  const handleInsertHtml = () => {
      restoreSelection();
      editorRef.current?.focus();
      setTimeout(() => {
          document.execCommand('insertHTML', false, htmlToInsert);
          setHtmlToInsert("");
      }, 0);
  }

  const handleEditorClick = (e: React.MouseEvent) => {
    if (inlineCorrection) {
      setInlineCorrection(null);
    }

    const editor = editorRef.current;
    if (!editor) return;
    const target = e.target as HTMLElement;
    if (!target) return;

    if (e.ctrlKey && target.tagName === 'A') {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href) {
            window.open(href, '_blank', 'noopener,noreferrer');
        }
    }
    
     if (target.classList.contains('code-expander')) {
        const pre = target.closest('pre');
        if (pre) {
            pre.classList.toggle('collapsed');
            target.textContent = pre.classList.contains('collapsed') ? 'Voir plus...' : 'Voir moins...';
        }
    }


    if (e.target === editor) {
      const last = editor.lastElementChild;
      if (!last || !['P', 'DIV', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(last.tagName)) {
        const p = document.createElement('p'); p.innerHTML = '&#8203;';
        editor.appendChild(p);
        const rng = document.createRange();
        rng.setStart(p, 0); rng.collapse(true);
        const s = window.getSelection();
        s?.removeAllRanges(); s?.addRange(rng);
      } else {
        if ((last.textContent || '').length === 0) last.innerHTML = '&#8203;';
      }
      updateToolbarState();
      return;
    }

    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      e.stopPropagation();
      const label = target.closest('label');
      if (label) {
        const span = label.querySelector('[contenteditable="true"]') as HTMLElement | null;
        if (span) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(span);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
      setTimeout(updateToolbarState, 0);
      return;
    }
    if (target.closest('td')) {
        const p = target.closest('td')?.querySelector('p');
        if (p) {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(p);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }

    if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
  };

  const handleFocus = () => {
    updateToolbarState();
  };

  const handleBlur = (e: React.FocusEvent) => {
    // We only save selection if the focus is leaving the editor but staying within the app
    // to avoid issues with browser extensions or devtools.
    if (editorRef.current?.contains(e.relatedTarget as Node)) {
        return;
    }
    saveSelection();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    let paste = clipboardData.getData('text/html');
    
    if (paste) {
      // Basic HTML sanitation
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = paste;
      
      // Remove style attributes
      tempDiv.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
      // Remove class attributes
      tempDiv.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
      // Remove other unwanted tags (add more as needed)
      tempDiv.querySelectorAll('span, font').forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        }
      });
      
      paste = tempDiv.innerHTML;

    } else {
      paste = clipboardData.getData('text/plain');
      // If plain text, try to convert from markdown
      if (paste) {
          const converter = new showdown.Converter({
              tables: true,
              strikethrough: true,
              tasklists: true,
              ghCompatibleHeaderId: true,
          });
          paste = converter.makeHtml(paste);
      }
    }
  
    if (paste) {
      restoreSelection();
      editorRef.current?.focus();
      document.execCommand('insertHTML', false, paste);
    }
  };

  // Set initial content
  React.useEffect(() => {
    if (editorRef.current) {
        if (page.content) {
            editorRef.current.innerHTML = page.content;
        } else {
            editorRef.current.innerHTML = "<p>&#8203;</p>";
        }
        
        // Add code expanders to existing long code blocks
        const pres = editorRef.current.querySelectorAll('pre');
        pres.forEach(pre => {
             if (pre.scrollHeight > 100 && !pre.querySelector('.code-expander')) {
                pre.classList.add('collapsed');
                const expander = document.createElement('span');
                expander.className = 'code-expander';
                expander.textContent = 'Voir plus...';
                pre.appendChild(expander);
            }
        });

        updateToc();
        updateActiveTocOnScroll(); // Initial check
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  React.useEffect(() => {
    if (toc.length > 0) {
      setIsTocVisible(true);
    } else {
      setIsTocVisible(false);
    }
  }, [toc]);

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a notebook and page to start your work.</p>
      </div>
    );
  }

  const handleTocClick = (id: string) => {
    const element = editorRef.current?.querySelector(`#${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const getTocItemClass = (level: number) => {
    switch (level) {
        case 1: return 'pl-0';
        case 2: return 'pl-4';
        case 3: return 'pl-8';
        case 4: return 'pl-12';
        case 5: return 'pl-16';
        case 6: return 'pl-20';
        default: return 'pl-0';
    }
  };

  return (
    <div className="flex flex-row h-full bg-background p-1 sm:p-2 lg:p-4 gap-4">
      <Card className="w-full flex-1 flex flex-col overflow-hidden">
        <CardHeader className="p-2 print-hidden sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between p-2 mb-2 border-b rounded-t-md bg-secondary/50 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("undo")}> <Undo className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("redo")}> <Redo className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={handlePrint}> <Printer className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => setIsCommandPaletteOpen(true)}> <Info className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => setIsTocVisible(!isTocVisible)}> <PanelRightOpen className="h-4 w-4" /> </Button>

              <Separator orientation="vertical" className="h-6 mx-1" />
              <Select value={currentBlockStyle} onValueChange={(value) => handleFormat("formatBlock", value)}>
                <SelectTrigger className="w-32" onMouseDown={onToolbarMouseDown}> <SelectValue placeholder="Style" /> </SelectTrigger>
                <SelectContent>
                  <SelectItem value="p"><div className="flex items-center gap-2"><Pilcrow className="h-4 w-4" /> Paragraphe</div></SelectItem>
                  <SelectItem value="h1"><div className="flex items-center gap-2"><Heading1 className="h-4 w-4" /> Titre 1</div></SelectItem>
                  <SelectItem value="h2"><div className="flex items-center gap-2"><Heading2 className="h-4 w-4" /> Titre 2</div></SelectItem>
                  <SelectItem value="h3"><div className="flex items-center gap-2"><Heading3 className="h-4 w-4" /> Titre 3</div></SelectItem>
                  <SelectItem value="h4"><div className="flex items-center gap-2"><Heading4 className="h-4 w-4" /> Titre 4</div></SelectItem>
                  <SelectItem value="h5"><div className="flex items-center gap-2"><Heading5 className="h-4 w-4" /> Titre 5</div></SelectItem>
                  <SelectItem value="h6"><div className="flex items-center gap-2"><Heading6 className="h-4 w-4" /> Titre 6</div></SelectItem>
                </SelectContent>
              </Select>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button variant={activeStyles.bold ? "secondary" : "ghost"} size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("bold")}> <Bold className="h-4 w-4" /> </Button>
              <Button variant={activeStyles.italic ? "secondary" : "ghost"} size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("italic")}> <Italic className="h-4 w-4" /> </Button>
              <Button variant={activeStyles.underline ? "secondary" : "ghost"} size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("underline")}> <Underline className="h-4 w-4" /> </Button>
              <Button variant={activeStyles.strikethrough ? "secondary" : "ghost"} size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("strikeThrough")}> <Strikethrough className="h-4 w-4" /> </Button>
              <Button variant={activeStyles.superscript ? "secondary" : "ghost"} size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("superscript")}> <Superscript className="h-4 w-4" /> </Button>
              <Button variant={activeStyles.subscript ? "secondary" : "ghost"} size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("subscript")}> <Subscript className="h-4 w-4" /> </Button>
              <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown}>
                    <Link className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" onOpenAutoFocus={(e) => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()}>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Insert Link</h4>
                      <p className="text-sm text-muted-foreground">Enter the URL for the link.</p>
                    </div>
                    <Input
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                    <Button onClick={handleApplyLink}>Apply</Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("justifyLeft")}> <AlignLeft className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("justifyCenter")}> <AlignCenter className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("justifyRight")}> <AlignRight className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("justifyFull")}> <AlignJustify className="h-4 w-4" /> </Button>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("insertUnorderedList")}> <List className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("insertOrderedList")}> <ListOrdered className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={handleInsertChecklist}> <ListChecks className="h-4 w-4" /> </Button>
              <Button variant={currentBlockStyle === 'blockquote' ? "secondary" : "ghost"} size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("formatBlock", "blockquote")}> <Quote className="h-4 w-4" /> </Button>
              <Button variant={currentBlockStyle === 'pre' ? "secondary" : "ghost"} size="icon" onMouseDown={onToolbarMouseDown} onClick={() => handleFormat("formatBlock", "pre")}> <Code className="h-4 w-4" /> </Button>
              <Popover open={isTablePopoverOpen} onOpenChange={(isOpen) => { if(!isOpen) setTableGridSize({rows: 0, cols: 0}); setIsTablePopoverOpen(isOpen)}}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown}><Table className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="flex flex-col gap-1">
                    {Array.from({ length: 8 }).map((_, rowIndex) => (
                      <div key={rowIndex} className="flex gap-1">
                        {Array.from({ length: 10 }).map((_, colIndex) => (
                          <div
                            key={colIndex}
                            className={cn("h-4 w-4 border border-muted-foreground/50 rounded-sm cursor-pointer",
                              rowIndex < tableGridSize.rows && colIndex < tableGridSize.cols ? "bg-primary/50" : "hover:bg-primary/20"
                            )}
                            onMouseEnter={() => setTableGridSize({ rows: rowIndex + 1, cols: colIndex + 1 })}
                            onClick={handleInsertTable}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-sm mt-2">{tableGridSize.rows} x {tableGridSize.cols}</div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => document.execCommand('insertHTML', false, '<hr><p>&#8203;</p>')}> <Minus className="h-4 w-4" /> </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown}> <MessageSquarePlus className="h-4 w-4" /> </Button>
                </DialogTrigger>
                 <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Insert HTML</DialogTitle>
                      <DialogDescription>
                        Paste your HTML code below. It will be inserted at your cursor position.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea 
                        placeholder="<p>Your <b>HTML</b> here</p>"
                        value={htmlToInsert}
                        onChange={(e) => setHtmlToInsert(e.target.value)}
                        className="min-h-[200px] font-mono"
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button onClick={handleInsertHtml}>Insert</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
              </Dialog>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <SpeechToText onTranscriptionComplete={(text) => {
                restoreSelection();
                editorRef.current?.focus();
                setTimeout(() => {
                  document.execCommand('insertHTML', false, ` ${text}`);
                }, 10);
              }} />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleRefineNotes}>
                    <Bot className="mr-2 h-4 w-4" />
                    Refine
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle>Refined Note</DialogTitle>
                    <DialogDescription>Your note, enhanced and structured by AI.</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto p-4 border rounded-md">
                    {isRefining ? <p>Refining your notes...</p> : <Textarea className="whitespace-pre-wrap font-body min-h-[30vh]" readOnly value={refinedNotes} />}
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                      if(editorRef.current) {
                        const refinedHtml = refinedNotes.replace(/\\n/g, '<br />');
                        editorRef.current.innerHTML = refinedHtml;
                      }
                    }}>
                      Insert
                    </Button>
                    <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Network className="mr-2 h-4 w-4" />
                    Generate Diagram
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle>Generate Diagram</DialogTitle>
                    <DialogDescription>Create a diagram from text using AI.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="diagram-text">Text</Label>
                      <Textarea id="diagram-text" value={diagramText} onChange={(e) => setDiagramText(e.target.value)} placeholder="Enter text to turn into a diagram..." />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="diagram-format">Format</Label>
                      <Select onValueChange={(value: "markdown" | "latex" | "txt") => setDiagramFormat(value)} defaultValue={diagramFormat}>
                        <SelectTrigger><SelectValue placeholder="Select a format" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="txt">TXT + ASCII</SelectItem>
                          <SelectItem value="markdown">Markdown</SelectItem>
                          <SelectItem value="latex">LaTeX</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleGenerateDiagram} disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate"}</Button>
                    {generatedDiagram && (
                      <div className="max-h-[30vh] overflow-y-auto p-4 border rounded-md">
                        <Label>Generated Diagram</Label>
                        <pre className="whitespace-pre-wrap font-mono text-sm">{generatedDiagram}</pre>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                      restoreSelection();
                      editorRef.current?.focus();
                      setTimeout(() => {
                        const sanitizedDiagram = generatedDiagram.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        document.execCommand('insertHTML', false, `<pre><code>${sanitizedDiagram}</code></pre>`);
                      }, 10);
                    }}>
                      Insert
                    </Button>
                    <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSaveContent} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent ref={scrollContainerRef} className="flex-1 overflow-y-auto p-0 printable-area relative">
          <Popover open={isAiPopoverOpen} onOpenChange={setIsAiPopoverOpen} modal={true}>
            <PopoverTrigger asChild>
              {aiPopoverAnchor && <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }} ref={node => { if(node && aiPopoverAnchor.parentElement) aiPopoverAnchor.parentElement.replaceChild(node, aiPopoverAnchor)}}></div>}
            </PopoverTrigger>
            <PopoverContent className="w-96" onOpenAutoFocus={(e) => e.preventDefault()} align="center">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">AI Assistant</h4>
                  <p className="text-sm text-muted-foreground">
                    What do you want to do with the selected text?
                  </p>
                </div>
                <Textarea placeholder="e.g., Summarize the text above, or write a conclusion..." />
                <Button>Generate</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={!!inlineCorrection} onOpenChange={(isOpen) => !isOpen && setInlineCorrection(null)}>
              <PopoverTrigger asChild>
                  {inlineCorrection?.anchor && <div />}
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-2" 
                align="start"
                side="top"
                sideOffset={4}
                style={{
                    // Position the popover based on the anchor's location
                    position: 'absolute',
                    top: `${inlineCorrection?.anchor.offsetTop ?? 0}px`,
                    left: `${inlineCorrection?.anchor.offsetLeft ?? 0}px`,
                }}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onPointerDownOutside={() => setInlineCorrection(null)}
              >
                <div className="flex items-center gap-2">
                    <p className="text-sm">Correction :</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent h-auto p-1"
                        onClick={applyCorrection}
                    >
                        {inlineCorrection?.suggestion}
                    </Button>
                </div>
              </PopoverContent>
          </Popover>

          <div
            ref={editorRef}
            key={page.id}
            contentEditable
            suppressContentEditableWarning
            spellCheck={true}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleEditorClick}
            onContextMenu={handleContextMenu}
            onPaste={handlePaste}
            className="prose dark:prose-invert max-w-none w-full h-full bg-card p-4 sm:p-6 md:p-8 lg:p-12 focus:outline-none"
            style={{ direction: 'ltr' }}
          />
        </CardContent>
      </Card>
      
      {isTocVisible && (
      <Card className="w-64 h-full hidden lg:flex flex-col print-hidden">
        <CardHeader>
          <h3 className="font-semibold font-headline">Table of Contents</h3>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {toc.length > 0 ? (
            <ul className="space-y-2">
              {toc.map((item) => (
                <li
                  key={item.id}
                  onClick={() => handleTocClick(item.id)}
                  className={cn(
                    "cursor-pointer text-sm hover:text-accent truncate",
                     getTocItemClass(item.level),
                     activeTocId === item.id ? 'text-accent font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {item.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Add headings (e.g., # Title) to create a table of contents.</p>
          )}
        </CardContent>
      </Card>
      )}

      {contextMenu.visible && (
        <div
            role="menu"
            aria-label="Editor context menu"
            style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
            className="z-50 min-w-[180px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            onContextMenu={(e) => e.preventDefault()} // prevent chained context menus
            >
            <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { restoreSelection(); document.execCommand('copy'); setContextMenu({ ...contextMenu, visible: false }); }}
                disabled={!contextMenu.isTextSelected}
            >
                <Copy className="h-4 w-4" /> Copy
            </button>

            <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { restoreSelection(); document.execCommand('cut'); setContextMenu({ ...contextMenu, visible: false }); }}
                disabled={!contextMenu.isTextSelected}
            >
                <Scissors className="h-4 w-4" /> Cut
            </button>

            <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                    // Use execCommand for broader compatibility and to avoid permission issues.
                    // The onPaste handler will clean the content.
                    document.execCommand('paste');
                    setContextMenu({ ...contextMenu, visible: false }); 
                }}
            >
                <ClipboardPaste className="h-4 w-4" /> Paste
            </button>
            
            <Separator className="my-1" />
            
            <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { handleFormat('inlineCode'); setContextMenu({ ...contextMenu, visible: false }); }}
                disabled={!contextMenu.isTextSelected}
            >
                <Code className="h-4 w-4" /> Inline Code
            </button>
            <Separator className="my-1" />

             <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { handleFormat('insertUnorderedList'); setContextMenu({...contextMenu, visible: false});}}
            >
                <List className="h-4 w-4" /> Bullet List
            </button>
             <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { handleFormat('insertOrderedList'); setContextMenu({...contextMenu, visible: false});}}
            >
                <ListOrdered className="h-4 w-4" /> Numbered List
            </button>
             <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { handleInsertChecklist(); setContextMenu({...contextMenu, visible: false});}}
            >
                <ListChecks className="h-4 w-4" /> Checklist
            </button>

            </div>
      )}
      
      <Dialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Command Palette</DialogTitle>
            <DialogDescription>
              A list of available commands and their shortcuts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <h3 className="font-semibold">Text Formatting</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+G</kbd> - Bold</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+I</kbd> - Italic</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+U</kbd> - Underline</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Shift+X</kbd> - Inline Code</li>
            </ul>
            <h3 className="font-semibold">Headings</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Shift+1</kbd> - Heading 1</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Shift+2</kbd> - Heading 2</li>
              <li>...and so on up to 6</li>
            </ul>
            <h3 className="font-semibold">Editing</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Z</kbd> - Undo</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Y</kbd> - Redo</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+K</kbd> - Command Palette</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Space</kbd> - AI Prompt</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Shift+K</kbd> - Insert Link</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+-</kbd> - Horizontal Rule</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
