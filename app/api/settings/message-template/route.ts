import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import {
  getCompanySettings,
  type MessageTemplate,
  upsertCompanySettings,
} from '@/lib/appSettings';
import { getServerEnv } from '@/lib/serverEnv';

function verifyToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  const jwtSecret = getServerEnv('JWT_SECRET') || 'yourSuperSecretKey123';
  return jwt.verify(token, jwtSecret) as any;
}

export async function GET(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = Number(decoded?.companyid);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'Company access is required' }, { status: 403 });
    }

    const settings = await getCompanySettings(companyId);
    return NextResponse.json({
      activeTemplateId: settings.messagetemplates.activeTemplateId,
      templates: settings.messagetemplates.templates,
      template:
        settings.messagetemplates.templates.find((item: MessageTemplate) => item.id === settings.messagetemplates.activeTemplateId) ||
        settings.messagetemplates.templates[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: err?.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = Number(decoded?.companyid);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'Company access is required' }, { status: 403 });
    }

    const body = await req.json();
    const templateId = body?.id || body?.templateId || body?.activeTemplateId;
    if (!templateId) {
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
    }

    const settings = await getCompanySettings(companyId);
    const templates = [...settings.messagetemplates.templates];
    const existingIndex = templates.findIndex((item) => item.id === String(templateId));

    if (body?.setActiveOnly) {
      await upsertCompanySettings(companyId, {
        messagetemplates: {
          activeTemplateId: String(templateId),
          templates,
        },
      });
    } else {
      const nextTemplate = {
        id: String(templateId),
        name: body?.name || 'Untitled Template',
        subject: body?.subject || '',
        body: body?.body || '',
        imageUrl: body?.imageUrl || '',
      };

      if (existingIndex >= 0) {
        templates[existingIndex] = { ...templates[existingIndex], ...nextTemplate, imageUrl: nextTemplate.imageUrl || '' };
      } else {
        templates.push({ ...nextTemplate, imageUrl: nextTemplate.imageUrl || '' });
      }

      await upsertCompanySettings(companyId, {
        messagetemplates: {
          activeTemplateId: body?.setActive === false ? settings.messagetemplates.activeTemplateId : String(templateId),
          templates: templates.length ? templates : settings.messagetemplates.templates,
        },
      });
    }

    if (body?.setActive !== false) {
      await upsertCompanySettings(companyId, {
        messagetemplates: {
          activeTemplateId: String(templateId),
          templates: (await getCompanySettings(companyId)).messagetemplates.templates,
        },
      });
    }

    const refreshed = await getCompanySettings(companyId);

    return NextResponse.json({
      activeTemplateId: refreshed.messagetemplates.activeTemplateId,
      templates: refreshed.messagetemplates.templates,
      template:
        refreshed.messagetemplates.templates.find((item: MessageTemplate) => item.id === refreshed.messagetemplates.activeTemplateId) ||
        refreshed.messagetemplates.templates[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const decoded = verifyToken(req);
    const companyId = Number(decoded?.companyid);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'Company access is required' }, { status: 403 });
    }

    const body = await req.json();
    if (!body?.templateId) {
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
    }

    const settings = await getCompanySettings(companyId);
    const nextTemplates = settings.messagetemplates.templates.filter((item: MessageTemplate) => item.id !== String(body.templateId));
    const nextActiveTemplateId = settings.messagetemplates.activeTemplateId === String(body.templateId)
      ? (nextTemplates[0]?.id || settings.messagetemplates.activeTemplateId)
      : settings.messagetemplates.activeTemplateId;

    const updated = await upsertCompanySettings(companyId, {
      messagetemplates: {
        activeTemplateId: nextActiveTemplateId,
        templates: nextTemplates.length ? nextTemplates : settings.messagetemplates.templates,
      },
    });
    return NextResponse.json({
      activeTemplateId: updated.messagetemplates.activeTemplateId,
      templates: updated.messagetemplates.templates,
      template:
        updated.messagetemplates.templates.find((item: MessageTemplate) => item.id === updated.messagetemplates.activeTemplateId) ||
        updated.messagetemplates.templates[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 });
  }
}