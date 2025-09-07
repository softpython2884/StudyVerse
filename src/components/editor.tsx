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
  Code,
  Quote,
  Undo,
  Redo,
  Printer,
  ChevronLeft,
  Plus,
  Bot,
  Network,
  Share2,
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
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { SpeechToText } from "./speech-to-text";
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
import { refineAndStructureNotes } from "@/ai/flows/refine-and-structure-notes";
import { generateDiagram } from "@/ai/flows/generate-diagrams-from-text";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface EditorProps {
  page: Page;
}

const sampleContent = `<h1>Titre Principal</h1>
<h2>Sous-titre</h2>
<p>Ceci est un paragraphe de texte. Il peut contenir <b>du gras</b>, <i>de l'italique</i>, ou même <code>du code inline</code>.</p>
<hr/>
<h3>Liste à puces</h3>
<ul>
  <li>Élément 1</li>
  <li>Élément 2</li>
  <li>Élément 3</li>
</ul>
<h3>Liste numérotée</h3>
<ol>
  <li>Première étape</li>
  <li>Deuxième étape</li>
  <li>Troisième étape</li>
</ol>
<h3>Citation</h3>
<blockquote>Ceci est une citation inspirante.</blockquote>
<h3>Lien</h3>
<p><a href="#" class="text-primary hover:underline">Visitez Microsoft Copilot</a></p>
<h3>Bloc de code</h3>
<pre><code class="language-python">def dire_bonjour():
  print("Bonjour, monde !")</code></pre>`;

const sampleNote = `<h1>Notes de cours</h1><p>A neural network is a method in artificial intelligence that teaches computers to process data in a way that is inspired by the human brain. It is a type of machine learning process, called deep learning, that uses interconnected nodes or neurons in a layered structure that resembles the human brain. It creates an adaptive system that computers use to learn from their mistakes and improve continuously.</p>`;


export function Editor({ page }: EditorProps) {
  const [content, setContent] = React.useState("");
  const editorRef = React.useRef<HTMLDivElement>(null);
  
  const [refinedNotes, setRefinedNotes] = React.useState("");
  const [diagramText, setDiagramText] = React.useState("");
  const [diagramFormat, setDiagramFormat] = React.useState<"markdown" | "latex" | "txt">("txt");
  const [generatedDiagram, setGeneratedDiagram] = React.useState("");
  const [isRefining, setIsRefining] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  const { toast } = useToast();

  React.useEffect(() => {
    // Both types now use the same rich content.
    // We can differentiate initial content if needed.
    if (page.type === 'note') {
      setContent(sampleNote)
    } else {
      setContent(sampleContent);
    }
  }, [page]);


  const handleFormat = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
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
    <div className="flex h-full bg-secondary/30 justify-center">
      <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto max-w-7xl">
        <div className="w-full">
          <Card>
            <CardHeader>
                <div className="flex items-center justify-between p-2 mb-2 border rounded-md bg-secondary/50">
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
                    </SelectContent>
                    </Select>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" onClick={() => handleFormat("bold")}> <Bold className="h-4 w-4" /> </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleFormat("italic")}> <Italic className="h-4 w-4" /> </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleFormat("underline")}> <Underline className="h-4 w-4" /> </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" onClick={() => handleFormat("insertUnorderedList")}> <List className="h-4 w-4" /> </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleFormat("insertOrderedList")}> <ListOrdered className="h-4 w-4" /> </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleFormat("formatBlock", "<blockquote>")}> <Quote className="h-4 w-4" /> </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleFormat("formatBlock", "<pre>")}> <Code className="h-4 w-4" /> </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <SpeechToText onTranscriptionComplete={(text) => {
                      if(editorRef.current) {
                        editorRef.current.focus();
                        document.execCommand('insertHTML', false, ` ${text}`);
                      }
                    }} />

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                            <Bot className="mr-2 h-4 w-4" />
                            Refine
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                            <DialogHeader>
                                <DialogTitle>Refined Note</DialogTitle>
                                <DialogDescription>Your note, enhanced and structured by AI.</DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto p-4 border rounded-md" onClick={handleRefineNotes}>
                                {isRefining ? <p>Refining your notes...</p> : <pre className="whitespace-pre-wrap font-body">{refinedNotes}</pre>}
                            </div>
                            <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose></DialogFooter>
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
                            <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <Button variant="ghost" size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="prose dark:prose-invert max-w-none w-full bg-background p-12 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-ring"
                    onInput={handleContentChange}
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
