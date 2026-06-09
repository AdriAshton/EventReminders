import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
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
  const token = jwt.sign(
    { userid: user.userid, companyid: user.companyid, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  console.log("JWT_SECRET:", process.env.JWT_SECRET);
  return NextResponse.json({ message: "Login successful", token });
}
