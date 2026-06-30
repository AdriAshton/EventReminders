import { authenticatedFetch } from "@/lib/authClient";

export type MessageTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  imageUrl?: string;
};

export async function getMessages(page = 1, pageSize = 10) {
  const url = `/api/messages?page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
    String(pageSize),
  )}`;

  const res = await authenticatedFetch(url, {
    method: "GET",
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch messages" };
  }
  return data;
}

export async function getMessage(messageid: number) {
  const res = await authenticatedFetch(`/api/messages?id=${messageid}`, {
    method: "GET",
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch message" };
  }
  return data;
}

export async function addMessage(message: {
  reminderId: number;
  channel: string;
  subject: string;
  messageBody: string;
  status: string;
  sentAt: string | null;
}) {
  const res = await authenticatedFetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to add message" };
  }
  return data;
}

export async function updateMessage(message: {
  messageid: number;
  reminderId: number;
  channel: string;
  subject: string;
  messageBody: string;
  status: string;
  sentAt: string | null;
}) {
  const res = await authenticatedFetch("/api/messages", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to update message" };
  }
  return data;
}

export async function deleteMessage(messageid: number) {
  const res = await authenticatedFetch("/api/messages", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messageid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete message" };
  }
  return data;
}

export async function uploadMessageImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authenticatedFetch("/api/uploads", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to upload image" };
  }

  return data;
}

export async function getMessageTemplates() {
  const res = await authenticatedFetch('/api/settings/message-template', {
    method: 'GET',
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Failed to fetch templates' };
  }

  return data as {
    activeTemplateId: string;
    templates: MessageTemplate[];
    template: MessageTemplate;
  };
}

export async function renderMessageTemplate(templateId: string, reminderId: number) {
  const res = await authenticatedFetch('/api/templates/render', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ templateId, reminderId }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Failed to render template' };
  }

  return data as {
    templateId: string;
    templateName: string;
    values: Record<string, string>;
    subject: string;
    body: string;
  };
}
