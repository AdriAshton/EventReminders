// services/reminderService.ts

import { authenticatedFetch } from "@/lib/authClient";

// GET all reminders
export async function getReminders(page = 1, pageSize = 10, firstName = "", lastName = "") {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (firstName) params.set("firstName", firstName);
  if (lastName) params.set("lastName", lastName);

  const res = await authenticatedFetch(`/api/reminders?${params.toString()}`, {
    method: 'GET',
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Failed to fetch reminders' };
  }
  return data; // { rows, total }
}

// GET distinct first/last name options for cascading filters
export async function getReminderFilterOptions(firstName = "", lastName = "") {
  const params = new URLSearchParams({ filterOptions: "true" });
  if (firstName) params.set("firstName", firstName);
  if (lastName) params.set("lastName", lastName);

  const res = await authenticatedFetch(`/api/reminders?${params.toString()}`, {
    method: 'GET',
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Failed to fetch filter options' };
  }
  return data as { firstNames: string[]; lastNames: string[] };
}

export async function getReminder(reminderid: number) {
  const res = await authenticatedFetch(`/api/reminders?id=${reminderid}`, {
    method: "GET",
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch reminder" };
  }
  return data;
}

// POST new reminder
export async function addReminder(reminder: {
  clientid: number;
  companyid: number;
  reminderdatetime?: Date;
  remindermethod: string;   // e.g. "Email", "SMS"
  status?: string;          // optional, defaults to "Pending"
  sendtime?: string;
  isactive?: boolean;
}) {
  const res = await authenticatedFetch("/api/reminders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
  clientid: number;
  companyid: number;
  reminderdatetime?: Date;
  remindermethod: string;
  status: string;
  sendtime?: string;
  isactive?: boolean;
}) {
  const res = await authenticatedFetch("/api/reminders", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authenticatedFetch("/api/reminders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authenticatedFetch("/api/reminders", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete reminders" };
  }
  return data;
}
