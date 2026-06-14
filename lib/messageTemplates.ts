export type TemplateValues = Record<string, string>;

export function renderTemplate(input: string, values: TemplateValues) {
  return input.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => values[key] || `{{${key}}}`);
}

export function createTemplateId(name: string) {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `template-${Date.now()}`;
}
