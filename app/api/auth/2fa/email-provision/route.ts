import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const userRes = await pool.query('SELECT userid, email, settings FROM users WHERE email = $1 LIMIT 1', [email.trim()]);
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ message: "If that email exists we'll send a provisioning link." });

    const secretBase32 = crypto.randomBytes(20).toString('hex').slice(0, 32);
    const provisionToken = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 15).toISOString(); // 15 minutes

    const settings = user.settings || {};
    settings.twoFactor = settings.twoFactor || {};
    settings.twoFactor.pending = { base32: secretBase32 };
    settings.twoFactor.provision = { token: provisionToken, expires };

    await pool.query('UPDATE users SET settings = $1 WHERE userid = $2', [settings, user.userid]);

    const link = `${APP_URL}/api/auth/2fa/provision?token=${provisionToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: '2FA provisioning link',
        text: `Open this link to enable 2FA: ${link}`,
        html: `<p>Open this link to enable 2FA: <a href="${link}">${link}</a></p>`,
      });
      return NextResponse.json({ message: "If that email exists we'll send a provisioning link." });
    } catch (e) {
      console.error('Email send error', e);
    }

    console.log(`2FA provisioning link for ${user.email}: ${link}`);
    return NextResponse.json({ message: "If that email exists we'll send a provisioning link." });
  } catch (err: unknown) {
    console.error('2FA email provision error', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
