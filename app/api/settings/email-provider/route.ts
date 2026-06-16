import { NextResponse } from 'next/server';
import { getEmailSettings, setEmailProvider } from '@/lib/appSettings';

export async function GET() {
  const email = getEmailSettings();
  return NextResponse.json(email);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (body?.provider !== 'mailtrap' && body?.provider !== 'gmail') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const email = setEmailProvider(body.provider);
    return NextResponse.json(email);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}