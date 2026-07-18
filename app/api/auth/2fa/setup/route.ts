import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import speakeasy from 'speakeasy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const secret = speakeasy.generateSecret({ length: 20 });

    const result = await pool.query('SELECT settings FROM users WHERE userid = $1', [userId]);
    const existing = result.rows[0]?.settings || {};
    const merged = {
      ...existing,
      twoFactor: {
        ...(existing.twoFactor || {}),
        enabled: { base32: secret.base32 },
        pending: null,
      },
    };

    await pool.query('UPDATE users SET settings = $1 WHERE userid = $2', [merged, userId]);

    return NextResponse.json({ base32: secret.base32, otpauth_url: secret.otpauth_url });
  } catch (err: any) {
    console.error('2FA setup error', err);
    return NextResponse.json({ error: err?.message || 'internal error' }, { status: 500 });
  }
}
