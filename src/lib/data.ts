
'use server'

import { getDb } from "./db";
import { Binder, Notebook, Page, User } from "./types";

export async function getBinders(userId: number): Promise<Binder[]> {
    const db = await getDb();
    
    // 1. Get user's own binders and their contents
    const binders = await db.all<Binder[]>('SELECT * FROM binders WHERE user_id = ? ORDER BY created_at DESC', userId);

    for (const binder of binders) {
        const notebooks = await db.all<Notebook[]>('SELECT * FROM notebooks WHERE binder_id = ? ORDER BY created_at DESC', binder.id);
        binder.notebooks = notebooks;

        for (const notebook of notebooks) {
            const tags = await db.all<{tag: string}[]>('SELECT tag FROM notebook_tags WHERE notebook_id = ?', notebook.id);
            notebook.tags = tags.map(t => t.tag);
            const pages = await db.all<Page[]>('SELECT id, title, icon, type, notebook_id FROM pages WHERE notebook_id = ? ORDER BY created_at DESC', notebook.id);
            notebook.pages = pages;
        }
    }

    // 2. Get items shared with the user
    const sharedItems = await db.all<any[]>(`
        SELECT 
            s.item_id, s.item_type, s.permission,
            p.title as page_title, p.icon as page_icon, p.type as page_type, p.notebook_id,
            u.name as owner_name
        FROM shares s
        JOIN pages p ON s.item_id = p.id AND s.item_type = 'page'
        JOIN users u ON s.owner_user_id = u.id
        WHERE s.shared_with_user_id = ?
    `, userId);

    if (sharedItems.length > 0) {
        const sharedBinder: Binder = {
            id: 'shared-binder',
            title: 'Shared with me',
            icon: 'Users',
            notebooks: [],
            isShared: true,
        };

        const notebooksByOwner: { [key: string]: Notebook } = {};

        for (const item of sharedItems) {
            if (item.item_type === 'page') {
                const ownerName = item.owner_name;
                if (!notebooksByOwner[ownerName]) {
                    notebooksByOwner[ownerName] = {
                        id: `shared-notebook-${item.owner_user_id}`,
                        title: ownerName,
                        icon: 'User',
                        color: 'bg-gray-400',
                        tags: ['shared'],
                        pages: [],
                        isShared: true,
                    };
                }
                notebooksByOwner[ownerName].pages.push({
                    id: item.item_id,
                    title: item.page_title,
                    icon: item.page_icon,
                    type: item.page_type,
                    notebook_id: item.notebook_id, // This is the original notebook_id
                    isShared: true,
                    permission: item.permission,
                });
            }
        }
        
        sharedBinder.notebooks = Object.values(notebooksByOwner);
        binders.push(sharedBinder);
    }

    return binders;
}

export async function getPage(pageId: string): Promise<Page | null> {
    const db = await getDb();
    const page = await db.get<Page>('SELECT * FROM pages WHERE id = ?', pageId);
    return page || null;
}

export async function getPageAndOwner(pageId: string): Promise<{ page: Page, owner: User } | null> {
    const db = await getDb();
    const result = await db.get<{
        id: string; title: string; icon: string; type: 'document' | 'diagram'; content: string | null;
        owner_id: number; owner_name: string; owner_email: string;
    }>(`
        SELECT p.*, u.id as owner_id, u.name as owner_name, u.email as owner_email
        FROM pages p
        JOIN notebooks n ON p.notebook_id = n.id
        JOIN binders b ON n.binder_id = b.id
        JOIN users u ON b.user_id = u.id
        WHERE p.id = ?
    `, pageId);

    if (!result) return null;
    
    const page: Page = {
        id: result.id,
        title: result.title,
        icon: result.icon,
        type: result.type,
        content: result.content
    };
    
    const owner: User = {
        id: result.owner_id,
        name: result.owner_name,
        email: result.owner_email
    };

    return { page, owner };
}
