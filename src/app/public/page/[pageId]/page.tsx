
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
        return <AccessDenied 
                    title="Access Denied" 
                    message="This page is not public. Please ask the owner to share it with you."
                />;
    }
    
    // Public pages are always view-only
    page.permission = 'view';

    return <PublicPageClient page={page} pageId={pageId} />;
}
