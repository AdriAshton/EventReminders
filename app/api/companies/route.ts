import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

// Helper: verify token
function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

// ✅ GET companies (scoped by user’s companyid if needed)
export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);

    // If you want to restrict to only the logged-in company:
    const result = await pool.query(
      "SELECT * FROM companies WHERE companyid = $1",
      [decoded.companyid]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// ✅ POST new company
export async function POST(req: Request) {
  try {
    verifyToken(req); // only admins should be allowed ideally
    const { companyname, contactemail, contactphone } = await req.json();

    // Validation
    if (!companyname) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    if (contactemail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactemail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (contactphone && !/^\d{7,15}$/.test(contactphone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO companies (companyname, contactemail, contactphone)
       VALUES ($1, $2, $3) RETURNING *`,
      [companyname, contactemail, contactphone]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// ✅ PUT update company
export async function PUT(req: Request) {
  try {
    verifyToken(req);
    const { companyid, companyname, contactemail, contactphone } = await req.json();

    if (!companyname) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    if (contactemail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactemail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (contactphone && !/^\d{7,15}$/.test(contactphone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    await pool.query(
      `UPDATE companies
       SET companyname = $1, contactemail = $2, contactphone = $3, updatedat = NOW()
       WHERE companyid = $4`,
      [companyname, contactemail, contactphone, companyid]
    );

    return NextResponse.json({ message: "Company updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// ✅ DELETE company
export async function DELETE(req: Request) {
  try {
    verifyToken(req);
    const { companyid } = await req.json();

    await pool.query("DELETE FROM companies WHERE companyid = $1", [companyid]);

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
