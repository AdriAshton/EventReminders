import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

export async function GET(_req: Request, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  const parts = params.path || [];

  if (parts.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const root = path.join(process.cwd(), "public", "uploads");
  const filePath = path.normalize(path.join(root, ...parts));
  if (!filePath.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": getContentType(filePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}