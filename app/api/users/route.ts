import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const result = await pool.query(
      `SELECT u.userid, u.companyid, u.username, u.roleid, r.rolename AS role, u.email
       FROM users u
       JOIN roles r ON r.roleid = u.roleid
       WHERE u.companyid = $1
       ORDER BY u.userid ASC`,
      [decoded.companyid]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { username, password, roleid, email } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    if (!roleid) {
      return NextResponse.json({ error: "RoleId is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const passwordhash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (companyid, username, passwordhash, roleid, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING userid, companyid, username, roleid, email`,
      [decoded.companyid, username.trim(), passwordhash, Number(roleid), email.trim()]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { userid, username, password, roleid, email } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!roleid) {
      return NextResponse.json({ error: "RoleId is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (password) {
      const passwordhash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users
         SET username = $1, passwordhash = $2, roleid = $3, email = $4
         WHERE userid = $5 AND companyid = $6`,
        [username.trim(), passwordhash, Number(roleid), email.trim(), userid, decoded.companyid]
      );
    } else {
      await pool.query(
        `UPDATE users
         SET username = $1, roleid = $2, email = $3
         WHERE userid = $4 AND companyid = $5`,
        [username.trim(), Number(roleid), email.trim(), userid, decoded.companyid]
      );
    }

    return NextResponse.json({ message: "User updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { userid } = await req.json();

    await pool.query("DELETE FROM users WHERE userid = $1 AND companyid = $2", [
      userid,
      decoded.companyid,
    ]);

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
