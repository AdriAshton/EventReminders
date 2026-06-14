import { NextResponse } from 'next/server';
import {
  deleteMessageTemplate,
  getMessageTemplates,
  type MessageTemplate,
  setActiveMessageTemplate,
  upsertMessageTemplate,
} from '@/lib/appSettings';

export async function GET() {
  const settings = getMessageTemplates();
  return NextResponse.json({
    activeTemplateId: settings.activeTemplateId,
    templates: settings.templates,
    template:
      settings.templates.find((item: MessageTemplate) => item.id === settings.activeTemplateId) ||
      settings.templates[0],
  });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const templateId = body?.id || body?.templateId || body?.activeTemplateId;
    if (!templateId) {
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
    }

    body?.setActiveOnly
      ? setActiveMessageTemplate(String(templateId))
      : upsertMessageTemplate({
          id: String(templateId),
          name: body?.name || 'Untitled Template',
          subject: body?.subject || '',
          body: body?.body || '',
        });

    if (body?.setActive !== false) {
      setActiveMessageTemplate(String(templateId));
    }

    const settings = getMessageTemplates();

    return NextResponse.json({
      activeTemplateId: settings.activeTemplateId,
      templates: settings.templates,
      template:
        settings.templates.find((item: MessageTemplate) => item.id === settings.activeTemplateId) ||
        settings.templates[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    if (!body?.templateId) {
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
    }

    const settings = deleteMessageTemplate(String(body.templateId));
    return NextResponse.json({
      activeTemplateId: settings.activeTemplateId,
      templates: settings.templates,
      template:
        settings.templates.find((item: MessageTemplate) => item.id === settings.activeTemplateId) ||
        settings.templates[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 });
  }
}