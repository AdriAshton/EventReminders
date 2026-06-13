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
    const decoded = verifyToken(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const result = await pool.query(
        "SELECT * FROM messages WHERE messageid = $1 AND companyid = $2",
        [Number(id), decoded.companyid]
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
      "SELECT * FROM messages WHERE companyid = $1 ORDER BY messageid LIMIT $2 OFFSET $3",
      [decoded.companyid, pageSize, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS total FROM messages WHERE companyid = $1",
      [decoded.companyid]
    );

    return NextResponse.json({ rows: dataResult.rows, total: countResult.rows[0].total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const {
      reminderId,
      channel,
      subject,
      messageBody,
      attachmentUrl,
      attachmentFileName,
      attachmentMimeType,
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
        reminderid, companyid, channel, subject, messagebody,
        attachmenturl, attachmentfilename, attachmentmimetype, status, sentat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        reminderId,
        decoded.companyid,
        channel,
        subject || null,
        messageBody,
        attachmentUrl || null,
        attachmentFileName || null,
        attachmentMimeType || null,
        status || "Draft",
        sentAt || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const {
      messageid,
      reminderId,
      channel,
      subject,
      messageBody,
      attachmentUrl,
      attachmentFileName,
      attachmentMimeType,
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
        companyid = $2,
        channel = $3,
        subject = $4,
        messagebody = $5,
        attachmenturl = $6,
        attachmentfilename = $7,
        attachmentmimetype = $8,
        status = $9,
        sentat = $10
      WHERE messageid = $11 AND companyid = $2`,
      [
        reminderId,
        decoded.companyid,
        channel,
        subject || null,
        messageBody,
        attachmentUrl || null,
        attachmentFileName || null,
        attachmentMimeType || null,
        status || "Draft",
        sentAt || null,
        messageid,
      ]
    );

    return NextResponse.json({ message: "Message updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { messageid } = await req.json();

    await pool.query(
      "DELETE FROM messages WHERE messageid = $1 AND companyid = $2",
      [messageid, decoded.companyid]
    );

    return NextResponse.json({ message: "Message deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
