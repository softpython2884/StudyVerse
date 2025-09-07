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
import { Input } from "./ui/input";


interface EditorProps {
  page: Page;
}

export function Editor({ page }: EditorProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);
  
  const [refinedNotes, setRefinedNotes] = React.useState("");
  const [diagramText, setDiagramText] = React.useState("");
  const [diagramFormat, setDiagramFormat] = React.useState<"markdown" | "latex" | "txt">("txt");
  const [generatedDiagram, setGeneratedDiagram] = React.useState("");
  const [isRefining, setIsRefining] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const { toast } = useToast();

  React.useEffect(() => {
    if (editorRef.current) {
        editorRef.current.innerHTML = page.content || "";
    }
  }, [page]);


  const handleFormat = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      editorRef.current.focus();
    }
  };

  const handleInsertLink = () => {
    const url = prompt("Enter the URL:");
    if (url) {
      handleFormat("createLink", url);
    }
  };

  const handleInsertChecklist = () => {
    if (editorRef.current) {
      const list = document.createElement('ul');
      list.setAttribute('data-type', 'checklist');
      const listItem = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      const label = document.createElement('label');
      label.contentEditable = 'true';
      label.innerText = 'To-do item';
      
      listItem.appendChild(checkbox);
      listItem.appendChild(label);
      list.appendChild(listItem);
      
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(list);
      }
    }
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
      tableHtml += '</table>';
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


  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a notebook and page to start your work.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-secondary/30 p-4 sm:p-6 lg:p-8">
      <Card className="w-full flex-1 flex flex-col">
          <CardHeader>
              <div className="flex items-center justify-between p-2 mb-2 border rounded-md bg-secondary/50 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("undo")}> <Undo className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("redo")}> <Redo className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => window.print()}> <Printer className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Select defaultValue="p" onValueChange={(value) => handleFormat("formatBlock", `<${value}>`)}>
                    <SelectTrigger className="w-32"> <SelectValue placeholder="Style" /> </SelectTrigger>
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
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("bold")}> <Bold className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("italic")}> <Italic className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("underline")}> <Underline className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("strikeThrough")}> <Strikethrough className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={handleInsertLink}> <Link className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                   <Button variant="ghost" size="icon" onClick={() => handleFormat("justifyLeft")}> <AlignLeft className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("justifyCenter")}> <AlignCenter className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("justifyRight")}> <AlignRight className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("justifyFull")}> <AlignJustify className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("insertUnorderedList")}> <List className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("insertOrderedList")}> <ListOrdered className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={handleInsertChecklist}> <ListChecks className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("formatBlock", "<blockquote>")}> <Quote className="h-4 w-4" /> </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFormat("formatBlock", "<pre>")}> <Code className="h-4 w-4" /> </Button>
                   <Button variant="ghost" size="icon" onClick={handleInsertTable}> <Table className="h-4 w-4" /> </Button>
                   <Button variant="ghost" size="icon" onClick={() => handleFormat("insertHorizontalRule")}> <Minus className="h-4 w-4" /> </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <SpeechToText onTranscriptionComplete={(text) => {
                    if(editorRef.current) {
                      editorRef.current.focus();
                      document.execCommand('insertHTML', false, ` ${text}`);
                    }
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
                              if(editorRef.current) editorRef.current.innerHTML = refinedNotes.replace(/\n/g, '<br />');
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
                                if(editorRef.current) document.execCommand('insertHTML', false, `<pre><code>${generatedDiagram}</code></pre>`);
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
          <CardContent className="flex-1 overflow-y-auto">
              <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="prose dark:prose-invert max-w-none w-full h-full bg-background p-4 sm:p-6 md:p-8 lg:p-12 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ direction: 'ltr' }}
              />
          </CardContent>
        </Card>
    </div>
  );
}
