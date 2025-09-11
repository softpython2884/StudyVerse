
import { getPageAndOwner } from "@/lib/data";
import { PageClient } from "./page-client";
import { protectedRoute } from "@/lib/session";
import { getDb } from "@/lib/db";
import { DocumentNotFound } from "@/components/error-pages/not-found";
import { AccessDenied } from "@/components/error-pages/access-denied";

export default async function Page({ params }: { params: { binderId: string, notebookId: string, pageId: string } }) {
    const user = await protectedRoute();
    const { pageId } = params;

    const pageData = await getPageAndOwner(pageId);
    
    if (!pageData) {
        return <DocumentNotFound />;
    }

    const { page, owner } = pageData;

    let hasPermission = false;
    let permissionType: 'view' | 'edit' | 'owner' = 'view';

    // 1. Check if the current user is the owner
    if (owner.id === user.id) {
        hasPermission = true;
        permissionType = 'owner';
    } else {
        // 2. If not the owner, check the shares table
        const db = await getDb();
        const share = await db.get('SELECT permission FROM shares WHERE item_id = ? AND shared_with_user_id = ?', pageId, user.id);
        if (share) {
            hasPermission = true;
            permissionType = share.permission;
        }
    }
    
    if (!hasPermission) {
        return <AccessDenied />;
    }

    // Add permission to the page object to pass to client
    page.permission = permissionType === 'owner' ? 'edit' : permissionType;

    return <PageClient page={page} pageId={pageId} />;
}
