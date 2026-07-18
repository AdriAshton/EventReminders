import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { getServerEnv } from '@/lib/serverEnv';

function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = getServerEnv('JWT_SECRET') || 'yourSuperSecretKey123';
  return jwt.verify(token, jwtSecret) as any;
}

export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const result = await pool.query(`SELECT settings FROM users WHERE userid = $1`, [decoded.userid]);
    const settings = result.rows[0]?.settings || {};
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const body = await req.json();
    // merge existing settings with provided
    const current = await pool.query(`SELECT settings FROM users WHERE userid = $1`, [decoded.userid]);
    const existing = current.rows[0]?.settings || {};
    const merged = { ...existing, ...body };
    await pool.query(`UPDATE users SET settings = $1, updatedat = NOW() WHERE userid = $2`, [merged, decoded.userid]);
    return NextResponse.json(merged);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
