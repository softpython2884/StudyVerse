
"use client";

import React from 'react';
import { DiagramShell, MindMap, Flowchart, OrgChart } from './diagrams/diagrams_library';

interface DiagramRendererProps {
    type: string;
    initialNodes: any[];
    initialEdges: any[];
}

export function DiagramRenderer({ type, initialNodes, initialEdges }: DiagramRendererProps) {
    const renderDiagram = () => {
        switch (type) {
            case 'MindMap':
                return <MindMap nodes={initialNodes} edges={initialEdges} />;
            case 'Flowchart':
                return <Flowchart nodes={initialNodes} edges={initialEdges} />;
            case 'OrgChart':
                // OrgChart may have a different data structure, adapt if necessary
                return <OrgChart nodes={initialNodes} />;
            default:
                return <MindMap nodes={initialNodes} edges={initialEdges} />;
        }
    };

    return (
        <DiagramShell height="400px" width="100%">
            {renderDiagram()}
        </DiagramShell>
    );
}
