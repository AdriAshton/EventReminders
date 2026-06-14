import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { readSettings } from '@/lib/appSettings';
import sendgrid from '@sendgrid/mail';
import nodemailer from 'nodemailer';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function sendBySendGrid(to: string, subject: string, text: string, html?: string) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY || '');
  const msg = { to, from: process.env.EMAIL_FROM || 'no-reply@example.com', subject, text, html };
  return sendgrid.send(msg);
}

async function sendBySMTP(to: string, subject: string, text: string, html?: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@example.com', to, subject, text, html });
}

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const result = await pool.query(
    `SELECT u.*, r.rolename AS role
     FROM users u
     JOIN roles r ON r.roleid = u.roleid
     WHERE u.email = $1`,
    [email]
  );
  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ✅ Compare submitted password with stored hash
  const match = await bcrypt.compare(password, user.passwordhash);
  if (!match) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // ✅ Issue JWT
  // Check 2FA settings
  const settings = user.settings || {};
  const twoFactorEnabled = settings?.twoFactor?.enabled;
  const adminRequired = settings?.twoFactor?.required || settings?.twoFactor?.adminEnabled;
  let globalRequired = false;

  // Check global enforcement
  try {
    const appSettings = readSettings();
    globalRequired = !!appSettings?.twoFactorGlobal;
  } catch (e) {
    // ignore errors reading settings
  }

  if (twoFactorEnabled || adminRequired || globalRequired) {
    // generate a numeric one-time code and email it to the user
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 1000 * 60 * 5).toISOString(); // 5 minutes

    const settings = user.settings || {};
    settings.twoFactor = settings.twoFactor || {};
    settings.twoFactor.emailCode = { code, expires };
    await pool.query('UPDATE users SET settings = $1 WHERE userid = $2', [settings, user.userid]);

    const subject = 'Your login verification code';
    const text = `Your verification code is: ${code}. It expires in 5 minutes.`;
    const html = `<p>Your verification code is: <strong>${code}</strong>. It expires in 5 minutes.</p>`;

    // Decide sending mechanism: prefer SMTP in dev when MAILTRAP_ONLY=true
    try {
      const preferSmtp = String(process.env.MAILTRAP_ONLY) === 'true';
      if (preferSmtp && process.env.SMTP_HOST) {
        console.log('MAILTRAP_ONLY=true — sending 2FA code via SMTP');
        await sendBySMTP(user.email, subject, text, html);
        console.log('SMTP send attempted for', user.email);
      } else if (process.env.SENDGRID_API_KEY && !preferSmtp) {
        console.log('Sending 2FA code via SendGrid');
        await sendBySendGrid(user.email, subject, text, html);
        console.log('SendGrid send attempted for', user.email);
      } else if (process.env.SMTP_HOST) {
        console.log('Sending 2FA code via SMTP (fallback)');
        await sendBySMTP(user.email, subject, text, html);
        console.log('SMTP send attempted for', user.email);
      } else {
        console.log(`2FA code for ${user.email}: ${code}`);
      }
    } catch (err) {
      console.error('Error sending 2FA code', err);
    }

    // Signal to client that a 2FA step is required. Do not issue full session token yet.
    return NextResponse.json({ twoFactorRequired: true, userid: user.userid });
  }

  // ✅ Issue JWT
  const token = jwt.sign(
    { userid: user.userid, companyid: user.companyid, role: user.role, username: user.username },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  console.log("JWT_SECRET:", process.env.JWT_SECRET);
  const response = NextResponse.json({ message: "Login successful", token });
  response.cookies.set("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
