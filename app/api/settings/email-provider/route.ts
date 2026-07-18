import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getCompanySettings, upsertCompanySettings } from '@/lib/appSettings';
import { getServerEnv } from '@/lib/serverEnv';

function verifyToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  const jwtSecret = getServerEnv('JWT_SECRET') || 'yourSuperSecretKey123';
  return jwt.verify(token, jwtSecret) as any;
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
    return NextResponse.json({
      provider: settings.emailprovider,
      emailfrom: settings.emailfrom,
      smtp_host: settings.smtp_host,
      smtp_port: settings.smtp_port,
      smtp_secure: settings.smtp_secure,
      smtp_user: settings.smtp_user,
      smtp_pass: settings.smtp_pass,
      gmail_user: settings.gmail_user,
      gmail_pass: settings.gmail_pass,
    });
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
    if (body?.provider !== 'mailtrap' && body?.provider !== 'gmail') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const settings = await upsertCompanySettings(companyId, {
      emailprovider: body.provider,
      emailfrom: typeof body.emailfrom === 'string' ? body.emailfrom.trim() : undefined,
      smtp_host: typeof body.smtp_host === 'string' ? body.smtp_host.trim() : undefined,
      smtp_port: body.smtp_port === null || body.smtp_port === undefined || body.smtp_port === '' ? undefined : Number(body.smtp_port),
      smtp_secure: typeof body.smtp_secure === 'boolean' ? body.smtp_secure : undefined,
      smtp_user: typeof body.smtp_user === 'string' ? body.smtp_user.trim() : undefined,
      smtp_pass: typeof body.smtp_pass === 'string' ? body.smtp_pass : undefined,
      gmail_user: typeof body.gmail_user === 'string' ? body.gmail_user.trim() : undefined,
      gmail_pass: typeof body.gmail_pass === 'string' ? body.gmail_pass : undefined,
    });
    return NextResponse.json({
      provider: settings.emailprovider,
      emailfrom: settings.emailfrom,
      smtp_host: settings.smtp_host,
      smtp_port: settings.smtp_port,
      smtp_secure: settings.smtp_secure,
      smtp_user: settings.smtp_user,
      smtp_pass: settings.smtp_pass,
      gmail_user: settings.gmail_user,
      gmail_pass: settings.gmail_pass,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}