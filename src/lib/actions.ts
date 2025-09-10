
'use server'

import { z } from 'zod';
import { getDb } from './db';
import { protectedRoute } from './session';
import { revalidatePath } from 'next/cache';
import { generateDiagram } from '@/ai/flows/generate-diagrams-from-text';

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
    const icon = type === 'diagram' ? 'Network' : 'FileText';

    try {
        await db.run('INSERT INTO pages (id, notebook_id, title, icon, type, content) VALUES (?, ?, ?, ?, ?, ?)', id, notebookId, title, icon, type, '');
        revalidatePath('/dashboard');
        return { success: true, message: 'Page created.', pageId: id };
    } catch (error) {
        console.error("Failed to create page:", error);
        return { success: false, message: 'Database error.' };
    }
}

const CreatePageWithDiagramSchema = z.object({
    notebookId: z.string(),
    diagramTitle: z.string().min(1),
    diagramType: z.enum(['MindMap', 'Flowchart', 'OrgChart']),
    generationText: z.string(),
    generationPrompt: z.string().min(1),
});

export async function createPageWithDiagram(values: z.infer<typeof CreatePageWithDiagramSchema>) {
    await protectedRoute();
    const { notebookId, diagramTitle, diagramType, generationText, generationPrompt } = values;

    try {
        // 1. Generate diagram data from AI
        const diagramData = await generateDiagram({
            text: `${generationText}\n\nPROMPT: ${generationPrompt}`,
            diagramType: diagramType
        });

        // 2. Create a new page for this diagram
        const db = await getDb();
        const pageId = `page-${Date.now()}`;
        const icon = 'Network';
        
        await db.run(
            'INSERT INTO pages (id, notebook_id, title, icon, type, content) VALUES (?, ?, ?, ?, ?, ?)', 
            pageId, 
            notebookId, 
            diagramTitle, 
            icon, 
            'diagram', 
            diagramData.diagramData
        );

        revalidatePath('/dashboard');
        return { success: true, pageId: pageId, message: 'Diagram page created.' };
    } catch (error: any) {
        console.error("Failed to create page with diagram:", error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
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
    await protectedRoute();
    
    const validatedFields = UpdatePageContentSchema.safeParse(values);
    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data.' };
    }
    const { pageId, content } = validatedFields.data;
    
    const db = await getDb();
    
    try {
        await db.run('UPDATE pages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', content, pageId);
        revalidatePath(`/dashboard`); // Revalidate the whole dashboard to update sidebar if needed
        return { success: true, message: 'Content saved.' };
    } catch (error) {
        console.error("Failed to update page content:", error);
        return { success: false, message: 'Database error.' };
    }
}
