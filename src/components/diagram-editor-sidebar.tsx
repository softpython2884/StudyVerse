
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { type Node } from "reactflow";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface DiagramEditorSidebarProps {
  selectedNode: Node | null;
  onNodeDataChange: (data: { label?: string; description?: string }) => void;
}

export function DiagramEditorSidebar({ selectedNode, onNodeDataChange }: DiagramEditorSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  
  // Using a debounce timer to avoid updating the state on every keystroke
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedNode) {
      setIsOpen(true);
      setLabel(selectedNode.data.label || "");
      setDescription(selectedNode.data.description || "");
    } else {
      setIsOpen(false);
    }
  }, [selectedNode]);
  
  useEffect(() => {
    if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
        if (selectedNode) {
            onNodeDataChange({ label, description });
        }
    }, 300); // 300ms debounce
    
    return () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, description, selectedNode]);

  if (!selectedNode) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-[350px] sm:w-[450px] print-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Edit Node</SheetTitle>
          <SheetDescription>
            Change the properties of the selected node here.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="node-label">Label</Label>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="node-description">Description</Label>
            <Textarea
              id="node-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 min-h-[200px]"
              placeholder="Add a detailed description for this node..."
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

