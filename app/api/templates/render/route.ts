import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getCompanySettings } from '@/lib/appSettings';
import { renderTemplate } from '@/lib/messageTemplates';

function verifyToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

function formatEventDate(eventDate: string | Date | null | undefined) {
  if (!eventDate) return '';
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const body = await req.json();
    const reminderId = Number(body?.reminderId);
    const templateId = String(body?.templateId || '');

    if (!reminderId) {
      return NextResponse.json({ error: 'Reminder id is required' }, { status: 400 });
    }

    const templates = (await getCompanySettings(Number(decoded.companyid))).messagetemplates;
    const template = templates.templates.find((item) => item.id === templateId)
      || templates.templates.find((item) => item.id === templates.activeTemplateId)
      || templates.templates[0];

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const reminderResult = await pool.query(
      'SELECT reminderid, clientid FROM reminders WHERE reminderid = $1',
      [reminderId],
    );

    if (reminderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    const reminder = reminderResult.rows[0];

    const [clientResult, companyResult] = await Promise.all([
      pool.query(
        'SELECT clientid, firstname, lastname, birthdate, companyid FROM clients WHERE clientid = $1 AND companyid = $2',
        [reminder.clientid, decoded.companyid],
      ),
      pool.query('SELECT companyid, companyname, contactemail, contactphone FROM companies WHERE companyid = $1 LIMIT 1', [decoded.companyid]),
    ]);

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found for reminder' }, { status: 404 });
    }

    const client = clientResult.rows[0];
    const company = companyResult.rows[0];
    const clientName = [client.firstname, client.lastname].filter(Boolean).join(' ').trim();

    const values = {
      clientName,
      companyName: company?.companyname || 'Your Company',
      eventDate: formatEventDate(client.birthdate),
    };

    return NextResponse.json({
      templateId: template.id,
      templateName: template.name,
      values,
      subject: renderTemplate(template.subject, values),
      body: renderTemplate(template.body, values),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to render template' }, { status: 500 });
  }
}
