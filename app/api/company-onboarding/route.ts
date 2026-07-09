import { NextResponse } from "next/server";
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
    verifyToken(req);
    const result = await pool.query(
      `SELECT profileid, companyid, companyname, contactemail, contactphone, setupstatus, trialenabled, reminderdefaults, createdat, updatedat
       FROM company_onboarding_profiles
       ORDER BY profileid DESC`
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch onboarding profiles" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    verifyToken(req);
    const body = await req.json();
    const companyid = Number(body.companyid);
    const companyname = String(body.companyname || "").trim();
    const contactemail = String(body.contactemail || "").trim();
    const contactphone = String(body.contactphone || "").trim();

    if (!companyid || !companyname || !contactemail || !contactphone) {
      return NextResponse.json({ error: "companyid, companyname, contactemail, and contactphone are required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO company_onboarding_profiles (companyid, companyname, contactemail, contactphone, setupstatus, trialenabled, reminderdefaults)
       VALUES ($1, $2, $3, $4, 'InProgress', false, '{}'::jsonb)
       ON CONFLICT (companyid)
       DO UPDATE SET companyname = EXCLUDED.companyname,
                     contactemail = EXCLUDED.contactemail,
                     contactphone = EXCLUDED.contactphone,
                     setupstatus = 'InProgress',
                     updatedat = NOW()
       RETURNING *`,
      [companyid, companyname, contactemail, contactphone]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save onboarding profile" }, { status: 500 });
  }
}