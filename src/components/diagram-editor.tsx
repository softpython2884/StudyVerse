
"use client";

import * as React from "react";
import {
  Save,
  Share2,
  Download,
  LoaderCircle,
  Bot,
  Image,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";
import { updatePageContent } from "@/lib/actions";
import { generateDiagram } from "@/ai/flows/generate-diagrams-from-text";
import type { Page } from "@/lib/types";
import { toPng } from 'html-to-image';

import { DiagramShell, MindMap, Flowchart, OrgChart } from './diagrams/diagrams_library';

const diagramTypes = ['MindMap', 'Flowchart', 'OrgChart'];

interface DiagramData {
    nodes: any[];
    edges: any[];
}

interface DiagramEditorProps {
  page: Page;
}

export function DiagramEditor({ page }: DiagramEditorProps) {
  const [data, setData] = React.useState<DiagramData>({ nodes: [], edges: [] });
  const [isSaving, setIsSaving] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const [diagramContext, setDiagramContext] = React.useState("");
  const [diagramPrompt, setDiagramPrompt] = React.useState("");
  const [diagramType, setDiagramType] = React.useState<(typeof diagramTypes)[number]>("MindMap");
  
  const diagramContainerRef = React.useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  React.useEffect(() => {
    if (page.content) {
      try {
        const parsedData = JSON.parse(page.content);
        setData(parsedData);
      } catch (e) {
        setData({ nodes: [], edges: [] });
        console.error("Failed to parse page content as diagram data", e);
      }
    } else {
        setData({ nodes: [], edges: [] });
    }
  }, [page]);

  const handleSaveContent = async () => {
    setIsSaving(true);
    const result = await updatePageContent({
      pageId: page.id,
      content: JSON.stringify(data, null, 2),
    });

    if (result.success) {
      toast({
        title: "Saved",
        description: "Your diagram has been saved.",
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
  
  const handleGenerateDiagram = async () => {
    if (!diagramPrompt) {
        toast({ title: "Error", description: "Please enter a prompt for the diagram.", variant: "destructive" });
        return;
    }
    setIsGenerating(true);
    try {
        const fullPrompt = `${diagramContext}\n\nPROMPT: ${diagramPrompt}`;
        const result = await generateDiagram({ text: fullPrompt, diagramType });
        const diagramData = JSON.parse(result.diagramData);
        
        // The library uses different prop names, so we need to adapt.
        const adaptedData = {
            nodes: diagramData.nodes.map((n: any) => ({
                id: n.id,
                label: n.data.label,
                x: n.position.x / 10, // Adjust coordinates for the new library
                y: n.position.y / 10,
                color: n.style?.backgroundColor
            })),
            edges: diagramData.edges.map((e: any) => ({
                from: e.source,
                to: e.target
            }))
        };

        setData(adaptedData);
        toast({ title: "Success", description: "Diagram generated." });
    } catch (error) {
        console.error("Error generating diagram:", error);
        toast({ title: "Error", description: "Failed to generate diagram data.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };
    
    const handleExport = (format: 'png' | 'pdf') => {
        if (!diagramContainerRef.current) {
            toast({ title: "Error", description: "Could not find diagram to export.", variant: "destructive" });
            return;
        }

        if (format === 'png') {
            toPng(diagramContainerRef.current, { cacheBust: true })
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = `${page.title || 'diagram'}.png`;
                    link.href = dataUrl;
                    link.click();
                })
                .catch((err) => {
                    console.error(err);
                    toast({ title: "Error", description: "Failed to export as PNG.", variant: "destructive" });
                });
        } else if (format === 'pdf') {
            window.print();
        }
    };


  return (
    <div className="flex flex-col h-full bg-background">
        <header className="p-2 print-hidden sticky top-0 bg-background z-10 border-b">
            <div className="flex items-center justify-between p-2 rounded-t-md bg-secondary/50 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                  {/* AI Chat button will be placed here in a future step */}
              </div>

              <div className="flex items-center gap-2">
                   <Button variant="ghost" size="sm" onClick={handleSaveContent} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="ghost" size="sm"><Share2 className="mr-2 h-4 w-4" />Share</Button>
                   <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <Download className="mr-2 h-4 w-4" />Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleExport('png')}>
                                <Image className="mr-2 h-4 w-4" />
                                <span>PNG</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>PDF</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
              </div>
          </div>
        </header>

        <main ref={diagramContainerRef} className="flex-1 w-full h-full printable-area">
          <DiagramShell>
              {diagramType === 'MindMap' && <MindMap nodes={data.nodes} edges={data.edges} />}
              {diagramType === 'Flowchart' && <Flowchart nodes={data.nodes} edges={data.edges} />}
              {diagramType === 'OrgChart' && <OrgChart nodes={data.nodes} />}
          </DiagramShell>
        </main>
    </div>
  );
}
