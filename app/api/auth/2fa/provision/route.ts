import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const res = await pool.query("SELECT userid, email, settings FROM users WHERE settings->'twoFactor' IS NOT NULL");
    // Find user with matching provision token
    let found: any = null;
    for (const row of res.rows) {
      const settings = row.settings || {};
      const provision = settings?.twoFactor?.provision;
      if (provision?.token === token) { found = { row, settings }; break; }
    }

    if (!found) return NextResponse.json({ error: 'invalid or expired token' }, { status: 400 });

    const { row, settings } = found;
    const provision = settings.twoFactor.provision;
    if (new Date(provision.expires) < new Date()) return NextResponse.json({ error: 'token expired' }, { status: 400 });

    // move pending -> enabled
    const pending = settings.twoFactor.pending;
    if (!pending) return NextResponse.json({ error: 'no pending secret' }, { status: 400 });
    settings.twoFactor.enabled = { base32: pending.base32 };
    settings.twoFactor.pending = null;
    settings.twoFactor.provision = null;

    await pool.query('UPDATE users SET settings = $1 WHERE userid = $2', [settings, row.userid]);

    return NextResponse.redirect(new URL('/settings/2fa?provisioned=1', url).toString());
  } catch (err: any) {
    console.error('2FA provision error', err);
    return NextResponse.json({ error: err?.message || 'internal error' }, { status: 500 });
  }
}
