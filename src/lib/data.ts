
'use server'

import { getDb } from "./db";
import { Binder, Notebook, Page } from "./types";

export async function getBinders(userId: number): Promise<Binder[]> {
    const db = await getDb();
    const binders = await db.all<Binder[]>('SELECT * FROM binders WHERE user_id = ? ORDER BY created_at DESC', userId);

    for (const binder of binders) {
        const notebooks = await db.all<Notebook[]>('SELECT * FROM notebooks WHERE binder_id = ? ORDER BY created_at DESC', binder.id);
        binder.notebooks = notebooks;

        for (const notebook of notebooks) {
            const tags = await db.all<{tag: string}[]>('SELECT tag FROM notebook_tags WHERE notebook_id = ?', notebook.id);
            notebook.tags = tags.map(t => t.tag);
            const pages = await db.all<Page[]>('SELECT id, title, icon, type FROM pages WHERE notebook_id = ? ORDER BY created_at DESC', notebook.id);
            notebook.pages = pages;
        }
    }

    return binders;
}

export async function getPage(pageId: string): Promise<Page | null> {
    const db = await getDb();
    const page = await db.get<Page>('SELECT * FROM pages WHERE id = ?', pageId);
    return page || null;
}
