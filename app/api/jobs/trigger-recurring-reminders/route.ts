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
  const requestOrigin = new URL(req.url).origin;
  const configuredAppUrl = String(process.env.APP_URL || '').trim() || null;
  const appUrl = resolveAppUrl(req).replace(/\/$/, '');
  const targetUrl = `${appUrl}/api/jobs/process-recurring-reminders`;
  const secret = process.env.JOB_SECRET;
  const authHeader = req.headers.get('authorization') || '';

  console.log('jobs/trigger-recurring-reminders: request started', {
    requestPath: '/api/jobs/trigger-recurring-reminders',
    requestOrigin,
    configuredAppUrl,
    resolvedAppUrl: appUrl,
    targetUrl,
    at: new Date().toISOString(),
  });

  if (!secret) {
    return NextResponse.json({ error: 'JOB_SECRET is required' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    console.log('jobs/trigger-recurring-reminders: downstream response', {
      targetUrl,
      status: response.status,
      ok: response.ok,
    });

    const text = await response.text();
    if (!response.ok) {
      console.error('jobs/trigger-recurring-reminders: downstream returned non-2xx', {
        targetUrl,
        status: response.status,
        bodyPreview: text.slice(0, 500),
      });
    }

    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('jobs/trigger-recurring-reminders: internal fetch failed', {
      targetUrl,
      error: message,
      cause: error instanceof Error && error.cause ? String(error.cause) : null,
    });

    return NextResponse.json(
      {
        error: 'Internal fetch failed',
        details: message,
        debug: {
          requestOrigin,
          configuredAppUrl,
          resolvedAppUrl: appUrl,
          targetUrl,
        },
      },
      { status: 500 }
    );
  }
}