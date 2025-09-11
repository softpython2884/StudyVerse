
import { getPage } from "@/lib/data";
import { AccessDenied } from "@/components/error-pages/access-denied";
import { DocumentNotFound } from "@/components/error-pages/not-found";
import { Editor } from "@/components/editor";
import type { Page as PageType } from "@/lib/types";

// This is a stripped-down client component to render the read-only editor
function PublicPageClient({ page }: { page: PageType }) {
    // Create a read-only version of the page object
    const readOnlyPage = { ...page, permission: 'view' as const };

    return (
        <div className="h-screen w-screen bg-background">
            <header className="p-4 border-b">
                <h1 className="text-xl font-bold font-headline">{page.title}</h1>
                <p className="text-sm text-muted-foreground">This is a public, read-only page.</p>
            </header>
            <main className="overflow-auto" style={{ height: 'calc(100vh - 73px)'}}>
                 <Editor key={page.id} page={readOnlyPage} />
            </main>
        </div>
    );
}

export default async function PublicPage({ params }: { params: { pageId: string } }) {
    const { pageId } = params;
    const page = await getPage(pageId);

    if (!page) {
        return <DocumentNotFound />;
    }

    if (!page.is_public) {
        return <AccessDenied message="This page is not public. Please ask the owner to share it with you." />;
    }

    return <PublicPageClient page={page} />;
}
