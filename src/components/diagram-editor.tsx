
"use client";

import * as React from "react";
import {
  Save,
  Share2,
  Download,
  Bot,
  Image,
  FileText,
  X,
  Send,
  LoaderCircle,
} from "lucide-react";
import ReactFlow, {
  Controls,
  Background,
  type Node,
  type Edge,
} from "reactflow";

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
import { generateDiagram } from "@/ai/flows/generate-diagrams-from-text";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface DiagramData {
    nodes: Node[];
    edges: Edge[];
}

interface DiagramEditorProps {
  page: Page;
}

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export function DiagramEditor({ page }: DiagramEditorProps) {
  const [data, setData] = React.useState<DiagramData>({ nodes: [], edges: [] });
  const [isSaving, setIsSaving] = React.useState(false);
  const diagramContainerRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // AI Panel State
  const [isAiPanelOpen, setIsAiPanelOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    if (page.content) {
      try {
        const parsedData = JSON.parse(page.content);
        if (parsedData.nodes && parsedData.edges) {
          setData(parsedData);
        } else {
          setData({ nodes: [], edges: [] });
        }
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
      
      // Select the react-flow viewport for accurate export
      const viewport = diagramContainerRef.current.querySelector('.react-flow__viewport');
      if (!viewport) {
           toast({ title: "Error", description: "Could not find diagram viewport.", variant: "destructive" });
           return;
      }

      if (format === 'png') {
          toPng(viewport as HTMLElement, { cacheBust: true, pixelRatio: 2 })
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

  const handleAiSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isGenerating) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput("");
    setIsGenerating(true);

    try {
        const result = await generateDiagram({
            diagramType: "MindMap", // This could be made dynamic
            instruction: userInput,
            currentDiagram: JSON.stringify(data),
            chatHistory: JSON.stringify(messages)
        });

        if (result.diagramData) {
            const newDiagramData = JSON.parse(result.diagramData);
            setData(newDiagramData);
        }

        const assistantMessage: ChatMessage = { role: 'assistant', content: result.response };
        setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        toast({
            title: "AI Error",
            description: error.message || "Failed to generate AI response.",
            variant: "destructive",
        });
        const errorMessage: ChatMessage = { role: 'assistant', content: "Sorry, I encountered an error. Please try again." };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsGenerating(false);
    }
  };


  return (
    <div className="flex h-full w-full bg-background relative">
        <main ref={diagramContainerRef} className="flex-1 w-full h-full printable-area">
             <ReactFlow
                nodes={data.nodes}
                edges={data.edges}
                fitView
                className="bg-secondary/20"
             >
                <Controls className="print-hidden" />
                <Background />
             </ReactFlow>
        </main>
        
        <Button
            onClick={() => setIsAiPanelOpen(true)}
            className={cn(
                "absolute bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-10 print-hidden",
                isAiPanelOpen && "hidden"
            )}
        >
            <Bot className="h-6 w-6" />
            <span className="sr-only">Open AI Assistant</span>
        </Button>

        {/* AI Chat Panel */}
        <div className={cn(
            "absolute top-0 right-0 h-full w-96 bg-card border-l shadow-2xl z-20 transform transition-transform duration-300 ease-in-out flex flex-col print-hidden",
            isAiPanelOpen ? "translate-x-0" : "translate-x-full"
        )}>
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Bot className="h-6 w-6 text-primary" />
                    <h3 className="text-lg font-semibold">Diagram Assistant</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsAiPanelOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                {messages.map((message, index) => (
                     <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : '')}>
                        {message.role === 'assistant' && (
                             <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot size={18} /></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn("p-3 rounded-lg max-w-xs", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                            <p className="text-sm">{message.content}</p>
                        </div>
                         {message.role === 'user' && (
                             <Avatar className="h-8 w-8">
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                {isGenerating && (
                    <div className="flex items-start gap-3">
                         <Avatar className="h-8 w-8">
                            <AvatarFallback><Bot size={18} /></AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-lg bg-secondary">
                           <LoaderCircle className="h-5 w-5 animate-spin" />
                        </div>
                    </div>
                )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t">
                <form onSubmit={handleAiSubmit} className="flex items-center gap-2">
                    <Input 
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="e.g., Add a node for 'Prince William'" 
                        disabled={isGenerating}
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isGenerating || !userInput.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    </div>
  );
}
