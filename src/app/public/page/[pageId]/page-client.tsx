
"use client";

import { Editor } from "@/components/editor";
import type { Page } from "@/lib/types";

export function PublicPageClient({ page, pageId }: { page: Page | null, pageId: string }) {
    if (!page) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Page not found.</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-background">
             <Editor key={pageId} page={page} />
        </div>
    );
}
