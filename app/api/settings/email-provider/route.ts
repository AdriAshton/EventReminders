import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getCompanySettings, upsertCompanySettings } from '@/lib/appSettings';

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
    return NextResponse.json({ provider: settings.emailprovider });
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

    const settings = await upsertCompanySettings(companyId, { emailprovider: body.provider });
    return NextResponse.json({ provider: settings.emailprovider });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}