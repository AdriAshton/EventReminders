import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const resolvedParams = (typeof (params as any).then === 'function') ? await (params as any) : params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { adminEnabled, required } = body;

    const res = await pool.query('SELECT settings FROM users WHERE userid = $1', [id]);
    const settings = res.rows[0]?.settings || {};
    settings.twoFactor = settings.twoFactor || {};
    if (typeof adminEnabled !== 'undefined') settings.twoFactor.adminEnabled = !!adminEnabled;
    if (typeof required !== 'undefined') settings.twoFactor.required = !!required;

    await pool.query('UPDATE users SET settings = $1 WHERE userid = $2', [settings, id]);
    return NextResponse.json({ message: '2FA admin settings updated' });
  } catch (err: any) {
    console.error('admin 2fa update error', err);
    return NextResponse.json({ error: err?.message || 'internal error' }, { status: 500 });
  }
}
