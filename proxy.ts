import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { getServerEnv } from "@/lib/serverEnv";

const protectedPagePrefixes = [
  "/dashboard",
  "/clients",
  "/companies",
  "/messages",
  "/reminders",
  "/settings",
  "/users",
];

const protectedApiPrefixes = [
  "/api/clients",
  "/api/companies",
  "/api/messages",
  "/api/reminders",
  "/api/templates/render",
  "/api/uploads",
  "/api/users",
  "/api/users/settings",
];

function getTokenPayload(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("auth")?.value;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : cookieToken;
  const jwtSecret = getServerEnv("JWT_SECRET") || "yourSuperSecretKey123";

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, jwtSecret) as { role?: string } | string;
  } catch {
    return null;
  }
}

function isPrivilegedRole(role: unknown) {
  const normalized = String(role || "").toLowerCase();
  return normalized === "administrator" || normalized === "owner";
}

// ✅ Named export "proxy" function
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (protectedPagePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (pathname.startsWith("/users/invites")) {
      const payload = getTokenPayload(req);
      if (!payload) {
        return NextResponse.redirect(new URL("/login?reason=expired", req.url));
      }

      return NextResponse.next();
    }

    const payload = getTokenPayload(req);
    if (!payload) {
      return NextResponse.redirect(new URL("/login?reason=expired", req.url));
    }

    if (pathname.startsWith("/companies") && !isPrivilegedRole(typeof payload === "string" ? payload : payload.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (pathname.startsWith("/users") && !isPrivilegedRole(typeof payload === "string" ? payload : payload.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
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
    "/api/companies/:path*",
    "/api/messages/:path*",
    "/api/reminders/:path*",
    "/api/templates/render/:path*",
    "/api/uploads/:path*",
    "/api/users/:path*",
    "/api/users/settings/:path*",
    "/dashboard/:path*",
    "/clients/:path*",
    "/companies/:path*",
    "/messages/:path*",
    "/reminders/:path*",
    "/settings/:path*",
    "/users/:path*",
  ],
};
