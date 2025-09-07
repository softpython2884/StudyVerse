'use server';

import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from './types';
import { getDb } from './db';

const secretKey = process.env.SESSION_SECRET || 'your-fallback-secret-key';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Token expires in 1 hour
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // This can happen if the token is expired or invalid
    return null;
  }
}

export async function createSession(userId: number) {
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const session = await encrypt({ userId, expires });

    cookies().set('session', session, { expires, httpOnly: true });
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  const session = await decrypt(sessionCookie);
  if (!session || !session.userId) return null;

  // Check if the session is expired
  if (new Date(session.expires) < new Date()) {
    return null;
  }

  return session;
}

export async function getCurrentUser(): Promise<User | null> {
    const session = await getSession();
    if (!session?.userId) return null;

    try {
        const db = await getDb();
        const user = await db.get<User>('SELECT id, name, email FROM users WHERE id = ?', session.userId);
        return user || null;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        return null;
    }
}

export async function deleteSession() {
  cookies().delete('session');
}

export async function protectedRoute() {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/login');
    }
    return user;
}
