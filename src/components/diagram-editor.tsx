
"use client";

import * as React from "react";
import {
  Save,
  Share2,
  Download,
  Plus,
  LoaderCircle,
  Bot,
  Palette,
  Group,
  Ungroup,
  RectangleHorizontal,
  MoveDownRight,
  MoveUpLeft,
  Image,
  FileText,
  Spline,
  Minus,
  MoveVertical,
  Waypoints,
  Sparkles,
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
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  type Connection,
  useOnSelectionChange,
  MarkerType,
} from 'reactflow';
import { toPng } from 'html-to-image';
import { useCallback, useState } from "react";
import { DiagramEditorSidebar } from "./diagram-editor-sidebar";

const proOptions: ProOptions = { hideAttribution: true };
const diagramTypes = ['MindMap', 'Flowchart', 'OrgChart'];
const nodeColors = [
    { name: "Default", color: "#ffffff" },
    { name: "Red", color: "#ffcdd2" },
    { name: "Green", color: "#c8e6c9" },
    { name: "Blue", color: "#bbdefb" },
    { name: "Yellow", color: "#fff9c4" },
    { name: "Purple", color: "#e1bee7" },
];

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

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    type: 'node' | 'edge';
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setSelectedNodeIds(nodes.map((node) => node.id));
    },
  });

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
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );
  
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    const newLabel = prompt("Enter new label:", node.data.label);
    if (newLabel !== null && newLabel.trim() !== '') {
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

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const pane = ref.current?.getBoundingClientRect();
      if (!pane) return;
      setContextMenu({
        id: node.id,
        type: 'node',
        top: event.clientY,
        left: event.clientX,
        right: pane.width - event.clientX,
        bottom: pane.height - event.clientY,
      });
    },
    [setContextMenu]
  );
  
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const pane = ref.current?.getBoundingClientRect();
      if (!pane) return;
      setContextMenu({
        id: edge.id,
        type: 'edge',
        top: event.clientY,
        left: event.clientX,
        right: pane.width - event.clientX,
        bottom: pane.height - event.clientY,
      });
    },
    [setContextMenu]
  );

  const onPaneClick = useCallback(() => setContextMenu(null), [setContextMenu]);

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
  
  const setNodeStyle = (color: string) => {
    if (!contextMenu) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === contextMenu.id) {
          return { ...n, style: { ...n.style, backgroundColor: color } };
        }
        return n;
      })
    );
    setContextMenu(null);
  };

  const setNodeType = (type: string) => {
    if (!contextMenu) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === contextMenu.id) {
          return { ...n, type };
        }
        return n;
      })
    );
    setContextMenu(null);
  };

  const setEdgeStyle = (style: Partial<Edge>) => {
    if (!contextMenu) return;
    setEdges((eds) => 
        eds.map((e) => {
            if (e.id === contextMenu.id) {
                const newEdge = { ...e, ...style };
                if (style.style) {
                    newEdge.style = { ...e.style, ...style.style };
                }
                return newEdge;
            }
            return e;
        })
    );
    setContextMenu(null);
  };

  const handleGroupNodes = () => {
    if (selectedNodeIds.length <= 1) {
        toast({ title: "Info", description: "Select multiple nodes to group them." });
        return;
    }
    const groupId = `group-${Date.now()}`;
    const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id) && !n.parentNode);

    const minX = Math.min(...selectedNodes.map(n => n.position.x));
    const minY = Math.min(...selectedNodes.map(n => n.position.y));
    const maxX = Math.max(...selectedNodes.map(n => n.position.x + (n.width || 150)));
    const maxY = Math.max(...selectedNodes.map(n => n.position.y + (n.height || 40)));

    const groupNode: Node = {
      id: groupId,
      type: 'group',
      position: { x: minX - 20, y: minY - 40 },
      data: { label: 'New Group' },
      style: {
        width: maxX - minX + 40,
        height: maxY - minY + 60,
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
        borderColor: 'rgba(128, 128, 128, 0.3)',
      },
    };

    setNodes(prevNodes => [
      ...prevNodes.map(n => {
        if (selectedNodeIds.includes(n.id)) {
          return { ...n, parentNode: groupId, extent: 'parent' as const };
        }
        return n;
      }),
      groupNode,
    ]);
    
    setContextMenu(null);
  };

  const handleUngroupNode = () => {
    if (!contextMenu) return;
    const nodeToUngroup = nodes.find(n => n.id === contextMenu.id);
    if (!nodeToUngroup || !nodeToUngroup.parentNode) return;

    setNodes(prevNodes =>
      prevNodes.map(n => {
        if (n.id === nodeToUngroup.id) {
          const { parentNode, extent, ...rest } = n;
          return rest;
        }
        return n;
      })
    );
    setContextMenu(null);
  };

  const isNodeInGroup = () => {
      if (!contextMenu) return false;
      const node = nodes.find(n => n.id === contextMenu.id);
      return !!node?.parentNode;
  };
  
    const getSelectedNode = () => {
        if (selectedNodeIds.length !== 1) return null;
        return nodes.find(n => n.id === selectedNodeIds[0]) || null;
    };
    
    const handleExport = (format: 'png' | 'pdf') => {
        const diagramNode = document.querySelector('.react-flow') as HTMLElement;
        if (!diagramNode) {
            toast({ title: "Error", description: "Could not find diagram to export.", variant: "destructive" });
            return;
        }

        if (format === 'png') {
            toPng(diagramNode, { cacheBust: true })
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
    <div className="flex h-full bg-background">
      <div className="flex flex-col flex-1 h-full">
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

        <main ref={ref} className="flex-1 w-full h-full printable-area">
          <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={onPaneClick}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeContextMenu={onEdgeContextMenu}
              onNodeDoubleClick={onNodeDoubleClick}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              proOptions={proOptions}
          >
              <Background />
              <Controls />
              <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
          
          {contextMenu && (
              <DropdownMenu open onOpenChange={() => setContextMenu(null)}>
                   <DropdownMenuPortal>
                      <DropdownMenuContent
                          className="w-48"
                          style={{ top: contextMenu.top, left: contextMenu.left }}
                          onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                           {contextMenu.type === 'node' && (
                                <>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Palette className="mr-2 h-4 w-4" />
                                            <span>Change Color</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                {nodeColors.map(({ name, color }) => (
                                                    <DropdownMenuItem key={name} onClick={() => setNodeStyle(color)}>
                                                        <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: color, border: '1px solid #ccc' }} />
                                                        {name}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <RectangleHorizontal className="mr-2 h-4 w-4" />
                                            <span>Change Shape</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onClick={() => setNodeType('default')}>
                                                    <RectangleHorizontal className="mr-2 h-4 w-4" /> Default
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setNodeType('input')}>
                                                    <MoveDownRight className="mr-2 h-4 w-4" /> Input
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setNodeType('output')}>
                                                    <MoveUpLeft className="mr-2 h-4 w-4" /> Output
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem onClick={handleGroupNodes} disabled={selectedNodeIds.length <= 1}>
                                        <Group className="mr-2 h-4 w-4" />
                                        Group Selection
                                    </DropdownMenuItem>
                                    {isNodeInGroup() && (
                                        <DropdownMenuItem onClick={handleUngroupNode}>
                                            <Ungroup className="mr-2 h-4 w-4" />
                                            Ungroup Node
                                        </DropdownMenuItem>
                                    )}
                                </>
                           )}
                           {contextMenu.type === 'edge' && (
                                <>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger><Waypoints className="mr-2 h-4 w-4" /><span>Type de tracé</span></DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onClick={() => setEdgeStyle({ type: 'default' })}>Bézier</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEdgeStyle({ type: 'smoothstep' })}>Arrondi</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEdgeStyle({ type: 'step' })}>Orthogonal</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEdgeStyle({ type: 'straight' })}>Droit</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger><Spline className="mr-2 h-4 w-4" /><span>Style de ligne</span></DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onClick={() => setEdgeStyle({ style: { strokeDasharray: undefined } })}>Plein</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEdgeStyle({ style: { strokeDasharray: '5 5' } })}>Pointillés</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEdgeStyle({ style: { strokeDasharray: '10 5' } })}>Tirets</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setEdgeStyle({ animated: true })}>
                                        <Sparkles className="mr-2 h-4 w-4" /> Animer
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => setEdgeStyle({ animated: false })}>
                                        <Minus className="mr-2 h-4 w-4" /> Stopper animation
                                    </DropdownMenuItem>
                                </>
                           )}
                      </DropdownMenuContent>
                  </DropdownMenuPortal>
              </DropdownMenu>
          )}

        </main>
      </div>

       <DiagramEditorSidebar
            selectedNode={getSelectedNode()}
            onNodeDataChange={(newData) => {
                if (!getSelectedNode()) return;
                setNodes((nds) =>
                    nds.map((n) => {
                        if (n.id === getSelectedNode()!.id) {
                            return { ...n, data: { ...n.data, ...newData } };
                        }
                        return n;
                    })
                );
            }}
        />
    </div>
  );
}

    