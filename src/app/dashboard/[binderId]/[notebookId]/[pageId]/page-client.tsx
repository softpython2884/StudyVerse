"use client";

import { Editor } from "@/components/editor";
import { DiagramEditor } from "@/components/diagram-editor";
import { ReactFlowProvider } from "reactflow";
import type { Page } from "@/lib/types";

export function PageClient({ page, pageId }: { page: Page | null, pageId: string }) {
    if (!page) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Page not found.</p>
            </div>
        );
    }

    if (page.type === "diagram") {
        return (
            <ReactFlowProvider>
                <DiagramEditor key={pageId} page={page} />
            </ReactFlowProvider>
        );
    }

    return <Editor key={pageId} page={page} />;
}
