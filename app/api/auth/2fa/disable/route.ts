import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const res = await pool.query('SELECT settings FROM users WHERE userid = $1', [userId]);
    const settings = res.rows[0]?.settings || {};
    settings.twoFactor = settings.twoFactor || {};
    settings.twoFactor.enabled = null;
    settings.twoFactor.pending = null;
    settings.twoFactor.emailCode = null;

    await pool.query('UPDATE users SET settings = $1 WHERE userid = $2', [settings, userId]);
    return NextResponse.json({ message: '2FA disabled for account' });
  } catch (err: any) {
    console.error('2FA disable error', err);
    return NextResponse.json({ error: err?.message || 'internal error' }, { status: 500 });
  }
}