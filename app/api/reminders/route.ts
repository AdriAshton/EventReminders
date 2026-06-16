import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/email';

// Helper: verify token
function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

function envValue(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : value;
}

async function getReminderRecipient(companyid: number, eventid: number) {
  const result = await pool.query(
    `SELECT c.email, c.firstname, c.lastname, e.eventdate, e.notes, et.eventtypename
     FROM events e
     JOIN clients c ON c.clientid = e.clientid
     LEFT JOIN eventtypes et ON et.eventtypeid = e.eventtypeid
     WHERE e.eventid = $1 AND e.companyid = $2`,
    [eventid, companyid]
  );

  return result.rows[0] || null;
}

async function sendTwilioMessage(to: string, body: string, useWhatsApp: boolean) {
  const accountSid = envValue('TWILIO_ACCOUNT_SID');
  const authToken = envValue('TWILIO_AUTH_TOKEN');
  const fromNumber = envValue('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.log('Twilio credentials are not configured. Skipping message send.', {
      provider: useWhatsApp ? 'whatsapp' : 'sms',
      to,
      body,
    });
    return;
  }

  const from = useWhatsApp ? `whatsapp:${fromNumber}` : fromNumber;
  const recipient = useWhatsApp ? `whatsapp:${to}` : to;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: from,
      To: recipient,
      Body: body,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio send failed: ${errorText}`);
  }
}

async function sendReminderEmail(companyid: number, eventid: number, reminderdatetime: string, status?: string) {
  const recipient = await getReminderRecipient(companyid, eventid);

  if (!recipient?.email) {
    console.log('Reminder email skipped: no client email found for event', { companyid, eventid });
    return;
  }

  const clientName = [recipient.firstname, recipient.lastname].filter(Boolean).join(' ') || 'Client';
  const subject = `Reminder for ${recipient.eventtypename || 'your event'}`;
  const text = [
    `Hello ${clientName},`,
    '',
    `This is a reminder for your event on ${recipient.eventdate}.`,
    recipient.notes ? `Notes: ${recipient.notes}` : null,
    `Scheduled reminder time: ${reminderdatetime}`,
    status ? `Status: ${status}` : null,
  ].filter(Boolean).join('\n');
  const html = `
    <p>Hello ${clientName},</p>
    <p>This is a reminder for your event on <strong>${recipient.eventdate}</strong>.</p>
    ${recipient.notes ? `<p><strong>Notes:</strong> ${recipient.notes}</p>` : ''}
    <p><strong>Scheduled reminder time:</strong> ${reminderdatetime}</p>
    ${status ? `<p><strong>Status:</strong> ${status}</p>` : ''}
  `;

  await sendEmail({
    to: recipient.email,
    subject,
    text,
    html,
  });
}

async function sendReminderSmsOrWhatsApp(companyid: number, eventid: number, reminderdatetime: string, status: string | undefined, useWhatsApp: boolean) {
  const recipient = await getReminderRecipient(companyid, eventid);

  if (!recipient?.phone) {
    console.log('Reminder message skipped: no client phone found for event', { companyid, eventid });
    return;
  }

  const clientName = [recipient.firstname, recipient.lastname].filter(Boolean).join(' ') || 'Client';
  const message = [
    `Hello ${clientName},`,
    `This is a reminder for your event on ${recipient.eventdate}.`,
    recipient.notes ? `Notes: ${recipient.notes}` : null,
    `Scheduled reminder time: ${reminderdatetime}`,
    status ? `Status: ${status}` : null,
  ].filter(Boolean).join(' ');

  await sendTwilioMessage(recipient.phone, message, useWhatsApp);
}

// GET all reminders (scoped by companyid)
export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      const result = await pool.query(
        'SELECT * FROM reminders WHERE reminderid = $1 AND companyid = $2',
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
      'SELECT * FROM reminders WHERE companyid = $1 ORDER BY reminderid LIMIT $2 OFFSET $3',
      [decoded.companyid, pageSize, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*)::int as total FROM reminders WHERE companyid = $1',
      [decoded.companyid]
    );

    return NextResponse.json({ rows: dataResult.rows, total: countResult.rows[0].total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// POST new reminder
export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { eventid, reminderdatetime, remindermethod, status, timingtype, timingvalue, timingunit, sendtime, isactive } = await req.json();
    const method = String(remindermethod || '').trim();

    if (method.toLowerCase() === 'whatsapp') {
      console.log('WhatsApp reminder payload:', {
        companyid: decoded.companyid,
        eventid,
        reminderdatetime,
        remindermethod: method,
        status,
        timingtype,
        timingvalue,
        timingunit,
        sendtime,
        isactive,
      });
    }

    if (method.toLowerCase() === 'email') {
      await sendReminderEmail(decoded.companyid, Number(eventid), reminderdatetime, status);
    }

    // Validate datetime
    if (!reminderdatetime || isNaN(Date.parse(reminderdatetime))) {
      return NextResponse.json({ error: "Invalid reminder date/time" }, { status: 400 });
    }

    // Validate method
    const allowedMethods = ["email", "sms", "whatsapp"];
    if (!allowedMethods.includes(method.toLowerCase())) {
      return NextResponse.json({ error: "Invalid reminder method" }, { status: 400 });
    }

    if (method.toLowerCase() === 'sms') {
      await sendReminderSmsOrWhatsApp(decoded.companyid, Number(eventid), reminderdatetime, status, false);
    }

    if (method.toLowerCase() === 'whatsapp') {
      await sendReminderSmsOrWhatsApp(decoded.companyid, Number(eventid), reminderdatetime, status, true);
    }

    await pool.query(
      `INSERT INTO reminders (eventid, companyid, reminderdatetime, remindermethod, status, timingtype, timingvalue, timingunit, sendtime, isactive) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        eventid,
        decoded.companyid,
        reminderdatetime,
        method,
        status || "Pending",
        timingtype || "Before",
        timingvalue ?? 1,
        timingunit || "Days",
        sendtime || "09:00:00",
        isactive ?? true,
      ]
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
    const { reminderid, eventid, reminderdatetime, remindermethod, status, timingtype, timingvalue, timingunit, sendtime, isactive } = await req.json();
    const method = String(remindermethod || '').trim();

    if (method.toLowerCase() === 'whatsapp') {
      console.log('WhatsApp reminder payload:', {
        companyid: decoded.companyid,
        reminderid,
        eventid,
        reminderdatetime,
        remindermethod: method,
        status,
        timingtype,
        timingvalue,
        timingunit,
        sendtime,
        isactive,
      });
    }

    if (method.toLowerCase() === 'email') {
      await sendReminderEmail(decoded.companyid, Number(eventid), reminderdatetime, status);
    }

    if (!reminderdatetime || isNaN(Date.parse(reminderdatetime))) {
      return NextResponse.json({ error: "Invalid reminder date/time" }, { status: 400 });
    }

    const allowedMethods = ["email", "sms", "whatsapp"];
    if (!allowedMethods.includes(method.toLowerCase())) {
      return NextResponse.json({ error: "Invalid reminder method" }, { status: 400 });
    }

    if (method.toLowerCase() === 'sms') {
      await sendReminderSmsOrWhatsApp(decoded.companyid, Number(eventid), reminderdatetime, status, false);
    }

    if (method.toLowerCase() === 'whatsapp') {
      await sendReminderSmsOrWhatsApp(decoded.companyid, Number(eventid), reminderdatetime, status, true);
    }

    await pool.query(
      `UPDATE reminders 
       SET eventid = $1, companyid = $2, reminderdatetime = $3, remindermethod = $4, status = $5, timingtype = $6, timingvalue = $7, timingunit = $8, sendtime = $9, isactive = $10
       WHERE reminderid = $6 AND companyid = $2`,
      [
        eventid,
        decoded.companyid,
        reminderdatetime,
        method,
        status,
        timingtype || "Before",
        timingvalue ?? 1,
        timingunit || "Days",
        sendtime || "09:00:00",
        isactive ?? true,
        reminderid,
      ]
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
    const body = await req.json();
    // support bulk delete: { ids: [1,2,3] } or single { reminderid }
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      await pool.query(
        'DELETE FROM reminders WHERE reminderid = ANY($1::int[]) AND companyid = $2',
        [body.ids, decoded.companyid]
      );
      return NextResponse.json({ message: 'Reminders deleted successfully', deleted: body.ids.length });
    }

    const { reminderid } = body;
    if (!reminderid) return NextResponse.json({ error: 'reminderid is required' }, { status: 400 });

    await pool.query(
      'DELETE FROM reminders WHERE reminderid = $1 AND companyid = $2',
      [reminderid, decoded.companyid]
    );

    return NextResponse.json({ message: 'Reminder deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
