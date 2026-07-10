import { NextResponse } from 'next/server';

function resolveAppUrl(req: Request) {
  const requestOrigin = new URL(req.url).origin;
  const configured = String(process.env.APP_URL || '').trim();

  if (!configured) {
    return requestOrigin;
  }

  try {
    const configuredUrl = new URL(configured);
    const host = configuredUrl.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return requestOrigin;
    }
    return configuredUrl.origin;
  } catch {
    return requestOrigin;
  }
}

export async function POST(req: Request) {
  const appUrl = resolveAppUrl(req).replace(/\/$/, '');
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