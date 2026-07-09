import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const secret = process.env.JOB_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'JOB_SECRET is required' }, { status: 500 });
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