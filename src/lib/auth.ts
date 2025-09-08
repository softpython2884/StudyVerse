'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { createSession } from './session';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  sessionDuration: z.string(),
});

export async function registerUser(data: unknown) {
  const parsed = registerSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, message: 'Invalid input data.' };
  }
  
  const { name, email, password, sessionDuration } = parsed.data;
  const durationInDays = parseInt(sessionDuration, 10);

  const db = await getDb();

  try {
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existingUser) {
      return { success: false, message: 'User with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      name,
      email,
      hashedPassword
    );
    
    const userId = result.lastID;
    if (!userId) {
        return { success: false, message: 'Failed to retrieve user ID after registration.' };
    }

    // Auto-login the user
    await createSession(userId, durationInDays);


    return { success: true, message: 'User registered successfully.' };

  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
