import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const db = await getDb();

    const user = await db.get('SELECT * FROM users WHERE email = ?', email);

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }
    
    await createSession(user.id);

    return NextResponse.json({ message: 'Logged in successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
