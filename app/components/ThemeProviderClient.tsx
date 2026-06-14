"use client";
import { useEffect, useState } from "react";

export default function ThemeProviderClient({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("theme");
      applyTheme(stored === "dark" ? "dark" : "light");

      const onChange = () => {
        const v = localStorage.getItem("theme");
        applyTheme(v === "dark" ? "dark" : "light");
      };

      window.addEventListener("theme-change", onChange);
      return () => window.removeEventListener("theme-change", onChange);
    } catch (e) {
      console.error(e);
    }
  }, []);

  function applyTheme(t: "dark" | "light") {
    const el = document.documentElement;
    if (!el) return;
    el.classList.remove("theme-dark", "theme-light");
    el.classList.add(t === "dark" ? "theme-dark" : "theme-light");
  }

  if (!mounted) return <>{children}</>;
  return <>{children}</>;
}
