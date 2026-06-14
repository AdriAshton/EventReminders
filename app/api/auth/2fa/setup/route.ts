import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import speakeasy from 'speakeasy';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const secret = speakeasy.generateSecret({ length: 20 });

    // store secret in users.settings.twoFactor.pending
    const settingsUpdate = { twoFactor: { pending: { base32: secret.base32, otpauth_url: secret.otpauth_url } } };
    await pool.query("UPDATE users SET settings = COALESCE(settings, '{}'::jsonb) || $1 WHERE userid = $2", [settingsUpdate, userId]);

    return NextResponse.json({ base32: secret.base32, otpauth_url: secret.otpauth_url });
  } catch (err: any) {
    console.error('2FA setup error', err);
    return NextResponse.json({ error: err?.message || 'internal error' }, { status: 500 });
  }
}
