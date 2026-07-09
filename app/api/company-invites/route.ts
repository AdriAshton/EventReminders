import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { sendEmail } from "@/lib/email";

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
    verifyToken(req);
    const result = await pool.query(
      `SELECT inviteid, companyid, email, roleid, token, status, invitedby, invitedat, acceptedat, expiresat, metadata
       FROM company_invites
       ORDER BY inviteid DESC`
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    const message = String(err?.message || "Failed to fetch invites");
    const status = message.toLowerCase().includes('does not exist') ? 500 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const body = await req.json();
    const companyid = Number(body.companyid);
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
      [companyid, email, roleid, token, decoded.userid, expiresAt]
    );

    const inviteLink = `${process.env.APP_URL || "http://localhost:3000"}/signup?invite=${token}`;
    try {
      await sendEmail({
        to: email,
        subject: "You are invited to join the company",
        text: `You have been invited to join. Open this link: ${inviteLink}`,
        html: `<p>You have been invited to join. Open this link:</p><p><a href="${inviteLink}">${inviteLink}</a></p>`,
      });
    } catch (emailErr) {
      console.error("Invite email failed", emailErr);
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    const message = String(err?.message || "Failed to create invite");
    const status = message.toLowerCase().includes('does not exist') ? 500 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}