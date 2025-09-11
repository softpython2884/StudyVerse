import { getPage } from "@/lib/data";
import { PublicPageClient } from "./page-client";
import { AccessDenied } from "@/components/error-pages/access-denied";
import { DocumentNotFound } from "@/components/error-pages/not-found";

export default async function PublicPage({ params }: { params: { pageId: string } }) {
    const { pageId } = params;
    const page = await getPage(pageId);

    if (!page) {
        return <DocumentNotFound />;
    }
    
    if (!page.is_public) {
        return <AccessDenied message="This page is not public. Please ask the owner to share it with you." />;
    }

    // Force view permission for public pages
    page.permission = 'view';

    return (
        <div className="flex flex-col min-h-screen bg-secondary/50">
            <header className="p-4 border-b bg-background text-center">
                <h1 className="text-2xl font-bold font-headline">{page.title}</h1>
                <p className="text-sm text-muted-foreground">This is a public, read-only page.</p>
            </header>
            <main className="flex-1 p-4">
                <PublicPageClient page={page} />
            </main>
        </div>
    );
}
