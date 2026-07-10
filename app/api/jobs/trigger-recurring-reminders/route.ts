import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const requestOrigin = new URL(req.url).origin;
  const appUrl = (process.env.APP_URL || requestOrigin || 'http://localhost:3000').replace(/\/$/, '');
  const secret = process.env.JOB_SECRET;
  const authHeader = req.headers.get('authorization') || '';

  if (!secret) {
    return NextResponse.json({ error: 'JOB_SECRET is required' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(`${appUrl}/api/jobs/process-recurring-reminders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}