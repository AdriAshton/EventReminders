// services/reminderService.ts

// GET all reminders
export async function getReminders() {
  const res = await fetch('/api/reminders', {
    method: 'GET',
  });
  return res.json();
}

// POST new reminder
export async function addReminder(reminder: {
  eventid: number;
  companyid: number;
  reminderdatetime: Date;   // ✅ now a Date object
  remindermethod: string;   // e.g. "Email", "SMS"
  status?: string;          // optional, defaults to "Pending"
}) {
  const res = await fetch('/api/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reminder),
  });
  return res.json();
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
  const res = await fetch('/api/reminders', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reminder),
  });
  return res.json();
}

// DELETE reminder
export async function deleteReminder(reminderid: number) {
  const res = await fetch('/api/reminders', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reminderid }),
  });
  return res.json();
}
