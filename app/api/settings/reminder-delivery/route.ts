import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  getReminderDeliverySettings,
  setReminderDeliverySettings,
  type ReminderChannel,
} from '@/lib/appSettings';

function parseTime(value: unknown) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : null;
}

function parseChannel(value: unknown): ReminderChannel | null {
  return value === 'WhatsApp' || value === 'Email' ? value : null;
}

export async function GET() {
  const reminderDelivery = getReminderDeliverySettings();
  return NextResponse.json(reminderDelivery);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const sendTime = parseTime(body?.sendTime);
    const channel = parseChannel(body?.channel);

    if (!sendTime) {
      return NextResponse.json({ error: 'Send time must be in HH:MM format' }, { status: 400 });
    }
    if (!channel) {
      return NextResponse.json({ error: 'Channel must be Email or WhatsApp' }, { status: 400 });
    }

    const reminderDelivery = setReminderDeliverySettings({ sendTime, channel });
    await pool.query(
      `UPDATE reminders
       SET sendtime = $1,
           remindermethod = $2,
           nextrunat = CASE
             WHEN nextrunat IS NULL THEN nextrunat
             ELSE date_trunc('day', nextrunat) + $1::time
           END
       WHERE TRUE`,
      [sendTime, channel]
    );

    await pool.query(
      `UPDATE messages
       SET channel = $1
       WHERE TRUE`,
      [channel]
    );

    return NextResponse.json(reminderDelivery);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 });
  }
}
