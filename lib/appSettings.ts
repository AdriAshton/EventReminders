import fs from 'fs';
import path from 'path';

const FILE = path.resolve(process.cwd(), 'app_settings.json');

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
  twoFactorGlobal: boolean;
  email: EmailSettings;
  reminderDelivery: ReminderDeliverySettings;
  messageTemplates: {
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

type RawSettingsShape = {
  email?: unknown;
  reminderDelivery?: unknown;
  messageTemplates?: RawTemplateCollection;
  twoFactorGlobal?: unknown;
};

function getDefaultSettings(): AppSettings {
  return {
    twoFactorGlobal: false,
    email: {
      provider: 'mailtrap' as EmailProvider,
    },
    reminderDelivery: {
      sendTime: '09:00',
      channel: 'Email',
    },
    messageTemplates: {
      activeTemplateId: DEFAULT_TEMPLATE.id,
      templates: [DEFAULT_TEMPLATE],
    },
  };
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

export function readSettings(): AppSettings {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify(getDefaultSettings(), null, 2));
    }
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}') as RawSettingsShape;
    const templates = normalizeTemplates(parsed?.messageTemplates);
    const email = normalizeEmailSettings(parsed?.email);
    const reminderDelivery = normalizeReminderDelivery(parsed?.reminderDelivery);
    const twoFactorGlobal = parsed?.twoFactorGlobal === true;
    return {
      ...getDefaultSettings(),
      ...parsed,
      twoFactorGlobal,
      email,
      reminderDelivery,
      messageTemplates: templates,
    };
  } catch {
    return getDefaultSettings();
  }
}

export function writeSettings(obj: unknown) {
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
}

export function getMessageTemplates() {
  const settings = readSettings();
  return settings.messageTemplates as { activeTemplateId: string; templates: MessageTemplate[] };
}

export function upsertMessageTemplate(template: MessageTemplate) {
  const settings = readSettings();
  const messageTemplates = getMessageTemplates();
  const existingIndex = messageTemplates.templates.findIndex((item: MessageTemplate) => item.id === template.id);

  if (existingIndex >= 0) {
    messageTemplates.templates[existingIndex] = { ...messageTemplates.templates[existingIndex], ...template, imageUrl: template.imageUrl || '' };
  } else {
    messageTemplates.templates.push({ ...template, imageUrl: template.imageUrl || '' });
  }

  if (!messageTemplates.activeTemplateId) {
    messageTemplates.activeTemplateId = template.id;
  }

  settings.messageTemplates = messageTemplates;
  writeSettings(settings);
  return settings.messageTemplates;
}

export function deleteMessageTemplate(templateId: string) {
  const settings = readSettings();
  const messageTemplates = getMessageTemplates();
  messageTemplates.templates = messageTemplates.templates.filter((item: MessageTemplate) => item.id !== templateId);
  if (messageTemplates.templates.length === 0) {
    messageTemplates.templates = [DEFAULT_TEMPLATE];
    messageTemplates.activeTemplateId = DEFAULT_TEMPLATE.id;
  } else if (messageTemplates.activeTemplateId === templateId) {
    messageTemplates.activeTemplateId = messageTemplates.templates[0].id;
  }
  settings.messageTemplates = messageTemplates;
  writeSettings(settings);
  return settings.messageTemplates;
}

export function setActiveMessageTemplate(templateId: string) {
  const settings = readSettings();
  const messageTemplates = getMessageTemplates();
  if (messageTemplates.templates.some((item: MessageTemplate) => item.id === templateId)) {
    messageTemplates.activeTemplateId = templateId;
    settings.messageTemplates = messageTemplates;
    writeSettings(settings);
  }
  return settings.messageTemplates;
}

export function getEmailSettings(): EmailSettings {
  const settings = readSettings();
  return normalizeEmailSettings(settings.email);
}

export function getReminderDeliverySettings(): ReminderDeliverySettings {
  const settings = readSettings();
  return normalizeReminderDelivery(settings.reminderDelivery);
}

export function setEmailProvider(provider: EmailProvider) {
  const settings = readSettings();
  settings.email = normalizeEmailSettings({ provider });
  writeSettings(settings);
  return settings.email as EmailSettings;
}

export function setReminderDeliverySettings(reminderDelivery: ReminderDeliverySettings) {
  const settings = readSettings();
  settings.reminderDelivery = normalizeReminderDelivery(reminderDelivery);
  writeSettings(settings);
  return settings.reminderDelivery as ReminderDeliverySettings;
}
