import type { Metadata } from "next";
import "./globals.css";
import AuthSessionManager from "./components/AuthSessionManager";
import ThemeProviderClient from "./components/ThemeProviderClient";

export const metadata: Metadata = {
  title: "Birthday Reminders",
  description: "Birthday reminders, clients, and messaging management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProviderClient>{children}</ThemeProviderClient>
        <AuthSessionManager />
      </body>
    </html>
  );
}
