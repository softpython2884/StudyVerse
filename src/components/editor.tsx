
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
  Minus
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { refineAndStructureNotes } from "@/ai/flows/refine-and-structure-notes";
import { generateDiagram } from "@/ai/flows/generate-diagrams-from-text";
import { cn } from "@/lib/utils";

interface EditorProps {
  page: Page;
}

export function Editor({ page }: EditorProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [currentBlockStyle, setCurrentBlockStyle] = React.useState("p");
  const savedSelection = React.useRef<Range | null>(null);

  const [refinedNotes, setRefinedNotes] = React.useState("");
  const [diagramText, setDiagramText] = React.useState("");
  const [diagramFormat, setDiagramFormat] = React.useState<"markdown" | "latex" | "txt">("txt");
  const [generatedDiagram, setGeneratedDiagram] = React.useState("");
  const [isRefining, setIsRefining] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [isTablePopoverOpen, setIsTablePopoverOpen] = React.useState(false);
  const [tableGridSize, setTableGridSize] = React.useState({ rows: 0, cols: 0 });

  const { toast } = useToast();

  React.useEffect(() => {
    if (editorRef.current) {
        editorRef.current.innerHTML = page.content || "<p>&#8203;</p>";
    }
    document.execCommand("defaultParagraphSeparator", false, "p");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  const saveSelection = () => {
    if (typeof window !== 'undefined') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          savedSelection.current = range;
        }
      }
    }
  };

  const restoreSelection = () => {
    if (!savedSelection.current || typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
    }
  };
  
  const handleFocusAndRestoreSelection = () => {
    editorRef.current?.focus();
    setTimeout(() => {
      restoreSelection();
    }, 0);
  };

  const updateToolbarState = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    saveSelection();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && document.activeElement === editorRef.current) {
      let node = selection.getRangeAt(0).startContainer;
      
      if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
        node = node.parentNode;
      }
      
      if (node && node instanceof HTMLElement) {
         const blockElement = node.closest('p, h1, h2, h3, h4, h5, h6, pre, blockquote');
         if (blockElement) {
             setCurrentBlockStyle(blockElement.tagName.toLowerCase());
         } else {
             const listParent = node.closest('li');
             if (listParent) {
                 setCurrentBlockStyle('p'); 
             }
         }
      }
    }
  }, []);

  const handleFormat = (command: string, value?: string) => {
    handleFocusAndRestoreSelection();
    setTimeout(() => {
        if (value && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre'].includes(value)) {
            if (document.queryCommandValue('formatBlock') === value) {
                document.execCommand('formatBlock', false, 'p');
            } else {
                document.execCommand('formatBlock', false, value);
            }
        } else {
             document.execCommand(command, false, value);
        }
        updateToolbarState();
    }, 10);
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey) {
        let command: string | null = null;
        let blockCommand: string | null = null;

        switch (event.key) {
            case 'g': command = 'bold'; break;
            case 'i': command = 'italic'; break;
            case 'u': command = 'underline'; break;
            case '&': blockCommand = 'h1'; break;
            case 'é': blockCommand = 'h2'; break;
            case '"': blockCommand = 'h3'; break;
            case "'": blockCommand = 'h4'; break;
            case '(': blockCommand = 'h5'; break;
            case '-': blockCommand = 'h6'; break;
        }

        if (command) {
            event.preventDefault();
            handleFormat(command);
        } else if (blockCommand) {
            event.preventDefault();
            handleFormat('formatBlock', blockCommand);
        }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                let node = range.startContainer;
                let parentElement = node.nodeType === 3 ? node.parentElement : node as HTMLElement;
    
                const blockElement = parentElement?.closest('pre, h1, h2, h3, h4, h5, h6, blockquote, li');
                
                if (blockElement && parentElement?.textContent?.trim() === '') {
                     if (blockElement.tagName !== 'LI') {
                        event.preventDefault();
                        document.execCommand('formatBlock', false, 'p');
                        updateToolbarState();
                     }
                }
            }
        }, 0);
    }
  };

  const handleApplyLink = () => {
    handleFocusAndRestoreSelection();
    if (linkUrl) {
      setTimeout(() => document.execCommand("createLink", false, linkUrl), 10);
    }
    setLinkUrl("");
    setIsLinkPopoverOpen(false);
  };
  
  const handleInsertTable = (rows: number, cols: number) => {
    handleFocusAndRestoreSelection();
    setTimeout(() => {
      let tableHtml = '<table style="border-collapse: collapse; width: 100%;">';
      for (let i = 0; i < rows; i++) {
        tableHtml += '<tr style="border: 1px solid #ccc;">';
        for (let j = 0; j < cols; j++) {
          tableHtml += '<td style="border: 1px solid #ccc; padding: 8px;"><p>&#8203;</p></td>';
        }
        tableHtml += '</tr>';
      }
      tableHtml += '</table><p>&#8203;</p>';
      document.execCommand("insertHTML", false, tableHtml);
    }, 10);
    setIsTablePopoverOpen(false);
    setTableGridSize({ rows: 0, cols: 0 });
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
     handleFocusAndRestoreSelection();
     setTimeout(() => document.execCommand("insertHTML", false, `<ul data-type="checklist"><li><input type="checkbox"><label contenteditable="true">To-do item</label></li></ul><p>&#8203;</p>`), 10)
  };

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a notebook and page to start your work.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background p-1 sm:p-2 lg:p-4">
      <Card className="w-full flex-1 flex flex-col overflow-hidden">
          <CardHeader className="p-2 print-hidden">
              <div className="flex items-center justify-between p-2 mb-2 border-b rounded-t-md bg-secondary/50 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("undo")}> <Undo className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("redo")}> <Redo className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={handlePrint}> <Printer className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Select value={currentBlockStyle} onValueChange={(value) => handleFormat("formatBlock", value)}>
                    <SelectTrigger className="w-32" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}> <SelectValue placeholder="Style" /> </SelectTrigger>
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
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("bold")}> <Bold className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("italic")}> <Italic className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("underline")}> <Underline className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("strikeThrough")}> <Strikethrough className="h-4 w-4" /> </Button>
                  <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" onMouseDown={(e) => {e.preventDefault(); saveSelection();}}>
                              <Link className="h-4 w-4" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                   <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("justifyLeft")}> <AlignLeft className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("justifyCenter")}> <AlignCenter className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("justifyRight")}> <AlignRight className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("justifyFull")}> <AlignJustify className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("insertUnorderedList")}> <List className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("insertOrderedList")}> <ListOrdered className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={handleInsertChecklist}> <ListChecks className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("formatBlock", "blockquote")}> <Quote className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("formatBlock", "pre")}> <Code className="h-4 w-4" /> </Button>
                  <Popover open={isTablePopoverOpen} onOpenChange={(isOpen) => { if(!isOpen) setTableGridSize({rows: 0, cols: 0}); setIsTablePopoverOpen(isOpen)}}>
                      <PopoverTrigger asChild>
                           <Button variant="ghost" size="icon" onMouseDown={(e) => {e.preventDefault(); saveSelection();}}><Table className="h-4 w-4" /></Button>
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
                                              onClick={() => handleInsertTable(tableGridSize.rows, tableGridSize.cols)}
                                          />
                                      ))}
                                  </div>
                              ))}
                          </div>
                          <div className="text-center text-sm mt-2">{tableGridSize.rows} x {tableGridSize.cols}</div>
                      </PopoverContent>
                  </Popover>
                   <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("insertHorizontalRule")}> <Minus className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <SpeechToText onTranscriptionComplete={(text) => {
                    handleFocusAndRestoreSelection();
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
                                handleFocusAndRestoreSelection();
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
          <CardContent className="flex-1 overflow-y-auto p-0 printable-area">
              <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyDown={handleKeyDown}
                  onKeyUp={updateToolbarState}
                  onMouseUp={updateToolbarState}
                  onBlur={saveSelection}
                  className="prose dark:prose-invert max-w-none w-full h-full bg-card p-4 sm:p-6 md:p-8 lg:p-12 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ direction: 'ltr' }}
              />
          </CardContent>
        </Card>
    </div>
  );
}
