import { NextResponse } from "next/server";
import pool from "@/lib/db";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

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

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password reset instructions',
        text: `Reset your password: ${link}`,
        html: `<p>Reset your password: <a href="${link}">${link}</a></p>`,
      });
      return NextResponse.json({ message: "If that email exists we'll send reset instructions." });
    } catch (e) {
      console.error('Email send error', e);
    }

    // Fallback: log link and return generic message. Never include the link in responses.
    console.log(`Password reset link for ${user.email}: ${link}`);
    return NextResponse.json({ message: "If that email exists we'll send reset instructions." });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
