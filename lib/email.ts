import nodemailer from 'nodemailer';
import sendgrid from '@sendgrid/mail';
import { getCompanySettings } from '@/lib/appSettings';

type MailTransport = ReturnType<typeof nodemailer.createTransport>;

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
};

function envValue(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : value;
}

function buildMailtrapTransport() {
  return nodemailer.createTransport({
    host: envValue('SMTP_HOST'),
    port: Number(envValue('SMTP_PORT') || 587),
    secure: String(envValue('SMTP_SECURE')) === 'true',
    auth: envValue('SMTP_USER')
      ? { user: envValue('SMTP_USER'), pass: envValue('SMTP_PASS') }
      : undefined,
  });
}

function buildGmailTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: envValue('GMAIL_USER')
      ? { user: envValue('GMAIL_USER'), pass: envValue('GMAIL_PASS') }
      : undefined,
  });
}

async function sendBySendGrid(payload: EmailPayload) {
  sendgrid.setApiKey(envValue('SENDGRID_API_KEY') || '');
  return sendgrid.send({
    ...payload,
    from: payload.from || envValue('EMAIL_FROM') || 'no-reply@example.com',
  });
}

async function sendByTransport(payload: EmailPayload, transport: MailTransport) {
  return transport.sendMail({
    ...payload,
    from: payload.from || envValue('EMAIL_FROM') || envValue('GMAIL_USER') || 'no-reply@example.com',
  });
}

export async function sendEmail(payload: EmailPayload, companyId?: number) {
  const emailSettings = companyId ? (await getCompanySettings(companyId)).emailprovider : 'mailtrap';

  if (emailSettings === 'gmail') {
    if (!envValue('GMAIL_USER') || !envValue('GMAIL_PASS')) {
      throw new Error('Gmail credentials are not configured');
    }
    return sendByTransport(payload, buildGmailTransport());
  }

  if (envValue('SMTP_HOST') && envValue('SMTP_USER')) {
    return sendByTransport(payload, buildMailtrapTransport());
  }

  if (envValue('SENDGRID_API_KEY')) {
    return sendBySendGrid(payload);
  }

  throw new Error('No email provider is configured');
}