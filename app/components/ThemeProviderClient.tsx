"use client";
import { useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

type ThemeColor = "purple" | "red" | "green";

function resolveThemeColor(value: string | null): ThemeColor {
  if (value === "red" || value === "green" || value === "purple") {
    return value;
  }
  if (value === "dark" || value === "light") {
    return "purple";
  }
  return "purple";
}

function themeConfig(themeColor: ThemeColor) {
  const colorMap = {
    purple: { primary: "#5b5fe8", secondary: "#10b981", background: "#f4f7fb" },
    red: { primary: "#e11d48", secondary: "#f97316", background: "#fff5f5" },
    green: { primary: "#16a34a", secondary: "#0f766e", background: "#f1fbf4" },
  } as const;

  return colorMap[themeColor];
}

export default function ThemeProviderClient({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [themeColor, setThemeColor] = useState<ThemeColor>("purple");

  const theme = useMemo(() => createTheme({
    palette: {
      mode: "light",
      primary: {
        main: themeConfig(themeColor).primary,
      },
      secondary: {
        main: themeConfig(themeColor).secondary,
      },
      background: {
        default: themeConfig(themeColor).background,
        paper: "rgba(255, 255, 255, 0.86)",
      },
      text: {
        primary: "#1f2937",
        secondary: "#6b7280",
      },
    },
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif",
      h4: {
        fontWeight: 800,
        letterSpacing: "-0.03em",
      },
      h6: {
        fontWeight: 700,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background:
              themeColor === "red"
                ? "radial-gradient(circle at top left, rgba(225,29,72,0.12), transparent 35%), radial-gradient(circle at top right, rgba(249,115,22,0.10), transparent 32%), linear-gradient(180deg, #fff7f7 0%, #ffe4e6 100%)"
                : themeColor === "green"
                  ? "radial-gradient(circle at top left, rgba(22,163,74,0.12), transparent 35%), radial-gradient(circle at top right, rgba(15,118,110,0.10), transparent 32%), linear-gradient(180deg, #f7fdf8 0%, #dcfce7 100%)"
                  : "radial-gradient(circle at top left, rgba(91,95,232,0.12), transparent 35%), radial-gradient(circle at top right, rgba(16,185,129,0.10), transparent 32%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: "1px solid rgba(148,163,184,0.16)",
            boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
            backdropFilter: "blur(14px)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          fullWidth: true,
          size: "small",
        },
      },
      MuiSelect: {
        defaultProps: {
          size: "small",
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 999,
            paddingInline: 18,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            background: "rgba(91,95,232,0.06)",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 800,
            color: "#374151",
          },
        },
      },
    },
  }), [themeColor]);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("themeColor") || localStorage.getItem("theme");
      const resolved = resolveThemeColor(stored);
      setThemeColor(resolved);
      applyTheme(resolved);

      const onChange = () => {
        const v = localStorage.getItem("themeColor") || localStorage.getItem("theme");
        const resolvedChange = resolveThemeColor(v);
        setThemeColor(resolvedChange);
        applyTheme(resolvedChange);
      };

      window.addEventListener("theme-change", onChange);
      return () => window.removeEventListener("theme-change", onChange);
    } catch (e) {
      console.error(e);
    }
  }, []);

  function applyTheme(t: ThemeColor) {
    const el = document.documentElement;
    if (!el) return;
    el.classList.remove("theme-purple", "theme-red", "theme-green");
    el.classList.add(`theme-${t}`);
  }

  if (!mounted) return <>{children}</>;
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
