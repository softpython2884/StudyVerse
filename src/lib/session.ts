'use server';

import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from './db';
import type { User } from './types';


const secretKey = process.env.SESSION_SECRET || 'fallback-secret-key-for-development-and-build';
if (!secretKey) {
  throw new Error('SESSION_SECRET is not defined in the environment variables.');
}
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setNotBefore(payload.nbf)
    .setExpirationTime(payload.exp)
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

export async function createSession(userId: number, durationInDays: number = 30) {
    const now = Math.floor(Date.now() / 1000);
    // if duration is -1, set it to 10 years, otherwise use the provided days
    const durationInSeconds = durationInDays === -1 
        ? 10 * 365 * 24 * 60 * 60 
        : durationInDays * 24 * 60 * 60;
    
    const expires = new Date(Date.now() + durationInSeconds * 1000);

    const sessionPayload = {
        userId,
        iat: now,
        nbf: now,
        exp: now + durationInSeconds,
    };
    
    const session = await encrypt(sessionPayload);

    cookies().set('session', session, { expires, httpOnly: true });
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  const session = await decrypt(sessionCookie);
  if (!session || !session.userId) return null;

  // The 'exp' check is handled by jwtVerify, so we just need to check for existence
  return session;
}

export async function deleteSession() {
  cookies().delete('session');
}

export async function protectedRoute() {
    const session = await getSession();
    if (!session?.userId) {
        redirect('/login');
    }
    
    const db = await getDb();
    const user = await db.get<User>('SELECT id, name, email FROM users WHERE id = ?', session.userId);

    if (!user) {
        redirect('/login');
    }
    return user;
}
