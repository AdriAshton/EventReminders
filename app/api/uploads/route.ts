import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { put } from "@vercel/blob";

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
    console.log('uploads route: request received', {
      at: new Date().toISOString(),
      contentType: req.headers.get('content-type'),
      hasAuth: Boolean(req.headers.get('authorization')),
    });

    const formData = await req.formData();
    const file = formData.get("file");

    console.log('uploads route: form data parsed', {
      hasFile: file instanceof File,
      fileName: file instanceof File ? file.name : null,
      fileType: file instanceof File ? file.type : null,
      fileSize: file instanceof File ? file.size : null,
    });

    if (!(file instanceof File)) {
      console.log('uploads route: missing file');
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      console.log('uploads route: invalid file type', { fileType: file.type });
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    console.log('uploads route: starting image processing');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });

    console.log('uploads route: image processed', {
      outputBytes: processed.data.length,
      outputWidth: processed.info.width,
      outputHeight: processed.info.height,
    });

    const safeName = sanitizeFileName(file.name || "upload");
    const baseName = safeName.replace(/\.[^.]+$/, "") || "upload";
    const fileName = `${Date.now()}-${randomUUID()}-${baseName}.webp`;

    console.log('uploads route: uploading to blob', {
      fileName,
      blobPath: `messages/${fileName}`,
    });

    const blob = await put(`messages/${fileName}`, processed.data, {
      access: "public",
      contentType: "image/webp",
    });

    console.log('uploads route: blob upload complete', {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });

    return NextResponse.json({
      url: blob.url,
      fileName: fileName,
      mimeType: "image/webp",
      size: processed.data.length,
    });
  } catch (err: any) {
    const status = err?.message === "Unauthorized" ? 401 : 500;
    console.error('uploads route: upload failed', {
      message: err?.message || String(err),
      stack: err?.stack || null,
    });
    return NextResponse.json({ error: err.message || "Upload failed" }, { status });
  }
}