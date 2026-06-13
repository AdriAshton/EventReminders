import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

function getTokenPayload(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("auth")?.value;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : cookieToken;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as any;
  } catch {
    return null;
  }
}

// ✅ Named export "proxy" function
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/companies") || pathname.startsWith("/users")) {
    const payload = getTokenPayload(req);
    if (!payload) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (String(payload.role || "").toLowerCase() !== "administrator") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/events") ||
    pathname.startsWith("/api/reminders") ||
    pathname.startsWith("/api/messages") ||
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/companies")
  ) {
    const payload = getTokenPayload(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next(); // allow other routes
}

// ✅ Matcher config
export const config = {
  matcher: [
    "/api/clients/:path*",
    "/api/events/:path*",
    "/api/reminders/:path*",
    "/api/messages/:path*",
    "/api/users/:path*",
    "/api/companies/:path*",
    "/companies/:path*",
    "/users/:path*",
  ],
};
