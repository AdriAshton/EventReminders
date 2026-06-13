import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

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
