function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMessages(page = 1, pageSize = 10) {
  const url = `/api/messages?page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
    String(pageSize),
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch messages" };
  }
  return data;
}

export async function getMessage(messageid: number) {
  const res = await fetch(`/api/messages?id=${messageid}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch message" };
  }
  return data;
}

export async function addMessage(message: {
  reminderId: number;
  companyId: number;
  channel: string;
  subject: string;
  messageBody: string;
  attachmentUrl: string;
  attachmentFileName: string;
  attachmentMimeType: string;
  status: string;
  sentAt: string | null;
}) {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
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
  companyId: number;
  channel: string;
  subject: string;
  messageBody: string;
  attachmentUrl: string;
  attachmentFileName: string;
  attachmentMimeType: string;
  status: string;
  sentAt: string | null;
}) {
  const res = await fetch("/api/messages", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
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
  const res = await fetch("/api/messages", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
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

  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to upload image" };
  }

  return data;
}
