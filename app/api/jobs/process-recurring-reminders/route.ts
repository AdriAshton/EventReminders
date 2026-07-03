import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/email';

function envValue(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : value;
}

function addOneYear(dateValue: Date) {
  const date = new Date(dateValue);
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

function getNextBirthdayRunAt(birthdate: string, sendTime: string | null | undefined) {
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const [hours, minutes, seconds] = String(sendTime || '09:00:00').split(':').map((part) => Number(part || 0));
  const now = new Date();
  const candidate = new Date(now.getFullYear(), birth.getMonth(), birth.getDate(), hours || 0, minutes || 0, seconds || 0, 0);

  if (candidate < new Date()) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return candidate;
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

function buildBirthdayMessage(firstname: string, lastname: string, birthdate: string) {
  const name = [firstname, lastname].filter(Boolean).join(' ') || 'Client';
  return `Happy birthday, ${name}! This is your yearly reminder for ${birthdate}.`;
}

export async function POST(req: Request) {
  const secret = envValue('JOB_SECRET');
  const authHeader = req.headers.get('authorization') || '';
  const isHostedCron = req.headers.get('x-vercel-cron') === '1';

  console.log('process-recurring-reminders endpoint hit', {
    at: new Date().toISOString(),
    hostedCron: isHostedCron,
  });

  if ((!secret || authHeader !== `Bearer ${secret}`) && !isHostedCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dueResult = await pool.query(
    `SELECT r.reminderid, r.clientid, r.remindermethod, r.nextrunat, r.lastsentat, r.sendtime,
            c.email, c.phone, c.firstname, c.lastname, c.birthdate
     FROM reminders r
     JOIN clients c ON c.clientid = r.clientid
     WHERE r.isactive = TRUE
       AND c.birthdate IS NOT NULL
       AND r.nextrunat IS NOT NULL
       AND r.nextrunat <= NOW()`
  );

  console.log('process-recurring-reminders due reminders', {
    count: dueResult.rows.length,
  });

  let processed = 0;

  for (const row of dueResult.rows) {
    const nextRunAt = row.nextrunat ? new Date(row.nextrunat) : getNextBirthdayRunAt(row.birthdate, row.sendtime);
    if (!nextRunAt) {
      console.log('process-recurring-reminders skipped reminder', {
        reminderId: row.reminderid,
        reason: 'unable to resolve next run time',
      });
      continue;
    }
    const message = buildBirthdayMessage(row.firstname, row.lastname, row.birthdate);
    const method = String(row.remindermethod || 'email').toLowerCase();

    console.log('process-recurring-reminders sending reminder', {
      reminderId: row.reminderid,
      clientId: row.clientid,
      method,
      nextRunAt: nextRunAt.toISOString(),
      recipient: row.email || row.phone || null,
    });

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
       SET lastsentat = NOW(), nextrunat = $1
       WHERE reminderid = $2`,
      [addOneYear(nextRunAt), row.reminderid]
    );

    console.log('process-recurring-reminders reminder completed', {
      reminderId: row.reminderid,
    });

    processed += 1;
  }

  if (processed === 0) {
    console.log('process-recurring-reminders no reminders were sent');
  } else {
    console.log('process-recurring-reminders processed reminders', {
      processed,
    });
  }

  return NextResponse.json({ processed });
}