import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionManager from "./components/AuthSessionManager";
import ThemeProviderClient from "./components/ThemeProviderClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Birthday Reminders",
  description: "Birthday reminders, clients, events, and messaging management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProviderClient>{children}</ThemeProviderClient>
        <AuthSessionManager />
      </body>
    </html>
  );
}
