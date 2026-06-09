import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

// Helper: verify token
function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

// GET all reminders (scoped by companyid)
export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const result = await pool.query(
      'SELECT * FROM reminders WHERE companyid = $1',
      [decoded.companyid]
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// POST new reminder
export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { eventid, reminderdatetime, remindermethod, status } = await req.json();

    // Validate datetime
    if (!reminderdatetime || isNaN(Date.parse(reminderdatetime))) {
      return NextResponse.json({ error: "Invalid reminder date/time" }, { status: 400 });
    }

    // Validate method
    const allowedMethods = ["email", "sms"];
    if (!allowedMethods.includes(remindermethod.toLowerCase())) {
      return NextResponse.json({ error: "Invalid reminder method" }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO reminders (eventid, companyid, reminderdatetime, remindermethod, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [eventid, decoded.companyid, reminderdatetime, remindermethod, status || "Pending"]
    );

    return NextResponse.json({ message: "Reminder created successfully" }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// PUT update reminder
export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { reminderid, eventid, reminderdatetime, remindermethod, status } = await req.json();

    if (!reminderdatetime || isNaN(Date.parse(reminderdatetime))) {
      return NextResponse.json({ error: "Invalid reminder date/time" }, { status: 400 });
    }

    const allowedMethods = ["email", "sms"];
    if (!allowedMethods.includes(remindermethod.toLowerCase())) {
      return NextResponse.json({ error: "Invalid reminder method" }, { status: 400 });
    }

    await pool.query(
      `UPDATE reminders 
       SET eventid = $1, companyid = $2, reminderdatetime = $3, remindermethod = $4, status = $5
       WHERE reminderid = $6 AND companyid = $2`,
      [eventid, decoded.companyid, reminderdatetime, remindermethod, status, reminderid]
    );

    return NextResponse.json({ message: "Reminder updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// DELETE reminder
export async function DELETE(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { reminderid } = await req.json();

    await pool.query(
      'DELETE FROM reminders WHERE reminderid = $1 AND companyid = $2',
      [reminderid, decoded.companyid]
    );

    return NextResponse.json({ message: 'Reminder deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
