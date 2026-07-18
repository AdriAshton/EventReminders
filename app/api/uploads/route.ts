import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getServerEnv } from '@/lib/serverEnv';

export const runtime = "nodejs";

function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  const jwtSecret = getServerEnv('JWT_SECRET') || 'yourSuperSecretKey123';
  return jwt.verify(token, jwtSecret) as any;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function saveLocalUpload(file: File, fileName: string) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "messages");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const targetPath = path.join(uploadDir, fileName);
  await writeFile(targetPath, buffer);

  return `/uploads/messages/${fileName}`;
}

export async function POST(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const isLocalhostRequest = requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1";

    console.log('uploads route: request received', {
      at: new Date().toISOString(),
      contentType: req.headers.get('content-type'),
      hasAuth: Boolean(req.headers.get('authorization')),
      isLocalhostRequest,
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

    const safeName = sanitizeFileName(file.name || "upload");
    const baseName = safeName.replace(/\.[^.]+$/, "") || "upload";
    const extension = safeName.split(".").pop() || "bin";
    const fileName = `${Date.now()}-${randomUUID()}-${baseName}.${extension}`;

    const isDevelopment = process.env.NODE_ENV !== "production";
    const hasBlobCredentials = Boolean(
      process.env.BLOB_PUBLIC_STORE_ID ||
      process.env.BLOB_STORE_ID ||
      process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_OIDC_TOKEN,
    );

    if (isLocalhostRequest || (isDevelopment && !hasBlobCredentials)) {
      const localUrl = await saveLocalUpload(file, fileName);
      console.log('uploads route: saved locally', {
        fileName,
        localUrl,
      });

      return NextResponse.json({
        url: localUrl,
        fileName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      });
    }

    console.log('uploads route: uploading to blob', {
      fileName,
      blobPath: `messages/${fileName}`,
    });

    const { put } = await import("@vercel/blob");

    const blob = await put(`messages/${fileName}`, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
      addRandomSuffix: true,
      storeId: process.env.BLOB_PUBLIC_STORE_ID || process.env.BLOB_STORE_ID,
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