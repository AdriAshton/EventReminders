import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getServerEnv } from '@/lib/serverEnv';

type AuthTokenPayload = {
  userid?: number | string;
  companyid?: number | string;
};

function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = getServerEnv('JWT_SECRET') || 'yourSuperSecretKey123';
  return jwt.verify(token, jwtSecret) as AuthTokenPayload;
}

export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = Number(decoded?.companyid);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: "companyid is missing from the JWT token" }, { status: 400 });
    }
    const result = await pool.query(
      `SELECT ci.inviteid,
            ci.companyid,
            c.companyname,
            ci.email,
            ci.roleid,
            r.rolename,
            ci.token,
            ci.status,
            ci.invitedby,
            u.username AS invitedbyname,
            ci.invitedat,
            ci.acceptedat,
            ci.expiresat,
            ci.metadata
       FROM company_invites ci
       LEFT JOIN companies c ON c.companyid = ci.companyid
       LEFT JOIN roles r ON r.roleid = ci.roleid
       LEFT JOIN users u ON u.userid = ci.invitedby
      WHERE ci.companyid = $1
      ORDER BY inviteid DESC`,
      [companyId]
    );
    return NextResponse.json({ invites: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch invites";
    const status = message.toLowerCase().includes('does not exist') ? 500 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const body = await req.json();
    const tokenCompanyId = Number(decoded?.companyid);
    const bodyCompanyId = Number(body.companyid);
    const companyid = Number.isFinite(tokenCompanyId) && tokenCompanyId > 0 ? tokenCompanyId : bodyCompanyId;
    const email = String(body.email || "").trim();
    const roleid = Number(body.roleid);

    if (!companyid || !email || !roleid) {
      return NextResponse.json({ error: "companyid, email, and roleid are required" }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    const result = await pool.query(
      `INSERT INTO company_invites (companyid, email, roleid, token, invitedby, expiresat)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [companyid, email, roleid, token, Number(decoded.userid) || null, expiresAt]
    );

    const inviteLink = `${process.env.APP_URL || "http://localhost:3000"}/signup?invite=${token}`;
    try {
      await sendEmail({
        to: email.toLowerCase(),
        subject: "You are invited to join the company",
        text: `You have been invited to join. Open this link: ${inviteLink}`,
        html: `<p>You have been invited to join. Open this link:</p><p><a href="${inviteLink}">${inviteLink}</a></p>`,
      }, companyid);
    } catch (emailErr) {
      console.error("Invite email failed", emailErr);
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create invite";
    const status = message.toLowerCase().includes('does not exist') ? 500 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}