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
    const role = String(decoded.role || "").toLowerCase();

    const result = role === "administrator"
      ? await pool.query("SELECT * FROM companies ORDER BY companyid DESC")
      : await pool.query("SELECT * FROM companies ORDER BY companyid DESC");

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
    const normalizedCompanyName = typeof companyname === "string" ? companyname.trim() : "";
    const normalizedContactEmail = typeof contactemail === "string" ? contactemail.trim() : "";
    const normalizedContactPhone = typeof contactphone === "string" ? contactphone.trim() : "";

    // Validation
    if (!normalizedCompanyName) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    if (!normalizedContactEmail) {
      return NextResponse.json({ error: "Contact email is required" }, { status: 400 });
    }
    if (!normalizedContactPhone) {
      return NextResponse.json({ error: "Contact phone is required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContactEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!/^\d{7,15}$/.test(normalizedContactPhone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO companies (companyname, contactemail, contactphone)
       VALUES ($1, $2, $3) RETURNING *`,
      [normalizedCompanyName, normalizedContactEmail, normalizedContactPhone]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    return NextResponse.json({ error: err?.message || "Failed to create company" }, { status: 500 });
  }
}

// ✅ PUT update company
export async function PUT(req: Request) {
  try {
    verifyToken(req);
    const { companyid, companyname, contactemail, contactphone } = await req.json();
    const normalizedCompanyName = typeof companyname === "string" ? companyname.trim() : "";
    const normalizedContactEmail = typeof contactemail === "string" ? contactemail.trim() : "";
    const normalizedContactPhone = typeof contactphone === "string" ? contactphone.trim() : "";

    if (!normalizedCompanyName) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    if (!normalizedContactEmail) {
      return NextResponse.json({ error: "Contact email is required" }, { status: 400 });
    }
    if (!normalizedContactPhone) {
      return NextResponse.json({ error: "Contact phone is required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContactEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!/^\d{7,15}$/.test(normalizedContactPhone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    await pool.query(
      `UPDATE companies
       SET companyname = $1, contactemail = $2, contactphone = $3, updatedat = NOW()
       WHERE companyid = $4`,
      [normalizedCompanyName, normalizedContactEmail, normalizedContactPhone, companyid]
    );

    return NextResponse.json({ message: "Company updated successfully" });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    return NextResponse.json({ error: err?.message || "Failed to update company" }, { status: 500 });
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
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    return NextResponse.json({ error: err?.message || "Failed to delete company" }, { status: 500 });
  }
}
