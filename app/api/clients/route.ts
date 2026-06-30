import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getReminderDeliverySettings } from '@/lib/appSettings';

class AuthError extends Error {
  status = 401;
}

// Helper: verify token
function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

function handleApiError(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}

function normalizePhone(phone: unknown) {
  return typeof phone === "string" ? phone.replace(/\D/g, "") : "";
}

function isFutureBirthdate(value: unknown) {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date > today;
}

function getNextBirthdayRunAt(birthdate: string, sendTime: string) {
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  const [hours, minutes, seconds] = String(sendTime || "09:00:00").split(":").map((part) => Number(part || 0));
  const candidate = new Date(now.getFullYear(), birth.getMonth(), birth.getDate(), hours || 0, minutes || 0, seconds || 0, 0);

  if (candidate < now) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return candidate.toISOString();
}

const expectedEmailFormat = "name@example.com";
const expectedPhoneFormat = "7 to 15 digits, numbers only";

// GET clients (scoped by companyid)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      const result = await pool.query(
        'SELECT * FROM clients WHERE clientid = $1',
        [Number(id)]
      );
      if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(result.rows[0]);
    }

    if (url.searchParams.get("distinct") === "1") {
      const valuesResult = await pool.query(
        `SELECT
           COALESCE(array_agg(DISTINCT firstname ORDER BY firstname) FILTER (WHERE firstname IS NOT NULL AND firstname <> ''), '{}') AS firstnames,
           COALESCE(array_agg(DISTINCT lastname ORDER BY lastname) FILTER (WHERE lastname IS NOT NULL AND lastname <> ''), '{}') AS lastnames,
           COALESCE(array_agg(DISTINCT to_char(birthdate, 'MM/DD/YYYY') ORDER BY to_char(birthdate, 'MM/DD/YYYY')) FILTER (WHERE birthdate IS NOT NULL), '{}') AS birthdates
         FROM clients`,
        []
      );

      return NextResponse.json(valuesResult.rows[0] ?? { firstnames: [], lastnames: [], birthdates: [] });
    }

    // support pagination: ?page=1&pageSize=10
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");
    const firstname = url.searchParams.get("firstname") || "";
    const lastname = url.searchParams.get("lastname") || "";
    const birthdate = url.searchParams.get("birthdate") || "";
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const whereClauses: string[] = [];
    const queryValues: Array<string | number> = [];

    if (firstname) {
      queryValues.push(firstname);
      whereClauses.push(`firstname = $${queryValues.length}`);
    }

    if (lastname) {
      queryValues.push(lastname);
      whereClauses.push(`lastname = $${queryValues.length}`);
    }

    if (birthdate) {
      queryValues.push(birthdate);
      whereClauses.push(`to_char(birthdate, 'MM/DD/YYYY') = $${queryValues.length}`);
    }

    queryValues.push(pageSize, offset);

    const dataResult = await pool.query(
      `SELECT * FROM clients${whereClauses.length ? ` WHERE ${whereClauses.join(" AND ")}` : ""} ORDER BY clientid LIMIT $${queryValues.length - 1} OFFSET $${queryValues.length}`,
      queryValues
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM clients${whereClauses.length ? ` WHERE ${whereClauses.join(" AND ")}` : ""}`,
      queryValues.slice(0, queryValues.length - 2)
    );

    return NextResponse.json({ rows: dataResult.rows, total: countResult.rows[0].total });
  } catch (err: any) {
    return handleApiError(err);
  }
}

// POST new client
export async function POST(req: Request) {
  try {
    const { firstname, lastname, email, phone, birthdate, companyId } = await req.json();
    const normalizedPhone = normalizePhone(phone);
    const normalizedCompanyId = Number(companyId) || 1;

    // ✅ Validate firstname
    if (!firstname) return NextResponse.json({ error: "First name is required" }, { status: 400 });
    // ✅ Validate lastname
    if (!lastname) return NextResponse.json({ error: "Last name is required" }, { status: 400 });
    // ✅ Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: `Invalid email format. Expected: ${expectedEmailFormat}` }, { status: 400 });
    }
    // ✅ Validate phone
    if (!normalizedPhone || !/^\d{7,15}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: `Invalid phone number. Expected: ${expectedPhoneFormat}` }, { status: 400 });
    }
    if (!birthdate || isNaN(Date.parse(birthdate))) {
      return NextResponse.json({ error: "Birthdate is required" }, { status: 400 });
    }
    if (isFutureBirthdate(birthdate)) {
      return NextResponse.json({ error: "Birthdate cannot be in the future" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO clients (firstname, lastname, email, phone, birthdate, companyid)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [firstname, lastname, email, normalizedPhone, birthdate, normalizedCompanyId]
    );

    const client = result.rows[0];
    const reminderDelivery = getReminderDeliverySettings();
    const reminderDate = getNextBirthdayRunAt(birthdate, reminderDelivery.sendTime);

    if (reminderDate) {
      const reminderResult = await pool.query(
        `INSERT INTO reminders (clientid, companyid, remindermethod, status, sendtime, isactive, nextrunat)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING reminderid`,
        [
          client.clientid,
          normalizedCompanyId,
          reminderDelivery.channel,
          'Pending',
          `${reminderDelivery.sendTime}:00`,
          true,
          reminderDate,
        ]
      );

      const reminderId = reminderResult.rows[0]?.reminderid;
      if (reminderId) {
        await pool.query(
          `INSERT INTO messages (
            reminderid, companyid, channel, subject, messagebody,
            attachmenturl, attachmentfilename, attachmentmimetype, status, sentat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            reminderId,
            normalizedCompanyId,
            reminderDelivery.channel,
            null,
            '',
            null,
            null,
            null,
            'Draft',
            null,
          ]
        );
      }
    }

    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    return handleApiError(err);
  }
}

// PUT update client
export async function PUT(req: Request) {
  try {
    const { clientid, firstname, lastname, email, phone, birthdate, companyId } = await req.json();
    const normalizedPhone = normalizePhone(phone);
    const normalizedCompanyId = Number(companyId) || 1;

    if (!firstname) return NextResponse.json({ error: "First name is required" }, { status: 400 });
    if (!lastname) return NextResponse.json({ error: "Last name is required" }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: `Invalid email format. Expected: ${expectedEmailFormat}` }, { status: 400 });
    }
    if (!normalizedPhone || !/^\d{7,15}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: `Invalid phone number. Expected: ${expectedPhoneFormat}` }, { status: 400 });
    }
    if (!birthdate || isNaN(Date.parse(birthdate))) {
      return NextResponse.json({ error: "Birthdate is required" }, { status: 400 });
    }
    if (isFutureBirthdate(birthdate)) {
      return NextResponse.json({ error: "Birthdate cannot be in the future" }, { status: 400 });
    }

    await pool.query(
      `UPDATE clients SET firstname = $1, lastname = $2, email = $3, phone = $4, birthdate = $5, companyid = $6
       WHERE clientid = $7`,
      [firstname, lastname, email, normalizedPhone, birthdate, normalizedCompanyId, clientid]
    );

    return NextResponse.json({ message: "Client updated successfully" });
  } catch (err: any) {
    return handleApiError(err);
  }
}

// DELETE client
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    // support single id: { clientid } or bulk: { ids: [1,2,3] }
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      await pool.query(
        'DELETE FROM clients WHERE clientid = ANY($1::int[])',
        [body.ids]
      );
      return NextResponse.json({ message: 'Clients deleted successfully', deleted: body.ids.length });
    }

    const { clientid } = body;
    if (!clientid) return NextResponse.json({ error: 'clientid is required' }, { status: 400 });

    await pool.query(
      'DELETE FROM clients WHERE clientid = $1',
      [clientid]
    );

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (err: any) {
    return handleApiError(err);
  }
}
