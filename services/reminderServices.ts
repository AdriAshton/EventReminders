// services/reminderService.ts

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET all reminders
export async function getReminders(page = 1, pageSize = 10) {
  const url = `/api/reminders?page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
    String(pageSize),
  )}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Failed to fetch reminders' };
  }
  return data; // { rows, total }
}

export async function getReminder(reminderid: number) {
  const res = await fetch(`/api/reminders?id=${reminderid}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch reminder" };
  }
  return data;
}

// POST new reminder
export async function addReminder(reminder: {
  eventid: number;
  companyid: number;
  reminderdatetime: Date;   // ✅ now a Date object
  remindermethod: string;   // e.g. "Email", "SMS"
  status?: string;          // optional, defaults to "Pending"
}) {
  const res = await fetch("/api/reminders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(reminder),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to add reminder" };
  }
  return data;
}

// PUT update reminder
export async function updateReminder(reminder: {
  reminderid: number;
  eventid: number;
  companyid: number;
  reminderdatetime: Date;   // ✅ now a Date object
  remindermethod: string;
  status: string;
}) {
  const res = await fetch("/api/reminders", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(reminder),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to update reminder" };
  }
  return data;
}

// DELETE reminder
export async function deleteReminder(reminderid: number) {
  const res = await fetch("/api/reminders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ reminderid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete reminder" };
  }
  return data;
}

export async function deleteReminders(ids: number[]) {
  const res = await fetch("/api/reminders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete reminders" };
  }
  return data;
}
