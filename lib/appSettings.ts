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

function normalizeCompanySettingsRow(row: any): CompanySettingsRecord {
  return {
    companyid: Number(row.companyid),
    emailprovider: row.emailprovider === 'gmail' ? 'gmail' : 'mailtrap',
    reminderdelivery: normalizeReminderDelivery(row.reminderdelivery ?? null),
    messagetemplates: normalizeTemplates(row.messagetemplates ?? null),
  };
}

export async function getCompanySettings(companyId: number) {
  const result = await pool.query(
    `SELECT companyid, emailprovider, reminderdelivery, messagetemplates
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
    reminderdelivery: { sendTime: '09:00', channel: 'Email' },
    messagetemplates: {
      activeTemplateId: DEFAULT_TEMPLATE.id,
      templates: [DEFAULT_TEMPLATE],
    },
  } as CompanySettingsRecord;
}

export async function upsertCompanySettings(companyId: number, partial: Partial<CompanySettingsRecord>) {
  const current = await getCompanySettings(companyId);
  const emailProvider = partial.emailprovider || current.emailprovider;
  const reminderDelivery = partial.reminderdelivery || current.reminderdelivery;
  const messageTemplates = partial.messagetemplates || current.messagetemplates;

  const result = await pool.query(
    `INSERT INTO company_settings (companyid, emailprovider, reminderdelivery, messagetemplates)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (companyid)
     DO UPDATE SET
       emailprovider = EXCLUDED.emailprovider,
       reminderdelivery = EXCLUDED.reminderdelivery,
       messagetemplates = EXCLUDED.messagetemplates,
       updatedat = NOW()
     RETURNING companyid, emailprovider, reminderdelivery, messagetemplates`,
    [companyId, emailProvider, reminderDelivery, messageTemplates]
  );

  return normalizeCompanySettingsRow(result.rows[0]);
}
