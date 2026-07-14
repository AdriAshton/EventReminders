import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
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
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const errorMessage = 'Missing BLOB_READ_WRITE_TOKEN in the deployed environment';
      console.error('uploads route: missing BLOB_READ_WRITE_TOKEN');
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const safeName = sanitizeFileName(file.name || "upload");
    const baseName = safeName.replace(/\.[^.]+$/, "") || "upload";
    const extension = safeName.split(".").pop() || "bin";
    const fileName = `${Date.now()}-${randomUUID()}-${baseName}.${extension}`;

    console.log('uploads route: uploading to blob', {
      fileName,
      blobPath: `messages/${fileName}`,
    });

    const blob = await put(`messages/${fileName}`, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    console.log('uploads route: blob upload complete', {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });

    return NextResponse.json({
      url: blob.url,
      fileName: fileName,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  } catch (err: any) {
    const status = err?.message === "Unauthorized" ? 401 : 500;
    console.error('uploads route: upload failed', {
      message: err?.message || String(err),
      stack: err?.stack || null,
    });
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status });
  }
}