"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ensureValidSession } from "@/lib/authClient";

const PUBLIC_PATH_PREFIXES = ["/login", "/forgot", "/reset", "/signup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AuthSessionManager() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (isPublicPath(pathname)) {
      return;
    }

    const validate = () => ensureValidSession();
    const initialTimer = window.setTimeout(validate, 1000);
    const intervalId = window.setInterval(validate, 30000);

    window.addEventListener("focus", validate);
    document.addEventListener("visibilitychange", validate);
    window.addEventListener("storage", validate);
    window.addEventListener("click", validate, true);
    window.addEventListener("keydown", validate, true);
    window.addEventListener("mousemove", validate, true);
    window.addEventListener("scroll", validate, true);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", validate);
      document.removeEventListener("visibilitychange", validate);
      window.removeEventListener("storage", validate);
      window.removeEventListener("click", validate, true);
      window.removeEventListener("keydown", validate, true);
      window.removeEventListener("mousemove", validate, true);
      window.removeEventListener("scroll", validate, true);
    };
  }, [pathname]);

  return null;
}