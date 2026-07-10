import pool from '@/lib/db';

export type MessageTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  imageUrl?: string;
};

export type EmailProvider = 'mailtrap' | 'gmail';

export type EmailSettings = {
  provider: EmailProvider;
};

export type ReminderChannel = 'Email' | 'WhatsApp';

export type ReminderDeliverySettings = {
  sendTime: string;
  channel: ReminderChannel;
};

export type AppSettings = {
  email: EmailSettings;
  reminderDelivery: ReminderDeliverySettings;
  messageTemplates: {
    activeTemplateId: string;
    templates: MessageTemplate[];
  };
};

export type CompanySettingsRecord = {
  companyid: number;
  emailprovider: EmailProvider;
  emailfrom?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  gmail_user?: string | null;
  gmail_pass?: string | null;
  reminderdelivery: ReminderDeliverySettings;
  messagetemplates: {
    activeTemplateId: string;
    templates: MessageTemplate[];
  };
};

const DEFAULT_TEMPLATE: MessageTemplate = {
  id: 'birthday-default',
  name: 'Default Birthday Template',
  subject: 'Happy Birthday, {{clientName}}!',
  body: 'Happy Birthday {{clientName}}!\n\nEveryone at {{companyName}} wishes you a wonderful day.\n\nBest wishes,',
};

type RawTemplateShape = {
  id?: unknown;
  name?: unknown;
  subject?: unknown;
  body?: unknown;
  imageUrl?: unknown;
};

type RawTemplateCollection = {
  activeTemplateId?: unknown;
  templates?: unknown;
  birthdayDefault?: RawTemplateShape;
};

type CompanySettingsDbRow = {
  companyid?: unknown;
  emailprovider?: unknown;
  emailfrom?: unknown;
  smtp_host?: unknown;
  smtp_port?: unknown;
  smtp_secure?: unknown;
  smtp_user?: unknown;
  smtp_pass?: unknown;
  gmail_user?: unknown;
  gmail_pass?: unknown;
  reminderdelivery?: unknown;
  messagetemplates?: unknown;
};

let ensureCompanySettingsCredentialColumnsPromise: Promise<void> | null = null;

async function ensureCompanySettingsCredentialColumns() {
  if (!ensureCompanySettingsCredentialColumnsPromise) {
    ensureCompanySettingsCredentialColumnsPromise = (async () => {
      await pool.query(
        `ALTER TABLE company_settings
         ADD COLUMN IF NOT EXISTS emailfrom VARCHAR(255),
         ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
         ADD COLUMN IF NOT EXISTS smtp_port INT,
         ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN,
         ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255),
         ADD COLUMN IF NOT EXISTS smtp_pass TEXT,
         ADD COLUMN IF NOT EXISTS gmail_user VARCHAR(255),
         ADD COLUMN IF NOT EXISTS gmail_pass TEXT`
      );
    })().catch((error) => {
      ensureCompanySettingsCredentialColumnsPromise = null;
      throw error;
    });
  }

  await ensureCompanySettingsCredentialColumnsPromise;
}

function normalizeEmailSettings(rawEmail: unknown): EmailSettings {
  const candidate = typeof rawEmail === 'object' && rawEmail !== null ? rawEmail as { provider?: unknown } : {};
  const provider = candidate.provider === 'gmail' ? 'gmail' : 'mailtrap';
  return { provider };
}

function normalizeReminderDelivery(rawReminderDelivery: unknown): ReminderDeliverySettings {
  const candidate = typeof rawReminderDelivery === 'object' && rawReminderDelivery !== null
    ? rawReminderDelivery as { sendTime?: unknown; channel?: unknown }
    : {};

  const sendTime = typeof candidate.sendTime === 'string' && /^\d{2}:\d{2}$/.test(candidate.sendTime)
    ? candidate.sendTime
    : '09:00';
  const channel = candidate.channel === 'WhatsApp' ? 'WhatsApp' : 'Email';

  return { sendTime, channel };
}

function normalizeTemplates(rawTemplates: RawTemplateCollection | undefined): { activeTemplateId: string; templates: MessageTemplate[] } {
  if (Array.isArray(rawTemplates?.templates)) {
    const templates = rawTemplates.templates
      .filter((template): template is RawTemplateShape => typeof template === 'object' && template !== null && 'id' in template && 'name' in template)
      .map((template) => ({
        id: String(template.id),
        name: String(template.name),
        subject: String(template.subject || ''),
        body: String(template.body || ''),
        imageUrl: typeof template.imageUrl === 'string' ? template.imageUrl : '',
      }));

    if (templates.length > 0) {
      const activeTemplateId = templates.some((template: MessageTemplate) => template.id === rawTemplates?.activeTemplateId)
        ? String(rawTemplates.activeTemplateId)
        : templates[0].id;
      return { activeTemplateId, templates };
    }
  }

  if (rawTemplates?.birthdayDefault) {
    return {
      activeTemplateId: DEFAULT_TEMPLATE.id,
      templates: [
        {
          id: DEFAULT_TEMPLATE.id,
          name: String(rawTemplates.birthdayDefault.name || DEFAULT_TEMPLATE.name),
          subject: String(rawTemplates.birthdayDefault.subject || DEFAULT_TEMPLATE.subject),
          body: String(rawTemplates.birthdayDefault.body || DEFAULT_TEMPLATE.body),
          imageUrl: '',
        },
      ],
    };
  }

  return {
    activeTemplateId: DEFAULT_TEMPLATE.id,
    templates: [DEFAULT_TEMPLATE],
  };
}

function normalizeCompanySettingsRow(row: CompanySettingsDbRow): CompanySettingsRecord {
  return {
    companyid: Number(row.companyid),
    emailprovider: row.emailprovider === 'gmail' ? 'gmail' : 'mailtrap',
    emailfrom: typeof row.emailfrom === 'string' ? row.emailfrom : null,
    smtp_host: typeof row.smtp_host === 'string' ? row.smtp_host : null,
    smtp_port: row.smtp_port === null || row.smtp_port === undefined ? null : Number(row.smtp_port),
    smtp_secure: typeof row.smtp_secure === 'boolean' ? row.smtp_secure : null,
    smtp_user: typeof row.smtp_user === 'string' ? row.smtp_user : null,
    smtp_pass: typeof row.smtp_pass === 'string' ? row.smtp_pass : null,
    gmail_user: typeof row.gmail_user === 'string' ? row.gmail_user : null,
    gmail_pass: typeof row.gmail_pass === 'string' ? row.gmail_pass : null,
    reminderdelivery: normalizeReminderDelivery(row.reminderdelivery ?? null),
    messagetemplates: normalizeTemplates(row.messagetemplates ?? undefined),
  };
}

export async function getCompanySettings(companyId: number) {
  await ensureCompanySettingsCredentialColumns();

  const result = await pool.query(
    `SELECT
       companyid,
       emailprovider,
       emailfrom,
       smtp_host,
       smtp_port,
       smtp_secure,
       smtp_user,
       smtp_pass,
       gmail_user,
       gmail_pass,
       reminderdelivery,
       messagetemplates
     FROM company_settings
     WHERE companyid = $1
     LIMIT 1`,
    [companyId]
  );

  if (result.rows[0]) {
    return normalizeCompanySettingsRow(result.rows[0]);
  }

  return {
    companyid: companyId,
    emailprovider: 'mailtrap',
    emailfrom: null,
    smtp_host: null,
    smtp_port: null,
    smtp_secure: null,
    smtp_user: null,
    smtp_pass: null,
    gmail_user: null,
    gmail_pass: null,
    reminderdelivery: { sendTime: '09:00', channel: 'Email' },
    messagetemplates: {
      activeTemplateId: DEFAULT_TEMPLATE.id,
      templates: [DEFAULT_TEMPLATE],
    },
  } as CompanySettingsRecord;
}

export async function upsertCompanySettings(companyId: number, partial: Partial<CompanySettingsRecord>) {
  await ensureCompanySettingsCredentialColumns();

  const current = await getCompanySettings(companyId);
  const emailProvider = partial.emailprovider || current.emailprovider;
  const emailfrom = partial.emailfrom ?? current.emailfrom ?? null;
  const smtp_host = partial.smtp_host ?? current.smtp_host ?? null;
  const smtp_port = partial.smtp_port ?? current.smtp_port ?? null;
  const smtp_secure = partial.smtp_secure ?? current.smtp_secure ?? null;
  const smtp_user = partial.smtp_user ?? current.smtp_user ?? null;
  const smtp_pass = partial.smtp_pass ?? current.smtp_pass ?? null;
  const gmail_user = partial.gmail_user ?? current.gmail_user ?? null;
  const gmail_pass = partial.gmail_pass ?? current.gmail_pass ?? null;
  const reminderDelivery = partial.reminderdelivery || current.reminderdelivery;
  const messageTemplates = partial.messagetemplates || current.messagetemplates;

  const result = await pool.query(
    `INSERT INTO company_settings (
       companyid, emailprovider, emailfrom, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, gmail_user, gmail_pass,
       reminderdelivery, messagetemplates
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (companyid)
     DO UPDATE SET
       emailprovider = EXCLUDED.emailprovider,
       emailfrom = EXCLUDED.emailfrom,
       smtp_host = EXCLUDED.smtp_host,
       smtp_port = EXCLUDED.smtp_port,
       smtp_secure = EXCLUDED.smtp_secure,
       smtp_user = EXCLUDED.smtp_user,
       smtp_pass = EXCLUDED.smtp_pass,
       gmail_user = EXCLUDED.gmail_user,
       gmail_pass = EXCLUDED.gmail_pass,
       reminderdelivery = EXCLUDED.reminderdelivery,
       messagetemplates = EXCLUDED.messagetemplates,
       updatedat = NOW()
     RETURNING companyid, emailprovider, emailfrom, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, gmail_user, gmail_pass, reminderdelivery, messagetemplates`,
    [companyId, emailProvider, emailfrom, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, gmail_user, gmail_pass, reminderDelivery, messageTemplates]
  );

  return normalizeCompanySettingsRow(result.rows[0]);
}
