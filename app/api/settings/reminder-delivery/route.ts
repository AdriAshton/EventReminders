import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import {
  getCompanySettings,
  upsertCompanySettings,
  type ReminderChannel,
} from '@/lib/appSettings';

function parseTime(value: unknown) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : null;
}

function parseChannel(value: unknown): ReminderChannel | null {
  return value === 'WhatsApp' || value === 'Email' ? value : null;
}

function verifyToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

function getCompanyId(decoded: any) {
  const companyId = Number(decoded?.companyid);
  return Number.isFinite(companyId) && companyId > 0 ? companyId : null;
}

export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = getCompanyId(decoded);
    if (!companyId) {
      return NextResponse.json({ error: 'Company access is required' }, { status: 403 });
    }

    const settings = await getCompanySettings(companyId);
    return NextResponse.json(settings.reminderdelivery);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: err?.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = getCompanyId(decoded);
    if (!companyId) {
      return NextResponse.json({ error: 'Company access is required' }, { status: 403 });
    }

    const body = await req.json();
    const sendTime = parseTime(body?.sendTime);
    const channel = parseChannel(body?.channel);

    if (!sendTime) {
      return NextResponse.json({ error: 'Send time must be in HH:MM format' }, { status: 400 });
    }
    if (!channel) {
      return NextResponse.json({ error: 'Channel must be Email or WhatsApp' }, { status: 400 });
    }

    const reminderDelivery = { sendTime, channel };
    await upsertCompanySettings(companyId, { reminderdelivery: reminderDelivery as any });

    await pool.query(
      `UPDATE reminders
       SET sendtime = $1,
           remindermethod = $2,
           nextrunat = CASE
             WHEN nextrunat IS NULL THEN nextrunat
             ELSE date_trunc('day', nextrunat) + $1::time
           END
       WHERE companyid = $3`,
      [sendTime, channel, companyId]
    );

    await pool.query(
      `UPDATE messages
       SET channel = $1
       WHERE companyid = $2`,
      [channel, companyId]
    );

    return NextResponse.json(reminderDelivery);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: err?.message === 'Unauthorized' ? 401 : 500 });
  }
}
