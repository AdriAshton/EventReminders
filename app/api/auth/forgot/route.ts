import { NextResponse } from "next/server";
import pool from "@/lib/db";
import crypto from "crypto";
import sendgrid from "@sendgrid/mail";
import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function sendBySendGrid(to: string, link: string) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY || "");
  const msg = {
    to,
    from: process.env.EMAIL_FROM || "no-reply@example.com",
    subject: "Password reset instructions",
    text: `Reset your password: ${link}`,
    html: `<p>Reset your password: <a href="${link}">${link}</a></p>`,
  };
  return sendgrid.send(msg);
}

async function sendBySMTP(to: string, link: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to,
    subject: 'Password reset instructions',
    text: `Reset your password: ${link}`,
    html: `<p>Reset your password: <a href="${link}">${link}</a></p>`,
  });
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const userRes = await pool.query(`SELECT userid, email, settings FROM users WHERE email = $1 LIMIT 1`, [email.trim()]);
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ message: "If that email exists we'll send reset instructions." });

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    const settings = user.settings || {};
    settings.passwordReset = { token, expires };

    await pool.query(`UPDATE users SET settings = $1 WHERE userid = $2`, [settings, user.userid]);

    const link = `${APP_URL}/reset/${token}`;

    // Try SendGrid
    if (process.env.SENDGRID_API_KEY) {
      try {
        await sendBySendGrid(user.email, link);
        return NextResponse.json({ message: "If that email exists we'll send reset instructions." });
      } catch (e) {
        console.error('SendGrid error', e);
      }
    }

    // Try SMTP
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        await sendBySMTP(user.email, link);
        return NextResponse.json({ message: "If that email exists we'll send reset instructions." });
      } catch (e) {
        console.error('SMTP error', e);
      }
    }

    // Fallback: log link and return generic message. Never include the link in responses.
    console.log(`Password reset link for ${user.email}: ${link}`);
    return NextResponse.json({ message: "If that email exists we'll send reset instructions." });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
