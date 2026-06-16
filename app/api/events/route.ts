import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

function isBirthdayEventType(eventtypeid: number, eventtypename?: string | null) {
  return String(eventtypename || '').toLowerCase().includes('birthday') || Number(eventtypeid) === 1;
}

function buildNextRunAt(eventdate: string) {
  const date = new Date(eventdate);
  return date.toISOString();
}

async function createBirthdayReminder(companyid: number, eventid: number, eventdate: string) {
  await pool.query(
    `INSERT INTO reminders (
      eventid, companyid, reminderdatetime, remindermethod, status, timingtype, timingvalue, timingunit, sendtime, isactive,
      isrecurring, recurrenceType, recurrenceInterval, nextRunAt
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, 'yearly', 1, $11)`,
    [
      eventid,
      companyid,
      eventdate,
      'email',
      'Pending',
      'OnDay',
      0,
      'Days',
      '09:00:00',
      true,
      buildNextRunAt(eventdate),
    ]
  );
}

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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      const result = await pool.query(
        'SELECT * FROM events WHERE eventid = $1 AND companyid = $2',
        [Number(id), decoded.companyid]
      );
      if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(result.rows[0]);
    }

    // support pagination: ?page=1&pageSize=10
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const dataResult = await pool.query(
      'SELECT * FROM events WHERE companyid = $1 ORDER BY eventid LIMIT $2 OFFSET $3',
      [decoded.companyid, pageSize, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*)::int as total FROM events WHERE companyid = $1',
      [decoded.companyid]
    );

    return NextResponse.json({ rows: dataResult.rows, total: countResult.rows[0].total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// POST new event
export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { clientid, eventtypeid, eventdate, notes } = await req.json();

    if (!eventtypeid || typeof eventtypeid !== 'number') {
      return NextResponse.json({ error: 'Event type id is required' }, { status: 400 });
    }
    // validate event type exists and is global or belongs to this company
    const typeCheck = await pool.query(
      'SELECT eventtypeid, companyid FROM eventtypes WHERE eventtypeid = $1',
      [eventtypeid]
    );
    if (typeCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid event type id' }, { status: 400 });
    }
    const et = typeCheck.rows[0];
    if (et.companyid !== null && et.companyid !== decoded.companyid) {
      return NextResponse.json({ error: 'Event type does not belong to your company' }, { status: 403 });
    }
    if (!eventdate || isNaN(Date.parse(eventdate))) {
      return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
    }

    const inserted = await pool.query(
      "INSERT INTO events (clientid, companyid, eventtypeid, eventdate, notes) VALUES ($1, $2, $3, $4, $5) RETURNING eventid",
      [clientid, decoded.companyid, eventtypeid, eventdate, notes]
    );

    if (isBirthdayEventType(eventtypeid, et.eventtypename)) {
      await createBirthdayReminder(decoded.companyid, inserted.rows[0].eventid, eventdate);
    }

    return NextResponse.json({ message: "Event created successfully" }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// PUT update event
export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { eventid, eventtypeid, eventdate, notes, clientid } = await req.json();

    if (!eventtypeid || typeof eventtypeid !== 'number') {
      return NextResponse.json({ error: 'Event type id is required' }, { status: 400 });
    }
    // validate event type exists and is global or belongs to this company
    const typeCheck = await pool.query(
      'SELECT eventtypeid, companyid FROM eventtypes WHERE eventtypeid = $1',
      [eventtypeid]
    );
    if (typeCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid event type id' }, { status: 400 });
    }
    const et = typeCheck.rows[0];
    if (et.companyid !== null && et.companyid !== decoded.companyid) {
      return NextResponse.json({ error: 'Event type does not belong to your company' }, { status: 403 });
    }
    if (!eventdate || isNaN(Date.parse(eventdate))) {
      return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
    }

    await pool.query(
      `UPDATE events 
       SET eventtypeid = $1, eventdate = $2, notes = $3, clientid = $4, companyid = $5
       WHERE eventid = $6 AND companyid = $5`,
      [eventtypeid, eventdate, notes, clientid, decoded.companyid, eventid]
    );

    if (isBirthdayEventType(eventtypeid, et.eventtypename)) {
      const reminderResult = await pool.query(
        'SELECT reminderid FROM reminders WHERE eventid = $1 AND companyid = $2 ORDER BY reminderid LIMIT 1',
        [eventid, decoded.companyid]
      );

      if (reminderResult.rows[0]) {
        await pool.query(
          `UPDATE reminders
           SET reminderdatetime = $1, isrecurring = TRUE, recurrenceType = 'yearly', recurrenceInterval = 1, nextRunAt = $2, remindermethod = 'email'
           WHERE reminderid = $3 AND companyid = $4`,
          [eventdate, buildNextRunAt(eventdate), reminderResult.rows[0].reminderid, decoded.companyid]
        );
      } else {
        await createBirthdayReminder(decoded.companyid, eventid, eventdate);
      }
    }

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
