import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.DATABASE_URL || '';
  // Strip password from URL for safe display
  const safeUrl = url.replace(/:([^@]+)@/, ':***@');

  try {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    const tables = result.rows.map((r) => r.table_name);

    return NextResponse.json({
      connected: true,
      database_url: safeUrl,
      tables,
      has_company_settings: tables.includes('company_settings'),
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      database_url: safeUrl,
      error: err.message,
    });
  }
}
