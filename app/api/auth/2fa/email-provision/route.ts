import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import sendgrid from '@sendgrid/mail';
import nodemailer from 'nodemailer';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function sendBySendGrid(to: string, link: string) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY || '');
  const msg = {
    to,
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    subject: '2FA provisioning link',
    text: `Open this link to enable 2FA: ${link}`,
    html: `<p>Open this link to enable 2FA: <a href="${link}">${link}</a></p>`,
  };
  return sendgrid.send(msg);
}

async function sendBySMTP(to: string, link: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@example.com', to, subject: '2FA provisioning link', text: `Open this link to enable 2FA: ${link}`, html: `<p>Open this link to enable 2FA: <a href="${link}">${link}</a></p>` });
}

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

    // send using same provider logic as password reset
    if (process.env.SENDGRID_API_KEY) {
      try { await sendBySendGrid(user.email, link); return NextResponse.json({ message: "If that email exists we'll send a provisioning link." }); } catch (e) { console.error('SendGrid error', e); }
    }
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try { await sendBySMTP(user.email, link); return NextResponse.json({ message: "If that email exists we'll send a provisioning link." }); } catch (e) { console.error('SMTP error', e); }
    }

    console.log(`2FA provisioning link for ${user.email}: ${link}`);
    return NextResponse.json({ message: "If that email exists we'll send a provisioning link." });
  } catch (err: any) {
    console.error('2FA email provision error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
