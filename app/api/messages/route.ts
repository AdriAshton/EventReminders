import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { getServerEnv } from '@/lib/serverEnv';

function getErrorStatus(err: unknown) {
  return err instanceof Error && err.message === "Unauthorized" ? 401 : 500;
}

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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const result = await pool.query(
        "SELECT * FROM messages WHERE messageid = $1",
        [Number(id)]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    }

    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const dataResult = await pool.query(
      "SELECT * FROM messages ORDER BY messageid LIMIT $1 OFFSET $2",
      [pageSize, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS total FROM messages",
      []
    );

    return NextResponse.json({ rows: dataResult.rows, total: countResult.rows[0].total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: getErrorStatus(err) });
  }
}

export async function POST(req: Request) {
  try {
    const {
      reminderId,
      channel,
      subject,
      messageBody,
      status,
      sentAt,
    } = await req.json();

    if (!reminderId) {
      return NextResponse.json({ error: "Reminder is required" }, { status: 400 });
    }
    if (!channel || !["Email", "WhatsApp"].includes(channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }
    if (!messageBody) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO messages (
        reminderid, channel, subject, messagebody, status, sentat
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (reminderid) DO UPDATE SET
        channel = EXCLUDED.channel,
        subject = EXCLUDED.subject,
        messagebody = EXCLUDED.messagebody,
        status = EXCLUDED.status,
        sentat = EXCLUDED.sentat,
        updatedat = NOW()
      RETURNING *`,
      [
        reminderId,
        channel,
        subject || null,
        messageBody,
        status || "Draft",
        sentAt || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: getErrorStatus(err) });
  }
}

export async function PUT(req: Request) {
  try {
    const {
      messageid,
      reminderId,
      channel,
      subject,
      messageBody,
      status,
      sentAt,
    } = await req.json();

    if (!messageid) {
      return NextResponse.json({ error: "Message id is required" }, { status: 400 });
    }
    if (!reminderId) {
      return NextResponse.json({ error: "Reminder is required" }, { status: 400 });
    }
    if (!channel || !["Email", "WhatsApp"].includes(channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }
    if (!messageBody) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    await pool.query(
      `UPDATE messages SET
        reminderid = $1,
        channel = $2,
        subject = $3,
        messagebody = $4,
        status = $5,
        sentat = $6,
        updatedat = NOW()
      WHERE messageid = $7`,
      [
        reminderId,
        channel,
        subject || null,
        messageBody,
        status || "Draft",
        sentAt || null,
        messageid,
      ]
    );

    return NextResponse.json({ message: "Message updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: getErrorStatus(err) });
  }
}

export async function DELETE(req: Request) {
  try {
    const { messageid } = await req.json();

    if (!messageid) {
      return NextResponse.json({ error: "Message id is required" }, { status: 400 });
    }

    const result = await pool.query(
      "DELETE FROM messages WHERE messageid = $1",
      [messageid]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Message deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: getErrorStatus(err) });
  }
}
