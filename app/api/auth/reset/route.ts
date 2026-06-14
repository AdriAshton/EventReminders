import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: "Token and password are required" }, { status: 400 });

    const res = await pool.query(`SELECT userid, settings FROM users WHERE settings->'passwordReset'->>'token' = $1 LIMIT 1`, [token]);
    const user = res.rows[0];
    if (!user) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

    const pr = user.settings?.passwordReset || {};
    if (!pr.expires || new Date(pr.expires) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    // clear passwordReset
    const settings = user.settings || {};
    delete settings.passwordReset;

    await pool.query(`UPDATE users SET passwordhash = $1, settings = $2 WHERE userid = $3`, [hash, settings, user.userid]);

    return NextResponse.json({ message: "Password updated" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
