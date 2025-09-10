
"use client";

import * as React from "react";
import {
  Network,
  Save,
  Share2,
  Download,
  Plus,
  LoaderCircle,
  Bot,
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
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type ProOptions,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection
} from 'reactflow';
import { useCallback } from "react";

const proOptions: ProOptions = { hideAttribution: true };
const diagramTypes = ['MindMap', 'Flowchart', 'OrgChart'];

interface DiagramEditorProps {
  page: Page;
}

export function DiagramEditor({ page }: DiagramEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const [diagramContext, setDiagramContext] = React.useState("");
  const [diagramPrompt, setDiagramPrompt] = React.useState("");
  const [diagramType, setDiagramType] = React.useState<(typeof diagramTypes)[number]>("MindMap");

  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();

  React.useEffect(() => {
    if (page.content) {
      try {
        const data = JSON.parse(page.content);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
      } catch (e) {
        setNodes([]);
        setEdges([]);
        console.error("Failed to parse page content as diagram data", e);
      }
    } else {
        setNodes([]);
        setEdges([]);
    }
  }, [page, setNodes, setEdges]);
  
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    const newLabel = prompt("Enter new label:", node.data.label);
    if (newLabel !== null) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            return {
              ...n,
              data: {
                ...n.data,
                label: newLabel,
              },
            };
          }
          return n;
        })
      );
    }
  }, [setNodes]);

  const handleSaveContent = async () => {
    setIsSaving(true);
    const diagramData = { nodes: reactFlowInstance.getNodes(), edges: reactFlowInstance.getEdges() };
    const result = await updatePageContent({
      pageId: page.id,
      content: JSON.stringify(diagramData, null, 2),
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
        const data = JSON.parse(result.diagramData);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        toast({ title: "Success", description: "Diagram generated." });
    } catch (error) {
        console.error("Error generating diagram:", error);
        toast({ title: "Error", description: "Failed to generate diagram data.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleAddNode = () => {
    const newNodeId = `node-${nodes.length + 1}`;
    const viewport = reactFlowInstance.getViewport();
    const position = {
        x: ( -viewport.x + reactFlowInstance.width / 2) / viewport.zoom,
        y: ( -viewport.y + reactFlowInstance.height / 2) / viewport.zoom
    };

    const newNode: Node = {
      id: newNodeId,
      position,
      data: { label: `New Node ${nodes.length + 1}` },
      type: 'default',
    };
    setNodes((nds) => nds.concat(newNode));
  };


  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-2 print-hidden sticky top-0 bg-background z-10 border-b">
          <div className="flex items-center justify-between p-2 rounded-t-md bg-secondary/50 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <Bot className="mr-2 h-4 w-4" />
                            Generate with AI
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Generate Diagram</DialogTitle>
                            <DialogDescription>Create a diagram from text using AI.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                           <div className="grid gap-2">
                                <Label htmlFor="diagram-prompt">Generation Prompt</Label>
                                <Input id="diagram-prompt" value={diagramPrompt} onChange={(e) => setDiagramPrompt(e.target.value)} placeholder="e.g., Org chart of the British Royal Family" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="diagram-text">Context (Optional)</Label>
                                <Textarea id="diagram-text" value={diagramContext} onChange={(e) => setDiagramContext(e.target.value)} placeholder="Paste your course notes or any relevant text here..." />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="diagram-type">Diagram Type</Label>
                                <Select onValueChange={(value: (typeof diagramTypes)[number]) => setDiagramType(value)} defaultValue={diagramType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                    {diagramTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                            <DialogClose asChild>
                                <Button onClick={handleGenerateDiagram} disabled={isGenerating}>
                                    {isGenerating ? <LoaderCircle className="animate-spin" /> : "Generate"}
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={handleAddNode}><Plus className="mr-2 h-4 w-4" />Add Node</Button>
            </div>

            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={handleSaveContent} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button variant="ghost" size="sm"><Share2 className="mr-2 h-4 w-4" />Share</Button>
                <Button variant="ghost" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
            </div>
        </div>
      </header>

      <main className="flex-1 w-full h-full">
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            proOptions={proOptions}
        >
            <Background />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </main>
    </div>
  );
}
