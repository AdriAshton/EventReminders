import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/email';

function envValue(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : value;
}

function addOneYear(dateValue: string) {
  const date = new Date(dateValue);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

async function sendTwilioMessage(to: string, body: string, useWhatsApp: boolean) {
  const accountSid = envValue('TWILIO_ACCOUNT_SID');
  const authToken = envValue('TWILIO_AUTH_TOKEN');
  const fromNumber = envValue('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials are not configured');
  }

  const from = useWhatsApp ? `whatsapp:${fromNumber}` : fromNumber;
  const recipient = useWhatsApp ? `whatsapp:${to}` : to;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: recipient, Body: body }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function buildBirthdayMessage(firstname: string, lastname: string, eventdate: string) {
  const name = [firstname, lastname].filter(Boolean).join(' ') || 'Client';
  return `Happy birthday, ${name}! This is your yearly reminder for ${eventdate}.`;
}

export async function POST(req: Request) {
  const secret = envValue('JOB_SECRET');
  const authHeader = req.headers.get('authorization') || '';
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dueResult = await pool.query(
    `SELECT r.reminderid, r.companyid, r.eventid, r.remindermethod, r.reminderdatetime, r.nextRunAt,
            c.email, c.phone, c.firstname, c.lastname, e.eventdate
     FROM reminders r
     JOIN events e ON e.eventid = r.eventid AND e.companyid = r.companyid
     JOIN clients c ON c.clientid = e.clientid
     WHERE r.isrecurring = TRUE
       AND r.recurrencetype = 'yearly'
       AND r.isactive = TRUE
       AND COALESCE(r.nextRunAt, r.reminderdatetime) <= NOW()`
  );

  let processed = 0;

  for (const row of dueResult.rows) {
    const nextRunAt = row.nextRunAt || row.reminderdatetime;
    const message = buildBirthdayMessage(row.firstname, row.lastname, row.eventdate);
    const method = String(row.remindermethod || 'email').toLowerCase();

    if (method === 'email') {
      await sendEmail({
        to: row.email,
        subject: 'Birthday reminder',
        text: message,
        html: `<p>${message}</p>`,
      });
    } else if (method === 'sms') {
      await sendTwilioMessage(row.phone, message, false);
    } else if (method === 'whatsapp') {
      await sendTwilioMessage(row.phone, message, true);
    }

    await pool.query(
      `UPDATE reminders
       SET lastSentAt = NOW(), nextRunAt = $1
       WHERE reminderid = $2 AND companyid = $3`,
      [addOneYear(nextRunAt), row.reminderid, row.companyid]
    );

    processed += 1;
  }

  return NextResponse.json({ processed });
}