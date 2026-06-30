import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const loginEmail = String(email || '').trim();

  const result = await pool.query(
    `SELECT u.userid, u.companyid, u.username, u.passwordhash, u.email, u.roleid, u.settings,
            r.rolename AS role
     FROM users u
     INNER JOIN roles r ON r.roleid = u.roleid
     WHERE u.email = $1`,
    [loginEmail]
  );
  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.roleid || !user.role) {
    return NextResponse.json({ error: "A valid role is required to log in" }, { status: 403 });
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
  if (twoFactorEnabled) {
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

    try {
      await sendEmail({ to: loginEmail || user.email, subject, text, html });
    } catch (err) {
      console.error('Error sending 2FA code', err);
      console.log(`2FA code for ${user.email}: ${code}`);
    }

    // Signal to client that a 2FA step is required. Do not issue full session token yet.
    return NextResponse.json({ twoFactorRequired: true, userid: user.userid });
  }

  // ✅ Issue JWT
  const token = jwt.sign(
    { userid: user.userid, companyid: user.companyid, roleid: user.roleid, role: user.role, username: user.username },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  const response = NextResponse.json({
    message: "Login successful",
    token,
    user: {
      userid: user.userid,
      companyid: user.companyid,
      username: user.username,
      email: user.email,
      roleid: user.roleid,
      role: user.role,
    },
  });
  response.cookies.set("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
