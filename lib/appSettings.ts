import fs from 'fs';
import path from 'path';

const FILE = path.resolve(process.cwd(), 'app_settings.json');

export type MessageTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

const DEFAULT_TEMPLATE: MessageTemplate = {
  id: 'birthday-default',
  name: 'Default Birthday Template',
  subject: 'Happy Birthday, {{clientName}}!',
  body: 'Happy Birthday {{clientName}}!\n\nEveryone at {{companyName}} wishes you a wonderful day.\n\nBest wishes,\n{{senderName}}',
};

function getDefaultSettings() {
  return {
    twoFactorGlobal: false,
    messageTemplates: {
      activeTemplateId: DEFAULT_TEMPLATE.id,
      templates: [DEFAULT_TEMPLATE],
    },
  };
}

function normalizeTemplates(rawTemplates: any): { activeTemplateId: string; templates: MessageTemplate[] } {
  if (Array.isArray(rawTemplates?.templates)) {
    const templates = rawTemplates.templates
      .filter((template: any) => template && template.id && template.name)
      .map((template: any) => ({
        id: String(template.id),
        name: String(template.name),
        subject: String(template.subject || ''),
        body: String(template.body || ''),
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
        },
      ],
    };
  }

  return {
    activeTemplateId: DEFAULT_TEMPLATE.id,
    templates: [DEFAULT_TEMPLATE],
  };
}

export function readSettings(): any {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify(getDefaultSettings(), null, 2));
    }
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const templates = normalizeTemplates(parsed?.messageTemplates);
    return {
      ...getDefaultSettings(),
      ...parsed,
      messageTemplates: templates,
    };
  } catch (e) {
    return getDefaultSettings();
  }
}

export function writeSettings(obj: any) {
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
    messageTemplates.templates[existingIndex] = template;
  } else {
    messageTemplates.templates.push(template);
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
