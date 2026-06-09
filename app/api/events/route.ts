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

// GET events (scoped by companyid)
export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const result = await pool.query(
      'SELECT * FROM events WHERE companyid = $1',
      [decoded.companyid]
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// POST new event
export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { clientid, eventtype, eventdate, notes } = await req.json();

    if (!eventtype || typeof eventtype !== "string" || eventtype.trim() === "") {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }
    if (!eventdate || isNaN(Date.parse(eventdate))) {
      return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
    }

    await pool.query(
      "INSERT INTO events (clientid, companyid, eventtype, eventdate, notes) VALUES ($1, $2, $3, $4, $5)",
      [clientid, decoded.companyid, eventtype.trim(), eventdate, notes]
    );

    return NextResponse.json({ message: "Event created successfully" }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// PUT update event
export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { eventid, eventtype, eventdate, notes, clientid } = await req.json();

    if (!eventtype || typeof eventtype !== "string" || eventtype.trim() === "") {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }
    if (!eventdate || isNaN(Date.parse(eventdate))) {
      return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
    }

    await pool.query(
      `UPDATE events 
       SET eventtype = $1, eventdate = $2, notes = $3, clientid = $4, companyid = $5
       WHERE eventid = $6 AND companyid = $5`,
      [eventtype.trim(), eventdate, notes, clientid, decoded.companyid, eventid]
    );

    return NextResponse.json({ message: "Event updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// DELETE event
export async function DELETE(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { eventid } = await req.json();

    await pool.query(
      'DELETE FROM events WHERE eventid = $1 AND companyid = $2',
      [eventid, decoded.companyid]
    );

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
