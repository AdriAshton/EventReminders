import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// ✅ Named export "proxy" function
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/clients") || req.nextUrl.pathname.startsWith("/api/events")) {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      return NextResponse.next(); // allow request
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
    }
  }

  return NextResponse.next(); // allow other routes
}

// ✅ Matcher config
export const config = {
  matcher: ["/api/clients/:path*", "/api/events/:path*", "/api/reminders/:path*"],
};
