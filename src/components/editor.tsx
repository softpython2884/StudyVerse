
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

  const { toast } = useToast();

  React.useEffect(() => {
    if (editorRef.current) {
        editorRef.current.innerHTML = page.content || "<p>&#8203;</p>";
    }
  }, [page]);
  
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (!savedSelection.current || !editorRef.current) return;
    
    // Check if the editor is focused, if not, focus it.
    if (document.activeElement !== editorRef.current) {
        editorRef.current.focus({ preventScroll: true });
    }

    const selection = window.getSelection();
    // A timeout is sometimes needed to allow the browser to settle down.
    setTimeout(() => {
        if (selection && savedSelection.current) {
            selection.removeAllRanges();
            selection.addRange(savedSelection.current);
        }
    }, 0);
  };


  const handleFormat = (command: string, value?: string) => {
    restoreSelection();
    if (document.queryCommandSupported(command)) {
      document.execCommand(command, false, value);
    }
    editorRef.current?.focus();
    updateToolbarState();
  };

  const updateToolbarState = () => {
    saveSelection();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node = selection.getRangeAt(0).startContainer;
      
      // Traverse up to find the element node if the start is a text node
      if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
        node = node.parentNode;
      }
      
      if (node && node instanceof HTMLElement) {
         const blockElement = node.closest('p, h1, h2, h3, h4, h5, h6, pre, blockquote');
         if (blockElement) {
             setCurrentBlockStyle(blockElement.tagName.toLowerCase());
         } else {
             // Fallback for elements inside other tags like <li>
             const listParent = node.closest('li');
             if (listParent) {
                 setCurrentBlockStyle('p'); // Treat list items as paragraphs for simplicity
             }
         }
      }
    }
  };

  const handleMarkdown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== ' ') return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    // We only care about text nodes
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return;

    const text = node.textContent;
    const caretPos = range.startOffset;

    // The text before the space
    const textBeforeCaret = text.substring(0, caretPos);
    
    const patterns = [
        { regex: /^(#{1,6})$/, command: "formatBlock" },
        { regex: /^\>$/, command: "formatBlock", value: "blockquote" },
        { regex: /^(\*|\-)$/, command: "insertUnorderedList" },
        { regex: /^1\.$/, command: "insertOrderedList" },
        { regex: /\*\*([^\*]+)\*\*$/, replacement: "<b>$1</b>" },
        { regex: /__([^_]+)__$/, replacement: "<b>$1</b>" },
        { regex: /\*([^\*]+)\*$/, replacement: "<i>$1</i>" },
        { regex: /_([^_]+)_$/, replacement: "<i>$1</i>" },
        { regex: /`([^`]+)`$/, replacement: "<code>$1</code>" },
        { regex: /~~([^~]+)~~$/, replacement: "<s>$1</s>" },
    ];
    
    const wordBeforeCaret = textBeforeCaret.split(/\s+/).pop() || "";

    // Heading and list patterns
    const blockPattern = patterns.find(p => p.regex.test(wordBeforeCaret) && p.command);
    if(blockPattern) {
        event.preventDefault();
        const match = wordBeforeCaret.match(blockPattern.regex);
        if(match) {
            node.textContent = text.substring(caretPos); // remove markdown from text
             range.setStart(node, 0);
             range.collapse(true);
             selection.removeAllRanges();
             selection.addRange(range);

            if (blockPattern.command === 'formatBlock' && !blockPattern.value) {
                document.execCommand(blockPattern.command, false, `h${match[1].length}`);
            } else {
                 document.execCommand(blockPattern.command, false, blockPattern.value);
            }
            return;
        }
    }

    // Inline patterns
    for (const pattern of patterns) {
        if (!pattern.replacement) continue;
        const regex = new RegExp(pattern.regex.source); // We need a new RegExp object to avoid state issues
        const match = wordBeforeCaret.match(regex);
        
        if (match) {
            event.preventDefault();
            
            const replacementHtml = pattern.replacement.replace("$1", match[1]);
            const newText = textBeforeCaret.replace(regex, "");

            // This is a simplified replacement. A robust solution is much more complex.
            // It doesn't handle all edge cases but works for simple cases.
            const parent = node.parentNode;
            if (parent) {
                const newHtml = parent.innerHTML.replace(wordBeforeCaret, replacementHtml + "&nbsp;");
                parent.innerHTML = newHtml;

                // Move cursor to the end
                const newRange = document.createRange();
                const sel = window.getSelection();
                // Find the last text node in the parent
                const lastTextNode = Array.from(parent.childNodes).reverse().find(n => n.nodeType === Node.TEXT_NODE) || parent;
                newRange.setStart(lastTextNode, lastTextNode.textContent?.length || 0);
                newRange.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(newRange);
            }
            return;
        }
    }
  };


  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    handleMarkdown(event);

    if (event.key === 'Enter' && !event.shiftKey) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const node = range.startContainer;
            const parentElement = node.nodeType === 3 ? node.parentElement : node as HTMLElement;

            const blockElement = parentElement?.closest('pre, h1, h2, h3, h4, h5, h6, blockquote');
            if (blockElement) {
                event.preventDefault();
                const newParagraph = document.createElement('p');
                newParagraph.innerHTML = '&#8203;'; // Zero-width space to ensure the element is focusable
                blockElement.insertAdjacentElement('afterend', newParagraph);
                
                const newRange = document.createRange();
                newRange.setStart(newParagraph, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
    }
  };

  const handleInsertLink = () => {
    const url = prompt("Enter the URL:");
    if (url) {
      handleFormat("createLink", url);
    }
  };

  const handleInsertChecklist = () => {
    handleFormat("insertHTML", `<ul data-type="checklist"><li><input type="checkbox"><label>To-do item</label></li></ul>`);
  };
  
  const handleInsertTable = () => {
    const rows = parseInt(prompt("Enter number of rows:") || "2", 10);
    const cols = parseInt(prompt("Enter number of columns:") || "2", 10);

    if (rows > 0 && cols > 0) {
      let tableHtml = '<table style="border-collapse: collapse; width: 100%;">';
      for (let i = 0; i < rows; i++) {
        tableHtml += '<tr style="border: 1px solid #ccc;">';
        for (let j = 0; j < cols; j++) {
          tableHtml += '<td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>';
        }
        tableHtml += '</tr>';
      }
      tableHtml += '</table><p>&#8203;</p>';
      handleFormat("insertHTML", tableHtml);
    }
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
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a notebook and page to start your work.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background p-1 sm:p-2 lg:p-4 printable-area">
      <Card className="w-full flex-1 flex flex-col overflow-hidden">
          <CardHeader className="p-2 print:hidden">
              <div className="flex items-center justify-between p-2 mb-2 border-b rounded-t-md bg-secondary/50 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("undo")}> <Undo className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("redo")}> <Redo className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={handlePrint}> <Printer className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Select value={currentBlockStyle} onValueChange={(value) => handleFormat("formatBlock", `<${value}>`)}>
                    <SelectTrigger className="w-32" onMouseDown={(e) => e.preventDefault()}> <SelectValue placeholder="Style" /> </SelectTrigger>
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
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={handleInsertLink}> <Link className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                   <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("justifyLeft")}> <AlignLeft className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("justifyCenter")}> <AlignCenter className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("justifyRight")}> <AlignRight className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("justifyFull")}> <AlignJustify className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("insertUnorderedList")}> <List className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("insertOrderedList")}> <ListOrdered className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={handleInsertChecklist}> <ListChecks className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("formatBlock", "<blockquote>")}> <Quote className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("formatBlock", "<pre>")}> <Code className="h-4 w-4" /> </Button>
                   <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={handleInsertTable}> <Table className="h-4 w-4" /> </Button>
                   <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat("insertHorizontalRule")}> <Minus className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <SpeechToText onTranscriptionComplete={(text) => {
                    restoreSelection();
                    document.execCommand('insertHTML', false, ` ${text}`);
                    editorRef.current?.focus();
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
                              if(editorRef.current) editorRef.current.innerHTML = refinedNotes.replace(/\\n/g, '<br />');
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
                                document.execCommand('insertHTML', false, `<pre><code>${generatedDiagram}</code></pre>`);
                                editorRef.current?.focus();
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
          <CardContent className="flex-1 overflow-y-auto p-0">
              <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyDown={handleKeyDown}
                  onKeyUp={updateToolbarState}
                  onMouseUp={updateToolbarState}
                  className="prose dark:prose-invert max-w-none w-full h-full bg-card p-4 sm:p-6 md:p-8 lg:p-12 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ direction: 'ltr' }}
              />
          </CardContent>
        </Card>
    </div>
  );
}

    