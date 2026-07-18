import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

function readEnvValue(key: string) {
  const envPath = path.join(__dirname, ".env.local");

  if (!fs.existsSync(envPath)) {
    return undefined;
  }

  const envFile = fs.readFileSync(envPath, "utf8");
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, "m"));

  return match?.[1]?.trim().replace(/^['\"]|['\"]$/g, "");
}

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL || readEnvValue("DATABASE_URL"),
    JWT_SECRET: process.env.JWT_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_PASS: process.env.GMAIL_PASS,
    APP_URL: process.env.APP_URL,
    JOB_SECRET: process.env.JOB_SECRET,
  },
};

export default nextConfig;
