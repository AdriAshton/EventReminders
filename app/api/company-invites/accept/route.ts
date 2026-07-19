import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { getServerEnv } from "@/lib/serverEnv";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const inviteToken = String(searchParams.get("inviteToken") || searchParams.get("invite") || "").trim();

    if (!inviteToken) {
      return NextResponse.json({ error: "inviteToken is required" }, { status: 400 });
    }

    const inviteResult = await pool.query(
      `SELECT ci.inviteid, ci.companyid, c.companyname, ci.email, ci.roleid, ci.status, ci.expiresat
       FROM company_invites
       JOIN companies c ON c.companyid = company_invites.companyid
       WHERE company_invites.token = $1
       LIMIT 1`,
      [inviteToken]
    );

    const invite = inviteResult.rows[0];
    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    return NextResponse.json({ invite });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load invite" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inviteToken = String(body.inviteToken || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const desiredUsername = String(body.username || "").trim();

    if (!inviteToken || !email || !password || !desiredUsername) {
      return NextResponse.json({ error: "inviteToken, email, username, and password are required" }, { status: 400 });
    }

    const inviteResult = await pool.query(
      `SELECT ci.inviteid, ci.companyid, c.companyname, ci.email, ci.roleid, ci.status, ci.expiresat
       FROM company_invites ci
       JOIN companies c ON c.companyid = ci.companyid
       WHERE ci.token = $1
       LIMIT 1`,
      [inviteToken]
    );

    const invite = inviteResult.rows[0];
    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    if (invite.status !== "Pending") {
      return NextResponse.json({ error: "Invite is no longer valid" }, { status: 400 });
    }

    if (invite.expiresat && new Date(invite.expiresat).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    if (String(invite.email).toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match the invite" }, { status: 400 });
    }

    const existingUserResult = await pool.query(
      `SELECT userid FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (existingUserResult.rows[0]) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const usernameResult = await pool.query(
      `SELECT userid FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [desiredUsername]
    );

    if (usernameResult.rows[0]) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      `INSERT INTO users (username, email, passwordhash, roleid, companyid, inviteid)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING userid, username, email, companyid, roleid`,
      [desiredUsername, email, passwordHash, invite.roleid, invite.companyid, invite.inviteid]
    );

    await pool.query(
      `UPDATE company_invites
       SET status = 'Accepted', acceptedat = NOW()
       WHERE inviteid = $1`,
      [invite.inviteid]
    );

    const jwtSecret = getServerEnv("JWT_SECRET") || "yourSuperSecretKey123";
    if (!jwtSecret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const token = jwt.sign(
      {
        userid: userResult.rows[0].userid,
        companyid: userResult.rows[0].companyid,
        roleid: userResult.rows[0].roleid,
        username: userResult.rows[0].username,
      },
      jwtSecret,
      { expiresIn: "1h" }
    );

    const response = NextResponse.json(
      {
        message: "Invite accepted and account created successfully",
        token,
        user: userResult.rows[0],
      },
      { status: 201 }
    );

    response.cookies.set("auth", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to accept invite" }, { status: 500 });
  }
}