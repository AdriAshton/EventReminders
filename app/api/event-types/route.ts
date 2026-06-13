import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

function verifyToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
  const token = authHeader.split(' ')[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const res = await pool.query(
      'SELECT * FROM eventtypes WHERE companyid IS NULL OR companyid = $1 ORDER BY eventtypename',
      [decoded.companyid]
    );
    return NextResponse.json(res.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { eventtypename, description } = await req.json();
    if (!eventtypename || typeof eventtypename !== 'string') {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    await pool.query(
      'INSERT INTO eventtypes (eventtypename, description, companyid) VALUES ($1, $2, $3) ON CONFLICT (eventtypename, companyid) DO NOTHING',
      [eventtypename.trim(), description, decoded.companyid]
    );
    return NextResponse.json({ message: 'Created' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
