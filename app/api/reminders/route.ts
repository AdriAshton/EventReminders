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

function getCompanyId(decoded: any) {
  const companyId = Number(decoded?.companyid);
  return Number.isFinite(companyId) && companyId > 0 ? companyId : null;
}

function envValue(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : value;
}

async function getDefaultCompany() {
  const result = await pool.query(
    `SELECT companyname, contactemail, contactphone
     FROM companies
     ORDER BY companyid ASC
     LIMIT 1`
  );

  return result.rows[0] || null;
}

function getNextBirthdayRunAt(birthdate: string | null | undefined) {
  if (!birthdate) return null;

  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  const candidate = new Date(now.getFullYear(), birth.getMonth(), birth.getDate(), 0, 0, 0, 0);
  if (candidate < now) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return candidate;
}

async function getReminderRecipient(clientid: number) {
  const result = await pool.query(
    `SELECT c.email, c.firstname, c.lastname, c.phone, c.birthdate, c.companyid
     FROM clients c
     WHERE c.clientid = $1`,
    [clientid]
  );

  return result.rows[0] || null;
}

function normalizeReminderRow(row: { birthdate?: string | null; nextrunat?: string | Date | null; [key: string]: any }) {
  if (row?.nextrunat) return row;

  const nextRunAt = row.birthdate ? getNextBirthdayRunAt(row.birthdate) : null;
  return {
    ...row,
    nextrunat: nextRunAt ? nextRunAt.toISOString() : row.nextrunat,
  };
}

async function sendTwilioMessage(to: string, body: string, useWhatsApp: boolean, fromNumber?: string) {
  const accountSid = envValue('TWILIO_ACCOUNT_SID');
  const authToken = envValue('TWILIO_AUTH_TOKEN');
  const senderNumber = fromNumber || envValue('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !senderNumber) {
    console.log('Twilio credentials are not configured. Skipping message send.', {
      provider: useWhatsApp ? 'whatsapp' : 'sms',
      to,
      body,
    });
    return;
  }

  const from = useWhatsApp ? `whatsapp:${senderNumber}` : senderNumber;
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

async function sendReminderEmail(clientid: number, reminderdatetime: string, status?: string) {
  const recipient = await getReminderRecipient(clientid);
  const company = await getDefaultCompany();

  if (!recipient?.email) {
    console.log('Reminder email skipped: no client email found for birthday reminder', { clientid });
    return;
  }

  const clientName = [recipient.firstname, recipient.lastname].filter(Boolean).join(' ') || 'Client';
  const subject = `Birthday reminder for ${clientName}`;
  const text = [
    `Hello ${clientName},`,
    '',
    `This is a reminder for your birthday on ${recipient.birthdate}.`,
    `Scheduled reminder time: ${reminderdatetime}`,
    status ? `Status: ${status}` : null,
  ].filter(Boolean).join('\n');
  const html = `
    <p>Hello ${clientName},</p>
    <p>This is a reminder for your birthday on <strong>${recipient.birthdate}</strong>.</p>
    <p><strong>Scheduled reminder time:</strong> ${reminderdatetime}</p>
    ${status ? `<p><strong>Status:</strong> ${status}</p>` : ''}
  `;

  await sendEmail({
    to: recipient.email,
    subject,
    text,
    html,
    from: company?.contactemail || undefined,
  });
}

async function sendReminderSmsOrWhatsApp(clientid: number, reminderdatetime: string, status: string | undefined, useWhatsApp: boolean) {
  const recipient = await getReminderRecipient(clientid);
  const company = await getDefaultCompany();

  if (!recipient?.phone) {
    console.log('Reminder message skipped: no client phone found for birthday reminder', { clientid });
    return;
  }

  const clientName = [recipient.firstname, recipient.lastname].filter(Boolean).join(' ') || 'Client';
  const message = [
    `Hello ${clientName},`,
    `This is a reminder for your birthday on ${recipient.birthdate}.`,
    `Scheduled reminder time: ${reminderdatetime}`,
    status ? `Status: ${status}` : null,
  ].filter(Boolean).join(' ');

  const senderNumber = company?.contactphone || undefined;
  await sendTwilioMessage(recipient.phone, message, useWhatsApp, senderNumber);
}

export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = getCompanyId(decoded);
    if (!companyId) {
      return NextResponse.json({ error: "Company access is required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      const result = await pool.query(
        `SELECT r.*, c.firstname, c.lastname, c.birthdate, c.email
         FROM reminders r
         JOIN clients c ON c.clientid = r.clientid
         WHERE r.reminderid = $1 AND r.companyid = $2`,
        [Number(id), companyId]
      );
      if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(normalizeReminderRow(result.rows[0]));
    }

    const firstNameParam = url.searchParams.get("firstName") || "";
    const lastNameParam = url.searchParams.get("lastName") || "";

    // filterOptions mode: returns distinct first/last names for cascading dropdowns
    // firstNames are filtered by lastName only; lastNames are filtered by firstName only
    if (url.searchParams.get("filterOptions") === "true") {
      const fnConditions = [`r.companyid = $1`];
      const fnParams: any[] = [companyId];
      if (lastNameParam) {
        fnParams.push(lastNameParam);
        fnConditions.push(`c.lastname = $${fnParams.length}`);
      }

      const lnConditions = [`r.companyid = $1`];
      const lnParams: any[] = [companyId];
      if (firstNameParam) {
        lnParams.push(firstNameParam);
        lnConditions.push(`c.firstname = $${lnParams.length}`);
      }

      const [fnResult, lnResult] = await Promise.all([
        pool.query(
          `SELECT DISTINCT c.firstname FROM reminders r JOIN clients c ON c.clientid = r.clientid WHERE ${fnConditions.join(' AND ')} AND c.firstname IS NOT NULL ORDER BY c.firstname`,
          fnParams
        ),
        pool.query(
          `SELECT DISTINCT c.lastname FROM reminders r JOIN clients c ON c.clientid = r.clientid WHERE ${lnConditions.join(' AND ')} AND c.lastname IS NOT NULL ORDER BY c.lastname`,
          lnParams
        ),
      ]);

      return NextResponse.json({
        firstNames: fnResult.rows.map((r) => r.firstname),
        lastNames: lnResult.rows.map((r) => r.lastname),
      });
    }

    // support pagination: ?page=1&pageSize=10
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const conditions: string[] = [`r.companyid = $1`];
    const params: any[] = [companyId];
    if (firstNameParam) {
      params.push(firstNameParam);
      conditions.push(`c.firstname = $${params.length}`);
    }
    if (lastNameParam) {
      params.push(lastNameParam);
      conditions.push(`c.lastname = $${params.length}`);
    }
    const whereClause = conditions.join(' AND ');

    const dataResult = await pool.query(
      `SELECT r.*, c.firstname, c.lastname, c.birthdate, c.email
       FROM reminders r
       JOIN clients c ON c.clientid = r.clientid
       WHERE ${whereClause}
       ORDER BY r.reminderid
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM reminders r JOIN clients c ON c.clientid = r.clientid WHERE ${whereClause}`,
      params
    );

    return NextResponse.json({
      rows: dataResult.rows.map((row) => normalizeReminderRow(row)),
      total: countResult.rows[0].total,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// POST new reminder
export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = getCompanyId(decoded);
    if (!companyId) {
      return NextResponse.json({ error: "Company access is required" }, { status: 403 });
    }

    const { clientid, reminderdatetime, remindermethod, status, isactive } = await req.json();
    const method = String(remindermethod || '').trim();
    const recipient = await getReminderRecipient(Number(clientid));
    const scheduledAt = recipient?.birthdate ? getNextBirthdayRunAt(recipient.birthdate) : (reminderdatetime ? new Date(reminderdatetime) : null);

    if (method.toLowerCase() === 'whatsapp') {
      console.log('WhatsApp reminder payload:', {
        clientid,
        reminderdatetime: scheduledAt ?? reminderdatetime,
        remindermethod: method,
        status,
        isactive,
      });
    }

    if (method.toLowerCase() === 'email') {
      await sendReminderEmail(Number(clientid), scheduledAt ? scheduledAt.toString() : reminderdatetime, status);
    }

    // Validate datetime
    if (!scheduledAt || isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid reminder date/time" }, { status: 400 });
    }

    // Validate method
    const allowedMethods = ["email", "whatsapp"];
    if (!allowedMethods.includes(method.toLowerCase())) {
      return NextResponse.json({ error: "Invalid reminder method" }, { status: 400 });
    }

    if (method.toLowerCase() === 'whatsapp') {
      await sendReminderSmsOrWhatsApp(Number(clientid), scheduledAt.toString(), status, true);
    }

    await pool.query(
      `INSERT INTO reminders (clientid, companyid, reminderdatetime, remindermethod, status, isactive, nextrunat) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        clientid,
        companyId,
        scheduledAt,
        method,
        status || "Pending",
        isactive ?? true,
        scheduledAt,
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
    const companyId = getCompanyId(decoded);
    if (!companyId) {
      return NextResponse.json({ error: "Company access is required" }, { status: 403 });
    }

    const { reminderid, clientid, reminderdatetime, remindermethod, status, isactive } = await req.json();
    const method = String(remindermethod || '').trim();
    const recipient = await getReminderRecipient(Number(clientid));
    const scheduledAt = recipient?.birthdate ? getNextBirthdayRunAt(recipient.birthdate) : (reminderdatetime ? new Date(reminderdatetime) : null);

    if (method.toLowerCase() === 'whatsapp') {
      console.log('WhatsApp reminder payload:', {
        reminderid,
        clientid,
        reminderdatetime: scheduledAt ?? reminderdatetime,
        remindermethod: method,
        status,
        isactive,
      });
    }

    if (method.toLowerCase() === 'email') {
      await sendReminderEmail(Number(clientid), scheduledAt ? scheduledAt.toString() : reminderdatetime, status);
    }

    if (!scheduledAt || isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid reminder date/time" }, { status: 400 });
    }

    const allowedMethods = ["email", "whatsapp"];
    if (!allowedMethods.includes(method.toLowerCase())) {
      return NextResponse.json({ error: "Invalid reminder method" }, { status: 400 });
    }

    if (method.toLowerCase() === 'whatsapp') {
      await sendReminderSmsOrWhatsApp(Number(clientid), scheduledAt.toString(), status, true);
    }

    await pool.query(
      `UPDATE reminders 
       SET clientid = $1, reminderdatetime = $2, remindermethod = $3, status = $4, isactive = $5, nextrunat = $6
       WHERE reminderid = $7 AND companyid = $8`,
      [
        clientid,
        scheduledAt,
        method,
        status,
        isactive ?? true,
        scheduledAt,
        reminderid,
        companyId,
      ]
    );

    await pool.query(
      `UPDATE messages
       SET channel = $1
       WHERE reminderid = $2`,
      [method === 'whatsapp' ? 'WhatsApp' : 'Email', reminderid]
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
    const companyId = getCompanyId(decoded);
    if (!companyId) {
      return NextResponse.json({ error: "Company access is required" }, { status: 403 });
    }

    const body = await req.json();
    // support bulk delete: { ids: [1,2,3] } or single { reminderid }
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      await pool.query(
        'DELETE FROM reminders WHERE reminderid = ANY($1::int[]) AND companyid = $2',
        [body.ids, companyId]
      );
      return NextResponse.json({ message: 'Reminders deleted successfully', deleted: body.ids.length });
    }

    const { reminderid } = body;
    if (!reminderid) return NextResponse.json({ error: 'reminderid is required' }, { status: 400 });

    await pool.query(
      'DELETE FROM reminders WHERE reminderid = $1 AND companyid = $2',
      [reminderid, companyId]
    );

    return NextResponse.json({ message: 'Reminder deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
