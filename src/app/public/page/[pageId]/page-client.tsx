"use client";

import { Editor } from "@/components/editor";
import type { Page } from "@/lib/types";

export function PublicPageClient({ page }: { page: Page }) {
    return (
        <div className="bg-background rounded-lg shadow-sm">
             <Editor page={page} />
        </div>
    );
}
