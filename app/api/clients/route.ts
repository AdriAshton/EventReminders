import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

// Helper: verify token
function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

// GET clients (scoped by companyid)
export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      const result = await pool.query(
        'SELECT * FROM clients WHERE clientid = $1 AND companyid = $2',
        [Number(id), decoded.companyid]
      );
      if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(result.rows[0]);
    }
    // support pagination: ?page=1&pageSize=10
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const dataResult = await pool.query(
      'SELECT * FROM clients WHERE companyid = $1 ORDER BY clientid LIMIT $2 OFFSET $3',
      [decoded.companyid, pageSize, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*)::int as total FROM clients WHERE companyid = $1',
      [decoded.companyid]
    );

    return NextResponse.json({ rows: dataResult.rows, total: countResult.rows[0].total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// POST new client
export async function POST(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { firstname, lastname, email, phone } = await req.json();

    // ✅ Validate firstname
    if (!firstname) return NextResponse.json({ error: "First name is required" }, { status: 400 });
    // ✅ Validate lastname
    if (!lastname) return NextResponse.json({ error: "Last name is required" }, { status: 400 });
    // ✅ Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    // ✅ Validate phone
    if (!phone || !/^\d{7,15}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO clients (firstname, lastname, email, phone, companyid)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [firstname, lastname, email, phone, decoded.companyid]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// PUT update client
export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const { clientid, firstname, lastname, email, phone } = await req.json();

    if (!firstname) return NextResponse.json({ error: "First name is required" }, { status: 400 });
    if (!lastname) return NextResponse.json({ error: "Last name is required" }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!phone || !/^\d{7,15}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    await pool.query(
      `UPDATE clients 
       SET firstname = $1, lastname = $2, email = $3, phone = $4, companyid = $5 
       WHERE clientid = $6 AND companyid = $5`,
      [firstname, lastname, email, phone, decoded.companyid, clientid]
    );

    return NextResponse.json({ message: "Client updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// DELETE client
export async function DELETE(req: Request) {
  try {
    const decoded = verifyToken(req);
    const body = await req.json();
    // support single id: { clientid } or bulk: { ids: [1,2,3] }
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      await pool.query(
        'DELETE FROM clients WHERE clientid = ANY($1::int[]) AND companyid = $2',
        [body.ids, decoded.companyid]
      );
      return NextResponse.json({ message: 'Clients deleted successfully', deleted: body.ids.length });
    }

    const { clientid } = body;
    if (!clientid) return NextResponse.json({ error: 'clientid is required' }, { status: 400 });

    await pool.query(
      'DELETE FROM clients WHERE clientid = $1 AND companyid = $2',
      [clientid, decoded.companyid]
    );

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
