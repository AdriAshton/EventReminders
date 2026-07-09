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
  const companySettings = companyId ? await getCompanySettings(companyId) : null;
  const emailSettings = companySettings?.emailprovider || 'mailtrap';

  if (emailSettings === 'gmail') {
    const gmailUser = companySettings?.gmail_user || envValue('GMAIL_USER');
    const gmailPass = companySettings?.gmail_pass || envValue('GMAIL_PASS');
    if (!gmailUser || !gmailPass) {
      throw new Error('Gmail credentials are not configured');
    }
    return sendByTransport(payload, nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    }));
  }

  const smtpHost = companySettings?.smtp_host || envValue('SMTP_HOST');
  const smtpUser = companySettings?.smtp_user || envValue('SMTP_USER');
  const smtpPass = companySettings?.smtp_pass || envValue('SMTP_PASS');
  const smtpPort = companySettings?.smtp_port || Number(envValue('SMTP_PORT') || 587);
  const smtpSecure = companySettings?.smtp_secure ?? String(envValue('SMTP_SECURE')) === 'true';

  if (smtpHost && smtpUser) {
    return sendByTransport(payload, nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass || '' },
    }));
  }

  if (envValue('SENDGRID_API_KEY')) {
    return sendBySendGrid(payload);
  }

  throw new Error('No email provider is configured');
}