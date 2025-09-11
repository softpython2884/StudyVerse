
"use client";

import * as React from "react";
import {
  Save,
  Share2,
  Download,
  Bot,
  Image,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { updatePageContent } from "@/lib/actions";
import type { Page } from "@/lib/types";
import { toPng } from 'html-to-image';

import { DiagramShell, MindMap, Flowchart, OrgChart } from './diagrams/diagrams_library';

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
    <div className="flex flex-col h-full w-full bg-background relative">
        <header className="p-2 print-hidden sticky top-0 bg-background z-10 border-b">
            <div className="flex items-center justify-end p-2 rounded-t-md bg-secondary/50 flex-wrap">
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
                {page.type === 'diagram' && (() => {
                    const diagramType = data.nodes?.[0]?.type || 'MindMap';
                    switch(diagramType) {
                        case 'MindMap':
                             return <MindMap nodes={data.nodes} edges={data.edges} />;
                        case 'Flowchart':
                             return <Flowchart nodes={data.nodes} edges={data.edges} />;
                        case 'OrgChart':
                             return <OrgChart nodes={data.nodes} />;
                        default:
                            return <MindMap nodes={data.nodes} edges={data.edges} />;
                    }
                })()}
            </DiagramShell>
        </main>
        
        <Button
            onClick={() => { /* AI Chat logic will be here */ }}
            className="absolute bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
        >
            <Bot className="h-6 w-6" />
            <span className="sr-only">Open AI Assistant</span>
        </Button>
    </div>
  );
}

