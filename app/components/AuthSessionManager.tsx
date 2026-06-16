"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ensureValidSession } from "@/lib/authClient";

const PUBLIC_PATH_PREFIXES = ["/login", "/forgot", "/reset"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AuthSessionManager() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (isPublicPath(pathname)) {
      return;
    }

    ensureValidSession();

    const validate = () => ensureValidSession();
    const intervalId = window.setInterval(validate, 30000);

    window.addEventListener("focus", validate);
    document.addEventListener("visibilitychange", validate);
    window.addEventListener("storage", validate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", validate);
      document.removeEventListener("visibilitychange", validate);
      window.removeEventListener("storage", validate);
    };
  }, [pathname]);

  return null;
}