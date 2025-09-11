

'use server'

import { z } from 'zod';
import { getDb } from './db';
import { protectedRoute } from './session';
import { revalidatePath } from 'next/cache';
import { getPageAndOwner } from './data';
import { User } from './types';

// --- Binder Actions ---
const CreateBinderSchema = z.object({
  title: z.string().min(1, "Title is required."),
});

export async function createBinder(values: z.infer<typeof CreateBinderSchema>) {
    const user = await protectedRoute();

    const validatedFields = CreateBinderSchema.safeParse(values);
    if (!validatedFields.success) {
        return { success: false, message: 'Invalid title.' };
    }
    const { title } = validatedFields.data;

    const db = await getDb();
    const id = `binder-${Date.now()}`;
    const icon = "FolderKanban"; // Default icon

    try {
        await db.run('INSERT INTO binders (id, user_id, title, icon) VALUES (?, ?, ?, ?)', id, user.id, title, icon);
        revalidatePath('/dashboard');
        return { success: true, message: 'Binder created.' };
    } catch (error) {
        console.error("Failed to create binder:", error);
        return { success: false, message: 'Database error.' };
    }
}

const RenameBinderSchema = z.object({
    id: z.string(),
    newTitle: z.string().min(1, "Title is required."),
});

export async function renameBinder(values: z.infer<typeof RenameBinderSchema>) {
    await protectedRoute();
    const { id, newTitle } = values;
    const db = await getDb();
    try {
        await db.run('UPDATE binders SET title = ? WHERE id = ?', newTitle, id);
        revalidatePath('/dashboard');
        return { success: true, message: 'Binder renamed.' };
    } catch (error) {
        console.error("Failed to rename binder:", error);
        return { success: false, message: 'Database error.' };
    }
}

const DeleteBinderSchema = z.object({ id: z.string() });

export async function deleteBinder(values: z.infer<typeof DeleteBinderSchema>) {
    await protectedRoute();
    const { id } = values;
    const db = await getDb();
    try {
        await db.run('DELETE FROM binders WHERE id = ?', id);
        revalidatePath('/dashboard');
        return { success: true, message: 'Binder deleted.' };
    } catch (error) {
        console.error("Failed to delete binder:", error);
        return { success: false, message: 'Database error.' };
    }
}


// --- Notebook Actions ---
const CreateNotebookSchema = z.object({
  title: z.string().min(1, "Title is required."),
  binderId: z.string(),
  color: z.string(),
  tags: z.array(z.string()),
});

export async function createNotebook(values: z.infer<typeof CreateNotebookSchema>) {
    await protectedRoute();
    
    const validatedFields = CreateNotebookSchema.safeParse(values);
    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data.' };
    }
    const { title, binderId, color, tags } = validatedFields.data;

    const db = await getDb();
    const id = `notebook-${Date.now()}`;
    const icon = "BookOpen"; // Default icon

    try {
        await db.run('INSERT INTO notebooks (id, binder_id, title, icon, color) VALUES (?, ?, ?, ?, ?)', id, binderId, title, icon, color);
        for (const tag of tags) {
            await db.run('INSERT INTO notebook_tags (notebook_id, tag) VALUES (?, ?)', id, tag);
        }
        revalidatePath('/dashboard');
        return { success: true, message: 'Notebook created.' };
    } catch (error) {
        console.error("Failed to create notebook:", error);
        return { success: false, message: 'Database error.' };
    }
}

const RenameNotebookSchema = z.object({
    id: z.string(),
    newTitle: z.string().min(1, "Title is required."),
});

export async function renameNotebook(values: z.infer<typeof RenameNotebookSchema>) {
    await protectedRoute();
    const { id, newTitle } = values;
    const db = await getDb();
    try {
        await db.run('UPDATE notebooks SET title = ? WHERE id = ?', newTitle, id);
        revalidatePath('/dashboard');
        return { success: true, message: 'Notebook renamed.' };
    } catch (error) {
        console.error("Failed to rename notebook:", error);
        return { success: false, message: 'Database error.' };
    }
}

const DeleteNotebookSchema = z.object({ id: z.string() });

export async function deleteNotebook(values: z.infer<typeof DeleteNotebookSchema>) {
    await protectedRoute();
    const { id } = values;
    const db = await getDb();
    try {
        await db.run('DELETE FROM notebooks WHERE id = ?', id);
        revalidatePath('/dashboard');
        return { success: true, message: 'Notebook deleted.' };
    } catch (error) {
        console.error("Failed to delete notebook:", error);
        return { success: false, message: 'Database error.' };
    }
}


// --- Page Actions ---
const CreatePageSchema = z.object({
  title: z.string().min(1, "Title is required."),
  notebookId: z.string(),
  type: z.enum(['document', 'diagram']),
});

export async function createPage(values: z.infer<typeof CreatePageSchema>) {
    await protectedRoute();
    
    const validatedFields = CreatePageSchema.safeParse(values);
    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data.' };
    }
    const { title, notebookId, type } = validatedFields.data;

    const db = await getDb();
    const id = `page-${Date.now()}`;
    // Force 'document' type and 'FileText' icon as diagrams are now inline
    const pageType = 'document';
    const icon = 'FileText';

    try {
        await db.run('INSERT INTO pages (id, notebook_id, title, icon, type, content) VALUES (?, ?, ?, ?, ?, ?)', id, notebookId, title, icon, pageType, '');
        revalidatePath('/dashboard');
        return { success: true, message: 'Page created.', pageId: id };
    } catch (error) {
        console.error("Failed to create page:", error);
        return { success: false, message: 'Database error.' };
    }
}

const RenamePageSchema = z.object({
    id: z.string(),
    newTitle: z.string().min(1, "Title is required."),
});

export async function renamePage(values: z.infer<typeof RenamePageSchema>) {
    await protectedRoute();
    const { id, newTitle } = values;
    const db = await getDb();
    try {
        await db.run('UPDATE pages SET title = ? WHERE id = ?', newTitle, id);
        revalidatePath('/dashboard');
        return { success: true, message: 'Page renamed.' };
    } catch (error) {
        console.error("Failed to rename page:", error);
        return { success: false, message: 'Database error.' };
    }
}

const DeletePageSchema = z.object({ id: z.string() });

export async function deletePage(values: z.infer<typeof DeletePageSchema>) {
    await protectedRoute();
    const { id } = values;
    const db = await getDb();
    try {
        await db.run('DELETE FROM pages WHERE id = ?', id);
        revalidatePath('/dashboard');
        return { success: true, message: 'Page deleted.' };
    } catch (error) {
        console.error("Failed to delete page:", error);
        return { success: false, message: 'Database error.' };
    }
}

const UpdatePageContentSchema = z.object({
    pageId: z.string(),
    content: z.string(),
});

export async function updatePageContent(values: z.infer<typeof UpdatePageContentSchema>) {
    const user = await protectedRoute();
    const { pageId, content } = values;
    
    const db = await getDb();

    // Check if the user has permission to edit this page
    const pageData = await getPageAndOwner(pageId);
    if (!pageData) {
        return { success: false, message: "Page not found." };
    }
    
    let hasPermission = false;
    if (pageData.owner.id === user.id) {
        hasPermission = true;
    } else {
        const share = await db.get('SELECT permission FROM shares WHERE item_id = ? AND shared_with_user_id = ?', pageId, user.id);
        if (share?.permission === 'edit') {
            hasPermission = true;
        }
    }

    if (!hasPermission) {
        return { success: false, message: "You don't have permission to edit this page." };
    }
    
    try {
        await db.run('UPDATE pages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', content, pageId);
        revalidatePath(`/dashboard`); // Revalidate the whole dashboard to update sidebar if needed
        return { success: true, message: 'Content saved.' };
    } catch (error) {
        console.error("Failed to update page content:", error);
        return { success: false, message: 'Database error.' };
    }
}

const UpdatePagePublicAccessSchema = z.object({
  pageId: z.string(),
  isPublic: z.boolean(),
});

export async function updatePagePublicAccess(values: z.infer<typeof UpdatePagePublicAccessSchema>) {
    const user = await protectedRoute();
    const { pageId, isPublic } = values;
    const db = await getDb();

    const pageData = await getPageAndOwner(pageId);
    if (!pageData || pageData.owner.id !== user.id) {
        return { success: false, message: "You don't have permission to modify this page." };
    }

    try {
        await db.run('UPDATE pages SET is_public = ? WHERE id = ?', isPublic ? 1 : 0, pageId);
        revalidatePath(`/public/page/${pageId}`);
        revalidatePath('/dashboard');
        return { success: true, message: `Page is now ${isPublic ? 'public' : 'private'}.` };
    } catch (error) {
        console.error("Failed to update public access:", error);
        return { success: false, message: 'Database error.' };
    }
}

// --- Generic Sharing Actions ---

const ShareItemSchema = z.object({
  itemId: z.string(),
  itemType: z.enum(['page', 'notebook', 'binder']),
  email: z.string().email("Invalid email address."),
  permission: z.enum(['view', 'edit']),
});

async function shareItem(values: z.infer<typeof ShareItemSchema>) {
    const currentUser = await protectedRoute();
    const { itemId, itemType, email, permission } = values;

    const db = await getDb();

    // 1. Verify current user owns the item
    let owner;
    if (itemType === 'page') {
        const pageData = await getPageAndOwner(itemId);
        owner = pageData?.owner;
    } else if (itemType === 'notebook') {
        const notebookOwner = await db.get(`
            SELECT u.* FROM users u
            JOIN binders b ON u.id = b.user_id
            JOIN notebooks n ON b.id = n.binder_id
            WHERE n.id = ?
        `, itemId);
        owner = notebookOwner;
    } else if (itemType === 'binder') {
        const binderOwner = await db.get(`
            SELECT u.* FROM users u
            JOIN binders b ON u.id = b.user_id
            WHERE b.id = ?
        `, itemId);
        owner = binderOwner;
    }

    if (!owner || owner.id !== currentUser.id) {
        return { success: false, message: `You can only share ${itemType}s you own.` };
    }

    // 2. Find the user to share with
    const sharedWithUser = await db.get<User>('SELECT id FROM users WHERE email = ?', email);
    if (!sharedWithUser) {
        return { success: false, message: "User with that email does not exist." };
    }
    if (sharedWithUser.id === currentUser.id) {
        return { success: false, message: "You cannot share an item with yourself." };
    }

    // 3. Insert or update the share record
    try {
        await db.run(
            `INSERT INTO shares (item_id, item_type, owner_user_id, shared_with_user_id, permission) 
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(item_id, shared_with_user_id) 
             DO UPDATE SET permission = excluded.permission`,
            itemId, itemType, currentUser.id, sharedWithUser.id, permission
        );
        revalidatePath('/dashboard');
        return { success: true, message: `Successfully shared ${itemType} with ${email}.` };
    } catch (error) {
        console.error(`Failed to share ${itemType}:`, error);
        return { success: false, message: `Database error occurred during ${itemType} sharing.` };
    }
}

export async function sharePage(values: Omit<z.infer<typeof ShareItemSchema>, 'itemType'> & { pageId: string }) {
    return shareItem({ ...values, itemId: values.pageId, itemType: 'page' });
}

export async function shareNotebook(values: Omit<z.infer<typeof ShareItemSchema>, 'itemType'> & { notebookId: string }) {
    return shareItem({ ...values, itemId: values.notebookId, itemType: 'notebook' });
}

export async function shareBinder(values: Omit<z.infer<typeof ShareItemSchema>, 'itemType'> & { binderId: string }) {
    return shareItem({ ...values, itemId: values.binderId, itemType: 'binder' });
}

// --- Notification Actions ---

const MarkNotificationAsReadSchema = z.object({
  notificationId: z.number(),
});

export async function markNotificationAsRead(values: z.infer<typeof MarkNotificationAsReadSchema>) {
    const user = await protectedRoute();
    const { notificationId } = values;
    const db = await getDb();

    try {
        await db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', notificationId, user.id);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
        return { success: false, message: 'Database error.' };
    }
}

export async function markAllNotificationsAsRead() {
    const user = await protectedRoute();
    const db = await getDb();
    try {
        await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', user.id);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        return { success: false, message: 'Database error.' };
    }
}
