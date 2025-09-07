'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb } from './db';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function registerUser(data: unknown) {
  const parsed = registerSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, message: 'Invalid input data.' };
  }
  
  const { name, email, password } = parsed.data;
  
  const db = await getDb();

  try {
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existingUser) {
      return { success: false, message: 'User with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      name,
      email,
      hashedPassword
    );

    return { success: true, message: 'User registered successfully.' };

  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
