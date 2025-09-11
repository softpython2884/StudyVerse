

      "use client";

import * as React from "react";
import { createRoot } from "react-dom/client";
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
  Bot,
  Sparkles,
  Lock,
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
import { cn } from "@/lib/utils";
import showdown from 'showdown';
import { generateDiagram } from "@/ai/flows/generate-diagrams-from-text";
import { DiagramRenderer } from "./diagram-renderer";
import { CustomContextMenu } from "./custom-context-menu";
import { generateTextFromPrompt } from "@/ai/flows/generate-text-from-prompt";

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

const diagramTypes = ['MindMap', 'Flowchart', 'OrgChart'];
const diagramComplexities = ['Simple', 'Detailed', 'Exhaustive'];

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

  // --- CONTEXT MENU STATE ---
  const [contextMenu, setContextMenu] = React.useState({
      open: false,
      x: 0,
      y: 0,
      selectedText: '',
      selectedHtml: ''
  });
  
  // --- AI Palette State ---
  const [isAiPaletteOpen, setIsAiPaletteOpen] = React.useState(false);
  const [aiPalettePrompt, setAiPalettePrompt] = React.useState("");
  const [isGeneratingText, setIsGeneratingText] = React.useState(false);


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

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [htmlToInsert, setHtmlToInsert] = React.useState("");
  
  const [diagramState, setDiagramState] = React.useState({
      instruction: "",
      type: "MindMap" as (typeof diagramTypes)[number],
      complexity: "Detailed" as (typeof diagramComplexities)[number],
      isOpen: false,
      editingTarget: null as HTMLElement | null,
  });


  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [isTablePopoverOpen, setIsTablePopoverOpen] = React.useState(false);
  const [tableGridSize, setTableGridSize] = React.useState({ rows: 0, cols: 0 });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  
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
  const isReadOnly = page.permission === 'view';

    const renderDiagramsInEditor = React.useCallback(() => {
    if (!editorRef.current) return;
    const diagramPlaceholders = editorRef.current.querySelectorAll('div[data-diagram-type]');

    diagramPlaceholders.forEach(container => {
      // Prevent re-rendering if a root already exists
      if ((container as any)._reactRoot) return;

      const type = container.getAttribute('data-diagram-type');
      const encodedData = container.getAttribute('data-diagram-data');
      if (!type || !encodedData) return;

      try {
        const dataStr = decodeURIComponent(escape(atob(encodedData)));
        const data = JSON.parse(dataStr);
        const { nodes, edges } = data;
        
        const diagramElement = (
            <DiagramRenderer type={type} initialNodes={nodes} initialEdges={edges || []} />
        );

        const root = createRoot(container);
        // Store the root on the element so we can unmount it later
        (container as any)._reactRoot = root;
        root.render(diagramElement);

      } catch (e) {
        console.error("Failed to parse or render diagram", e);
        container.textContent = "Error rendering diagram.";
      }
    });
  }, []);

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
    if (typeof window === 'undefined' || isReadOnly) return;

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
  }, [isReadOnly]);

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
    if (isReadOnly) return;
    editorRef.current?.focus();
    restoreSelection();

    const simpleCommands = ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript'];
    if (simpleCommands.includes(command) && activeStyles[command]) {
        document.execCommand('removeFormat');
        setTimeout(updateToolbarState, 0);
        return;
    }

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
  
  // KeyUp handles markdown-like transforms (# headings, urls) and updates toolbar
  const handleKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
     if (event.key === ' ' || event.key === 'Enter') {
      
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        updateToolbarState();
        debouncedUpdateToc();
        return;
      }
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
              
              let newElement: HTMLElement | null = null;
              const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
              const sheetMatch = url.match(/https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
              const slidesMatch = url.match(/https?:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/);


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
              } else if (sheetMatch) {
                  const sheetId = sheetMatch[1];
                  const iframe = document.createElement('iframe');
                  iframe.width = '100%';
                  iframe.height = '480';
                  // A more robust embed URL. widget=true&headers=false makes it cleaner
                  iframe.src = `https://docs.google.com/spreadsheets/d/${sheetId}/pubhtml?widget=true&amp;headers=false`;
                  iframe.style.borderRadius = '0.5rem';
                  iframe.style.border = '1px solid hsl(var(--border))';
                  newElement = iframe;
              } else if (slidesMatch) {
                  const slidesId = slidesMatch[1];
                  const iframe = document.createElement('iframe');
                  iframe.width = '560';
                  iframe.height = '315';
                  iframe.src = `https://docs.google.com/presentation/d/${slidesId}/embed?start=false&loop=false&delayms=3000`;
                  iframe.title = "Google Slides presentation";
                  iframe.frameBorder = "0";
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
              
              if(newElement) {
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

const handleGenerateDiagram = async () => {
    if (isReadOnly) return;
    if (!diagramState.instruction) {
        toast({ title: "Error", description: "An instruction is required to generate a diagram.", variant: "destructive" });
        return;
    }
    setIsGenerating(true);
    
    // Get existing diagram data if we are editing
    let existingData: string | undefined;
    if (diagramState.editingTarget) {
        const encoded = diagramState.editingTarget.getAttribute('data-diagram-data');
        if (encoded) {
            existingData = decodeURIComponent(escape(atob(encoded)));
        }
    }
    
    try {
        const result = await generateDiagram({
            instruction: diagramState.instruction,
            diagramType: diagramState.type,
            complexity: diagramState.complexity,
            existingDiagramData: existingData,
        });

        if (result.diagramData) {
            const encodedData = btoa(unescape(encodeURIComponent(result.diagramData)));
            const encodedInstruction = btoa(unescape(encodeURIComponent(diagramState.instruction)));

            if (diagramState.editingTarget) {
                // Update existing diagram
                diagramState.editingTarget.setAttribute('data-diagram-data', encodedData);
                diagramState.editingTarget.setAttribute('data-diagram-instruction', encodedInstruction);
                // Unmount and re-render the React component inside the div
                const root = (diagramState.editingTarget as any)._reactRoot;
                if (root) {
                    root.unmount();
                    (diagramState.editingTarget as any)._reactRoot = null;
                }
                setTimeout(() => renderDiagramsInEditor(), 0);
                 toast({ title: "Success", description: result.response });
            } else {
                // Insert new diagram as a styled link
                const diagramTitle = `${diagramState.type}: ${diagramState.instruction.substring(0, 30)}...`;
                const diagramId = `diagram-embed-${Date.now()}`;
                
                const diagramEmbedHtml = `
                    <a href="#${diagramId}" class="diagram-embed" contenteditable="false">
                        <span class="diagram-embed-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-network"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg></span>
                        <span class="diagram-embed-text">
                            <span class="diagram-embed-title">${diagramTitle}</span>
                            <span class="diagram-embed-link">Click to view diagram</span>
                        </span>
                    </a>
                    <div id="${diagramId}" data-diagram-type="${diagramState.type}" data-diagram-data="${encodedData}" data-diagram-instruction="${encodedInstruction}" contenteditable="false" class="bg-card p-2 rounded-md my-4 min-h-[400px]"></div>
                    <p>&#8203;</p>
                `;

                restoreSelection();
                editorRef.current?.focus();
                document.execCommand('insertHTML', false, diagramEmbedHtml);
                setTimeout(() => renderDiagramsInEditor(), 0);
                toast({ title: "Success", description: result.response });
            }
        } else {
            throw new Error("The AI did not return any diagram data.");
        }
    } catch (e: any) {
        console.error("Failed to generate and embed diagram", e);
        toast({ title: "Error", description: `Failed to create diagram: ${e.message}`, variant: "destructive" });
    } finally {
        setIsGenerating(false);
        setDiagramState({ ...diagramState, isOpen: false, instruction: "", editingTarget: null });
    }
};

  const handleGenerateText = async () => {
    if (isReadOnly) return;
    if (!aiPalettePrompt) {
        toast({ title: "Error", description: "A prompt is required.", variant: "destructive" });
        return;
    }
    
    setIsGeneratingText(true);
    restoreSelection();
    
    const selection = window.getSelection();
    let selectedHtml = '';

    if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
        const range = selection.getRangeAt(0);
        const container = document.createElement("div");
        container.appendChild(range.cloneContents());
        selectedHtml = container.innerHTML;
    }

    try {
      const result = await generateTextFromPrompt({
        prompt: aiPalettePrompt,
        selection: selectedHtml || undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.response) {
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, result.response);
        toast({ title: "Success", description: "Text has been updated." });
      } else {
        throw new Error("The AI did not return a response.");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsGeneratingText(false);
      setIsAiPaletteOpen(false);
      setAiPalettePrompt("");
    }
  };


  // KeyDown handles shortcuts + Enter special behavior + checklist/tab navigation + headings via Ctrl+Shift+N
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isReadOnly) {
        event.preventDefault();
        return;
    }
    
     if ((event.ctrlKey || event.metaKey) && event.key === ' ') {
      event.preventDefault();
      saveSelection();
      setIsAiPaletteOpen(true);
      return;
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
    
    if ((event.ctrlKey || event.metaKey) && event.key === '-') {
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

    if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !event.shiftKey) {
      event.preventDefault();
      setIsCommandPaletteOpen(true);
      return;
    }
    
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'k') {
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

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        handleFormat('inlineCode');
        return;
    }
    
    // NOTE FOR AI: The shortcut for bold is Ctrl+G, do not change it.
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'g') { 
        event.preventDefault();
        editorRef.current?.focus();
        document.execCommand('bold');
        setTimeout(updateToolbarState, 0);
        return;
      }
      if (['i', 'u'].includes(key)) {
        event.preventDefault();
        editorRef.current?.focus();
        document.execCommand(key === 'i' ? 'italic' : 'underline');
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


    if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
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

  const handleApplyLink = () => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
    editorRef.current?.focus();
    restoreSelection();
    setTimeout(() => {
      if (tableGridSize.rows > 0 && tableGridSize.cols > 0) {
        let tableHtml = '<table style="border-collapse: collapse; width: 100%;"><tbody>';
        for (let i = 0; i < tableGridSize.rows; i++) {
          tableHtml += '<tr>';
          for (let j = 0; j < tableGridSize.cols; j++) {
            tableHtml += '<td><p>&#8203;</p></td>';
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table><p>&#8203;</p>';
        document.execCommand("insertHTML", false, tableHtml);
      }
      setIsTablePopoverOpen(false);
      setTableGridSize({ rows: 0, cols: 0 });
    }, 10);
  };

  const handleSaveContent = async () => {
    if (isReadOnly || !editorRef.current) return;
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

  const handlePrint = () => {
    window.print();
  };

  const handleInsertChecklist = () => {
    if (isReadOnly) return;
    restoreSelection();
    editorRef.current?.focus();
    setTimeout(() => {
      const html = `<ul data-type="checklist"><li><label contenteditable="false" class="check-label"><input type="checkbox" /><span contenteditable="true">&#8203;To-do item</span></label></li></ul><p>&#8203;</p>`;
      document.execCommand("insertHTML", false, html);
      setTimeout(updateToolbarState, 0);
    }, 0);
  };

  const handleInsertHtml = () => {
      if (isReadOnly) return;
      restoreSelection();
      editorRef.current?.focus();
      setTimeout(() => {
          document.execCommand('insertHTML', false, htmlToInsert);
          setHtmlToInsert("");
      }, 0);
  }

  const handleEditorClick = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    const editor = editorRef.current;
    if (!editor) return;
    const target = e.target as HTMLElement;
    if (!target) return;

    // Handle Ctrl+Click on any link, including diagram embeds
    if ((e.ctrlKey || e.metaKey) && target.closest('a')) {
        e.preventDefault();
        const link = target.closest('a');
        const href = link?.getAttribute('href');
        if (href) {
            window.open(href, '_blank', 'noopener,noreferrer');
        }
        return;
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
        const td = target.closest('td')!;
        const p = td.querySelector('p');
        const sel = window.getSelection();
        const range = document.createRange();
        
        // If there's a p tag, focus on it. Otherwise, focus the td itself.
        const focusTarget = p || td;
        range.selectNodeContents(focusTarget);
        range.collapse(false); // Move cursor to the end
        sel?.removeAllRanges();
        sel?.addRange(range);
    }
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
    if (isReadOnly) {
        event.preventDefault();
        return;
    }
    event.preventDefault();
    const clipboardData = event.clipboardData;
    let paste = clipboardData.getData('text/html');
    
    if (paste) {
      // Basic HTML sanitation
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = paste;
      
      // Remove style attributes
      tempDiv.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
      // Remove class attributes, except for diagram embeds
      tempDiv.querySelectorAll('[class]').forEach(el => {
          if (!el.classList.contains('diagram-embed')) {
            el.removeAttribute('class');
          }
      });
      // Remove other unwanted tags (add more as needed)
      tempDiv.querySelectorAll('span:not([class^="diagram-embed-"]), font').forEach(el => {
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

  // Set initial content and render diagrams
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
             if (pre.scrollHeight > 100 && !pre.nextElementSibling?.classList.contains('code-expander')) {
                pre.classList.add('collapsed');
                const expander = document.createElement('span');
                expander.className = 'code-expander';
                expander.textContent = 'Voir plus...';
                if (pre.parentNode) {
                    pre.parentNode.insertBefore(expander, pre.nextSibling);
                }
            }
        });
        renderDiagramsInEditor();
        updateToc();
        updateActiveTocOnScroll(); // Initial check
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, renderDiagramsInEditor]);

  React.useEffect(() => {
    if (toc.length > 0) {
      setIsTocVisible(true);
    } else {
      setIsTocVisible(false);
    }
  }, [toc]);

  const handleReplaceText = (newText: string, isHtml: boolean = false) => {
    if (isReadOnly) return;
    restoreSelection();
    editorRef.current?.focus();
    setTimeout(() => {
        if (isHtml) {
             document.execCommand('insertHTML', false, newText);
        } else {
            document.execCommand('insertText', false, newText);
        }
    }, 0);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      if (isReadOnly) return;

      const target = e.target as HTMLElement;
      const diagramContainer = target.closest('div[data-diagram-type]');

      if (diagramContainer) {
          const type = diagramContainer.getAttribute('data-diagram-type') as any;
          const instruction = diagramContainer.getAttribute('data-diagram-instruction') || '';
          const decodedInstruction = instruction ? decodeURIComponent(escape(atob(instruction))) : '';
          
          setDiagramState({
              isOpen: true,
              type: type || 'MindMap',
              instruction: decodedInstruction,
              complexity: 'Detailed', // Default to detailed when editing
              editingTarget: diagramContainer as HTMLElement,
          });
      } else {
          saveSelection();
          const selection = window.getSelection();
          let html = '';
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            html = container.innerHTML;
          }
          setContextMenu({
              open: true,
              x: e.clientX,
              y: e.clientY,
              selectedText: selection?.toString().trim() || '',
              selectedHtml: html,
          });
      }
  };

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
    <div className="flex h-full w-full bg-background p-1 sm:p-2 lg:p-4 gap-4">
        <CustomContextMenu
            {...contextMenu}
            onOpenChange={(open) => setContextMenu({ ...contextMenu, open })}
            onReplaceText={handleReplaceText}
        />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="p-2 print-hidden sticky top-0 bg-background z-10 border-b mb-2 rounded-t-md">
          <div className="flex items-center justify-between flex-wrap">
            <div className={cn("flex items-center gap-1 flex-wrap", isReadOnly && "opacity-50 pointer-events-none")}>
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
                  <div className="text-center mb-1 text-xs">{tableGridSize.rows > 0 ? `${tableGridSize.rows} x ${tableGridSize.cols}` : 'Insert Table'}</div>
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
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => document.execCommand('insertHTML', false, '<hr><p>&#8203;</p>')}> <Minus className="h-4 w-4" /> </Button>
              <Button variant="ghost" size="icon" onMouseDown={onToolbarMouseDown} onClick={() => setDiagramState({...diagramState, isOpen: true, editingTarget: null, instruction: ''})}>
                <Network className="h-4 w-4" />
              </Button>
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
            </div>
            <div className="flex items-center gap-2">
                {isReadOnly && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
                        <Lock className="h-4 w-4" />
                        <span>View Only</span>
                    </div>
                )}
              <Button variant="ghost" size="sm" onClick={handleSaveContent} disabled={isSaving || isReadOnly}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto printable-area bg-card rounded-b-md">
          <div
            ref={editorRef}
            key={page.id}
            contentEditable={!isReadOnly}
            suppressContentEditableWarning
            spellCheck={true}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleEditorClick}
            onPaste={handlePaste}
            onContextMenu={handleContextMenu}
            className="prose dark:prose-invert max-w-none w-full h-full p-4 sm:p-6 md:p-8 lg:p-12 focus:outline-none"
            style={{ direction: 'ltr' }}
          />
        </div>
      </div>
      
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

      <Dialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Command Palette</DialogTitle>
            <DialogDescription>
              A list of available commands and their shortcuts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">Text Formatting</h3>
            <ul className="list-disc list-inside text-muted-foreground">
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+G</kbd> - Bold</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+I</kbd> - Italic</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+U</kbd> - Underline</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Shift+X</kbd> - Inline Code</li>
            </ul>
            <h3 className="font-semibold">Headings</h3>
            <ul className="list-disc list-inside text-muted-foreground">
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Shift+1</kbd> - Heading 1 (and so on up to 6)</li>
            </ul>
             <h3 className="font-semibold">AI Tools</h3>
            <ul className="list-disc list-inside text-muted-foreground">
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Space</kbd> - Ask AI to write...</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Shift+C</kbd> - Spell check selection</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+;</kbd> - Get a brief answer for selection</li>
            </ul>
            <h3 className="font-semibold">Editing</h3>
            <ul className="list-disc list-inside text-muted-foreground">
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Z</kbd> - Undo</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Y</kbd> - Redo</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+Shift+K</kbd> - Insert Link</li>
              <li><kbd className="p-1 bg-muted rounded-md">Ctrl+-</kbd> - Horizontal Rule</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAiPaletteOpen} onOpenChange={setIsAiPaletteOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>Ask AI</DialogTitle>
                  <DialogDescription>Enter an instruction to generate or modify text.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="grid gap-2">
                      <Label htmlFor="ai-prompt">Your Instruction</Label>
                      <Textarea id="ai-prompt" value={aiPalettePrompt} onChange={(e) => setAiPalettePrompt(e.target.value)} placeholder="e.g., Summarize the selected text..." />
                  </div>
              </div>
              <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setIsAiPaletteOpen(false)}>Close</Button>
                  <Button onClick={handleGenerateText} disabled={isGeneratingText}>
                      {isGeneratingText ? <Sparkles className="animate-spin" /> : "Generate"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>


      <Dialog open={diagramState.isOpen} onOpenChange={(isOpen) => setDiagramState({ ...diagramState, isOpen })}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>{diagramState.editingTarget ? "Edit Diagram" : "Insert New Diagram"}</DialogTitle>
                  <DialogDescription>Describe the diagram you want the AI to create or modify.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="grid gap-2">
                      <Label htmlFor="diagram-instruction">Instruction</Label>
                      <Textarea id="diagram-instruction" value={diagramState.instruction} onChange={(e) => setDiagramState({...diagramState, instruction: e.target.value})} placeholder="e.g., Create a mind map about the solar system..." />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="diagram-type">Diagram Type</Label>
                      <Select onValueChange={(value: (typeof diagramTypes)[number]) => setDiagramState({...diagramState, type: value})} value={diagramState.type}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                          {diagramTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                  </div>
                   <div className="grid gap-2">
                        <Label htmlFor="diagram-complexity">Complexity</Label>
                        <Select onValueChange={(value: (typeof diagramComplexities)[number]) => setDiagramState({...diagramState, complexity: value})} value={diagramState.complexity}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                            {diagramComplexities.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Exhaustive diagrams may take longer to generate.</p>
                    </div>
              </div>
              <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setDiagramState({...diagramState, isOpen: false, instruction: '', editingTarget: null})}>Close</Button>
                  <Button onClick={handleGenerateDiagram} disabled={isGenerating}>
                      {isGenerating ? <Bot className="animate-spin" /> : diagramState.editingTarget ? "Update Diagram" : "Generate & Insert"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
