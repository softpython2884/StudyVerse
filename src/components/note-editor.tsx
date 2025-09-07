"use client";

import * as React from "react";
import {
  Bot,
  Network,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { Page } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface NoteEditorProps {
  page: Page | null;
}

const sampleNote = `A neural network is a method in artificial intelligence that teaches computers to process data in a way that is inspired by the human brain. It is a type of machine learning process, called deep learning, that uses interconnected nodes or neurons in a layered structure that resembles the human brain. It creates an adaptive system that computers use to learn from their mistakes and improve continuously.`;

export function NoteEditor({ page }: NoteEditorProps) {
  const [noteContent, setNoteContent] = React.useState(
    page?.type === "note" ? sampleNote : ""
  );
  const [refinedNotes, setRefinedNotes] = React.useState("");
  const [diagramText, setDiagramText] = React.useState("");
  const [diagramFormat, setDiagramFormat] =
    React.useState<"markdown" | "latex" | "txt">("txt");
  const [generatedDiagram, setGeneratedDiagram] = React.useState("");
  const [isRefining, setIsRefining] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const { toast } = useToast();

  React.useEffect(() => {
    setNoteContent(page?.type === 'note' ? sampleNote : `This is the course page for ${page?.title}. You can add course-specific information here.`);
  }, [page]);

  const handleRefineNotes = async () => {
    if (!noteContent) {
      toast({
        title: "Error",
        description: "There is no content to refine.",
        variant: "destructive",
      });
      return;
    }
    setIsRefining(true);
    try {
      const result = await refineAndStructureNotes({ rawNotes: noteContent });
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
      <Card className="h-[70vh] flex items-center justify-center">
        <CardContent>
          <p className="text-muted-foreground">Select a notebook and page to start your work.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{page.title}</CardTitle>
        <CardDescription>
          {page.type === "note"
            ? "Use the tools below to take and enhance your notes."
            : "General information for this course."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-2 mb-2 border rounded-md bg-secondary/50">
          <div className="flex items-center gap-2">
            <SpeechToText
              onTranscriptionComplete={(text) =>
                setNoteContent((prev) => prev + " " + text)
              }
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleRefineNotes}>
                  <Bot className="mr-2 h-4 w-4" />
                  Refine Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Refined Note</DialogTitle>
                  <DialogDescription>
                    Your note, enhanced and structured by AI.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-4 border rounded-md">
                    {isRefining ? (
                        <p>Refining your notes...</p>
                    ) : (
                        <pre className="whitespace-pre-wrap font-body">{refinedNotes}</pre>
                    )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Close
                    </Button>
                  </DialogClose>
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
                  <DialogDescription>
                    Create a diagram from text using AI.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="diagram-text">Text</Label>
                    <Textarea
                      id="diagram-text"
                      value={diagramText}
                      onChange={(e) => setDiagramText(e.target.value)}
                      placeholder="Enter text to turn into a diagram..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="diagram-format">Format</Label>
                    <Select
                      onValueChange={(
                        value: "markdown" | "latex" | "txt"
                      ) => setDiagramFormat(value)}
                      defaultValue={diagramFormat}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="txt">TXT + ASCII</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="latex">LaTeX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleGenerateDiagram} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                  {generatedDiagram && (
                     <div className="max-h-[30vh] overflow-y-auto p-4 border rounded-md">
                        <Label>Generated Diagram</Label>
                        <pre className="whitespace-pre-wrap font-mono text-sm">{generatedDiagram}</pre>
                    </div>
                  )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Close</Button>
                    </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Button variant="ghost" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Start typing your notes here, or use the speech-to-text feature..."
          className="min-h-[50vh] w-full"
        />
      </CardContent>
    </Card>
  );
}
