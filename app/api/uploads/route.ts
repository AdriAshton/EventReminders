import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import sharp from "sharp";

export const runtime = "nodejs";

function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "messages");
    await mkdir(uploadsDir, { recursive: true });

    const safeName = sanitizeFileName(file.name || "upload");
    const baseName = safeName.replace(/\.[^.]+$/, "") || "upload";
    const fileName = `${Date.now()}-${randomUUID()}-${baseName}.webp`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, processed.data);

    return NextResponse.json({
      url: `/uploads/messages/${fileName}`,
      fileName: fileName,
      mimeType: "image/webp",
      size: processed.data.length,
    });
  } catch (err: any) {
    const status = err?.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: err.message || "Upload failed" }, { status });
  }
}