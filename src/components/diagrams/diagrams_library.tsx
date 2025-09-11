// diagrams-library.tsx
// Single-file collection of reusable React + TypeScript + Tailwind + Framer Motion
// components for building large, production-ready diagrams (mindmap, flowchart, orgchart, venn, timeline).
// Dependencies allowed: react, framer-motion, clsx, tailwind-merge, lucide-react

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// -------------------------
// Small local helpers
// -------------------------
const cn = (...args: any[]) => twMerge(clsx(...args));

type Point = { x: number; y: number };

// clamp helper
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// -------------------------
// DiagramShell: pan/zoom viewport
// Provides a stable foundation for very large diagrams
// -------------------------
export const DiagramShell = ({
  width = "100%",
  height = "100%",
  minZoom = 0.25,
  maxZoom = 3,
  initialZoom = 1,
  children,
  className,
  backgroundGrid = true,
}: {
  width?: string;
  height?: string;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  children: React.ReactNode;
  className?: string;
  backgroundGrid?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef<Point | null>(null);

  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom]);

  // Wheel to zoom (ctrl+wheel or wheel with meta) or to pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // if ctrlKey or metaKey => zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.08 : 0.925;
        setZoom((z) => clamp(z * factor, minZoom, maxZoom));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [minZoom, maxZoom]);

  // mouse drag to pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onDown = (e: MouseEvent) => {
      // ignore clicks on interactive controls (buttons etc.) by checking target
      const target = e.target as HTMLElement;
      if (target?.closest("button")) return;
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !lastPos.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      dragging.current = false;
      lastPos.current = null;
      el.style.cursor = "default";
    };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const zoomIn = () => setZoom((z) => clamp(z * 1.2, minZoom, maxZoom));
  const zoomOut = () => setZoom((z) => clamp(z / 1.2, minZoom, maxZoom));
  const reset = () => {
    setZoom(initialZoom);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-primary/5 border border-border rounded-xl overflow-hidden",
        className
      )}
      style={{ width, height }}
    >
      {/* Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 p-1 bg-card/80 backdrop-blur-sm rounded-md border border-border shadow-sm">
        <button
          aria-label="Zoom in"
          onClick={zoomIn}
          className="p-2 rounded-md hover:bg-primary/10"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button aria-label="Zoom out" onClick={zoomOut} className="p-2 rounded-md hover:bg-primary/10" title="Zoom out">
          <ZoomOut size={16} />
        </button>
        <button aria-label="Reset" onClick={reset} className="p-2 rounded-md hover:bg-primary/10" title="Reset view">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* grid background */}
      {backgroundGrid && (
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity={0.06} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}

      {/* content layer */}
      <div className="absolute inset-0 p-4">
        <motion.div
          style={{ transformOrigin: "0 0" }}
          animate={{ x: offset.x, y: offset.y, scale: zoom }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-[2000px] h-[1400px]"
        >
          {/* children should be positioned with absolute coords inside this area */}
          {children}
        </motion.div>
      </div>
    </div>
  );
};

// -------------------------
// MindMap component
// -------------------------
export const MindMap = ({ nodes, edges = [] }: { nodes: any[], edges?: any[] }) => {
  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--border))" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const fromNode = nodesById.get(e.from);
          const toNode = nodesById.get(e.to);
          if (!fromNode || !toNode) return null;
          
          const x1 = (fromNode.x / 100) * 2000;
          const y1 = (fromNode.y / 100) * 1400;
          const x2 = (toNode.x / 100) * 2000;
          const y2 = (toNode.y / 100) * 1400;
          
          // Calculate a gentle curve for the path
          const dx = x2 - x1;
          const dy = y2 - y1;
          // Control point for the curve. Adjust the multiplier for more/less curve
          const cx1 = x1 + dx * 0.25; 
          const cy1 = y1 + dy * 0.1;
          const cx2 = x1 + dx * 0.75;
          const cy2 = y1 + dy * 0.9;
          
          return (
            <path
              key={e.id || `edge-${i}`}
              d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
              strokeWidth={1.5}
              stroke="hsl(var(--border))"
              fill="none"
              markerEnd="url(#arrow)"
              opacity={0.8}
            />
          );
        })}
      </svg>

      <AnimatePresence>
        {nodes.map((node, i) => {
          const left = `${(node.x / 100) * 2000}px`;
          const top = `${(node.y / 100) * 1400}px`;
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.02 }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
            >
              <div
                className={cn(
                  "p-3 rounded-lg shadow-md border border-border bg-card text-card-foreground min-w-[120px] max-w-xs",
                )}
                style={{ backgroundColor: node.color ? node.color : undefined }}
                title={typeof node.label === "string" ? node.label : undefined}
              >
                <div className="font-bold text-sm mb-1">{node.label}</div>
                <div className="text-xs text-card-foreground/80">{node.description}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// -------------------------
// Flowchart: supports nodes with optional positions or auto-grid layout
// -------------------------
export const Flowchart = ({ nodes, edges = [], direction = "TB" }: { nodes: any[], edges?: any[], direction?: "TB" | "LR" }) => {
  // If nodes have no x,y, compute a simple grid layout
  const positioned = useMemo(() => {
    const havePos = nodes.every((n) => typeof n.x === "number" && typeof n.y === "number");
    if (havePos) return nodes;

    // simple auto layout: place in rows of 4
    const cols = 4;
    const gapX = 200;
    const gapY = 140;
    return nodes.map((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...n,
        x: 150 + col * gapX,
        y: 80 + row * gapY,
        width: n.width ?? 160,
        height: n.height ?? 64,
      };
    });
  }, [nodes]);

  const nodeMap = useMemo(() => new Map(positioned.map((p) => [p.id, p])), [positioned]);

  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--border))" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const a = nodeMap.get(e.from);
          const b = nodeMap.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x + (a.width ?? 160) / 2;
          const y1 = a.y + (a.height ?? 64) / 2;
          const x2 = b.x + (b.width ?? 160) / 2;
          const y2 = b.y + (b.height ?? 64) / 2;

          // orthogonal polyline
          const midX = x1 + (x2 - x1) / 2;
          const path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

          return <path key={i} d={path} strokeWidth={2} stroke="hsl(var(--border))" fill="none" markerEnd="url(#flow-arrow)" />;
        })}
      </svg>

      {positioned.map((n) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="absolute"
          style={{ left: n.x, top: n.y, width: n.width, height: n.height, transform: "translate(-50%, -50%)" }}
        >
          <div className="w-full h-full p-4 bg-card rounded-lg shadow-md border border-border hover:shadow-lg transition-shadow flex items-center justify-center">
            <div className="text-sm font-medium text-card-foreground truncate">{n.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// -------------------------
// OrgChart: accepts nodes with parent reference; simple horizontal layout
// -------------------------
export const OrgChart = ({ nodes }: { nodes: any[] }) => {
  // build tree
  const map = useMemo(() => new Map(nodes.map((n) => [n.id, { ...n, children: [] }])), [nodes]);
  useMemo(() => {
    for (const n of map.values()) {
      if (n.parent && map.has(n.parent)) map.get(n.parent).children.push(n.id);
    }
  }, [map]);

  // find roots
  const roots = Array.from(map.values()).filter((n) => !n.parent || !map.has(n.parent));

  // layout: assign depth and order
  const layout: { id: string; depth: number; order: number }[] = [];
  let order = 0;
  const dfs = (id: string, depth = 0) => {
    layout.push({ id, depth, order: order++ });
    const children = map.get(id)?.children ?? [];
    for (const c of children) dfs(c, depth + 1);
  };
  for (const r of roots) dfs(r.id, 0);

  const maxDepth = Math.max(0, ...layout.map((l) => l.depth));

  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker id="org-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--border))" />
          </marker>
        </defs>

        {layout.map((ln) => {
          const node = map.get(ln.id)!;
          const children = node.children;
          const x = 120 + ln.order * 200;
          const y = 80 + ln.depth * 140;
          return (
            <g key={ln.id}>
              {children.map((cid: string) => {
                const childLayout = layout.find((l) => l.id === cid)!;
                const cx = 120 + childLayout.order * 200;
                const cy = 80 + childLayout.depth * 140;
                return (
                  <path key={cid} d={`M ${x} ${y + 28} L ${x} ${(y + cy) / 2} L ${cx} ${(y + cy) / 2} L ${cx} ${cy - 24}`} strokeWidth={2} stroke="hsl(var(--border))" fill="none" markerEnd="url(#org-arrow)" />
                );
              })}
            </g>
          );
        })}
      </svg>

      {layout.map((ln) => {
        const node = map.get(ln.id);
        const x = 120 + ln.order * 200;
        const y = 80 + ln.depth * 140;
        return (
          <motion.div
            key={ln.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute"
            style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
          >
            <div className="p-3 min-w-[140px] text-center rounded-lg shadow-md border border-border bg-card text-card-foreground hover:shadow-lg transition-shadow">
              <div className="text-sm font-semibold truncate">{node!.label}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// -------------------------
// VennDiagram (up to 3 sets) - analytical visual used in education
// -------------------------
export const VennDiagram = ({ sets }: { sets: any[] }) => {
  const s = sets.slice(0, 3);
  const w = 700;
  const h = 420;
  const r = 140;

  // fixed layout positions for up to 3 sets
  const positions = [
    { x: w / 2 - r * 0.8, y: h / 2 },
    { x: w / 2 + r * 0.8, y: h / 2 },
    { x: w / 2, y: h / 2 + r * 0.8 },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="max-w-full">
        <defs>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {s.map((set, i) => (
          <g key={set.id}>
            <circle cx={positions[i].x} cy={positions[i].y} r={r} fill={i === 0 ? "#FDE68A" : i === 1 ? "#A7F3D0" : "#BFDBFE"} fillOpacity={0.6} stroke="hsl(var(--border))" strokeWidth={1} filter="url(#soft)" />
            <text x={positions[i].x} y={positions[i].y - r - 12} textAnchor="middle" className="text-xs font-semibold fill-[hsl(var(--card-foreground))]" style={{ fontSize: 13 }}>
              {set.label}
            </text>
          </g>
        ))}

        {/* optional labels in intersections could be added by computing overlaps */}
      </svg>
    </div>
  );
};

// -------------------------
// Timeline: horizontal timeline for courses and lectures
// -------------------------
export const Timeline = ({ items }: { items: any[] }) => {
  const w = 1600;
  const gap = Math.max(120, Math.floor(w / Math.max(1, items.length)));
  return (
    <div className="relative w-full h-full p-6">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line x1={40} x2={w - 40} y1={120} y2={120} strokeWidth={2} stroke="hsl(var(--border))" />
      </svg>

      <div className="relative w-full" style={{ width: w }}>
        {items.map((it, i) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="absolute top-0"
            style={{ left: 40 + i * gap }}
          >
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-primary border border-border" />
              <div className="mt-3 p-3 bg-card rounded-lg shadow-md border border-border text-card-foreground min-w-[160px] text-sm">
                <div className="font-semibold">{it.label}</div>
                {it.date && <div className="text-xs opacity-70 mt-1">{it.date}</div>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// -------------------------
// USAGE EXAMPLES (copy into your app):
// import { DiagramShell, MindMap, Flowchart, OrgChart, VennDiagram, Timeline } from './diagrams-library';
//
// <DiagramShell width="100%" height="800px">
//   <MindMap nodes={[{id:'c', label:'Central', x:50, y:50}, ...]} edges={[{from:'c',to:'1'}]} />
// </DiagramShell>
//
// The DiagramShell wraps content in a large canvas (2000x1400) and provides pan/zoom controls.
// For very large diagrams, compute node x/y positions in advance (percentage or px) and render only visible clusters
// if you must optimize further (virtualization). This code aims to be robust and extensible for educational & pro use.

// -------------------------
// End of file
// -------------------------
