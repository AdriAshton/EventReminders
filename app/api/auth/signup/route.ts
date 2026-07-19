import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import pool from "@/lib/db";

export async function POST(req: Request) {
  const { username, email, password } = await req.json();

  // ✅ Basic validation
  if (!username || !email || !password) {
    return NextResponse.json(
      { error: "Username, email, and password are required" },
      { status: 400 }
    );
  }

  try {
    // ✅ Hash the password before saving
    const hash = await bcrypt.hash(password, 10);

    const existingUsernameResult = await pool.query(
      `SELECT userid FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [username.trim()]
    );

    if (existingUsernameResult.rows[0]) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    // ✅ Insert into users table
    const defaultRoleResult = await pool.query(
      `SELECT roleid FROM roles WHERE rolename = 'Staff' LIMIT 1`
    );

    const defaultRoleId = defaultRoleResult.rows[0]?.roleid;
    if (!defaultRoleId) {
      return NextResponse.json({ error: "Default role not found" }, { status: 500 });
    }

    await pool.query(
      `INSERT INTO users (username, email, passwordhash, roleid) 
       VALUES ($1, $2, $3, $4)`,
      [username.trim(), email.trim(), hash, defaultRoleId]
    );

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Database error:", err.message);
    return NextResponse.json(
      { error: "Database error: " + err.message },
      { status: 500 }
    );
  }
}
