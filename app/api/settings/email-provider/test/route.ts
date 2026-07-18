import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getCompanySettings } from '@/lib/appSettings';
import { sendEmail } from '@/lib/email';
import { getServerEnv } from '@/lib/serverEnv';

type AuthTokenPayload = {
  companyid?: number | string;
};

function verifyToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  const jwtSecret = getServerEnv('JWT_SECRET') || 'yourSuperSecretKey123';
  return jwt.verify(token, jwtSecret) as AuthTokenPayload;
}

function getCompanyId(decoded: AuthTokenPayload) {
  const companyId = Number(decoded?.companyid);
  return Number.isFinite(companyId) && companyId > 0 ? companyId : null;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = getCompanyId(decoded);
    if (!companyId) {
      return NextResponse.json({ error: 'Company access is required' }, { status: 403 });
    }

    const body = await req.json();
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    if (!to || !isEmail(to)) {
      return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
    }

    const settings = await getCompanySettings(companyId);
    const fromEmail = settings.emailfrom || undefined;
    const providerLabel = settings.emailprovider === 'gmail' ? 'Gmail' : 'Mailtrap/SMTP';

    await sendEmail(
      {
        to,
        from: fromEmail,
        subject: 'Email provider test message',
        text: `Test email sent successfully using ${providerLabel} for company ${companyId}.`,
        html: `<p>Test email sent successfully using <strong>${providerLabel}</strong> for company <strong>${companyId}</strong>.</p>`,
      },
      companyId
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}
