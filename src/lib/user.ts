'use server';

import 'server-only';
import { getDb } from './db';
import { getSession } from './session';
import type { User } from './types';

export async function getCurrentUser(): Promise<User | null> {
    const session = await getSession();
    if (!session?.userId) return null;

    try {
        const db = await getDb();
        const user = await db.get<User>('SELECT id, name, email, avatarUrl FROM users WHERE id = ?', session.userId);
        return user || null;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        return null;
    }
}
