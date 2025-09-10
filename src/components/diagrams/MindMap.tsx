// src/components/diagrams/MindMap.tsx

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type MindMapNode = {
  id: string;
  label: string;
  x: number; // position relative (% ou px)
  y: number;
};

type MindMapEdge = {
  from: string;
  to: string;
};

interface MindMapProps {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export const MindMap: React.FC<MindMapProps> = ({ nodes, edges }) => {
  return (
    <div className="relative w-full h-[600px] bg-background border border-border rounded-xl overflow-hidden">
      {/* Arêtes (SVG) */}
      <svg
        className="absolute top-0 left-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      >
        {edges.map((edge, i) => {
          const from = nodes.find((n) => n.id === edge.from);
          const to = nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;

          return (
            <line
              key={i}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              stroke="hsl(var(--border))"
              strokeWidth={2}
            />
          );
        })}
      </svg>

      {/* Noeuds */}
      {nodes.map((node, i) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className={cn(
            "absolute p-4 bg-card text-card-foreground border border-border",
            "rounded-lg shadow-md hover:shadow-lg transition-shadow"
          )}
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
        >
          {node.label}
        </motion.div>
      ))}
    </div>
  );
};
