import { NextResponse } from 'next/server';
import { readSettings, writeSettings } from '@/lib/appSettings';

export async function GET() {
  const s = readSettings();
  return NextResponse.json({ twoFactorGlobal: !!s.twoFactorGlobal });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const val = !!body.twoFactorGlobal;
    const s = readSettings();
    s.twoFactorGlobal = val;
    writeSettings(s);
    return NextResponse.json({ twoFactorGlobal: val });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 });
  }
}
