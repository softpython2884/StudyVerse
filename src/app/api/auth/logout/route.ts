import { deleteSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function POST() {
  await deleteSession();
  return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
}
