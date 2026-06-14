import { authenticatedFetch } from "@/lib/authClient";

const getBase = () => {
  if (typeof window !== 'undefined') return '';
  return process.env.APP_URL || 'http://localhost:3000';
};

export async function getEventTypes() {
  const res = await authenticatedFetch(`${getBase()}/api/event-types`, {
    method: 'GET',
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Failed to fetch event types' };
  return data;
}

export async function addEventType(name: string, description?: string) {
  const res = await authenticatedFetch(`${getBase()}/api/event-types`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventtypename: name, description }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Failed to create' };
  return data;
}

export async function deleteEventType(eventtypeid: number) {
  const res = await authenticatedFetch(`${getBase()}/api/event-types`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventtypeid }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Failed to delete' };
  return data;
}

export async function updateEventType(eventtypeid: number, name: string, description?: string) {
  const res = await authenticatedFetch(`${getBase()}/api/event-types`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventtypeid, eventtypename: name, description }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Failed to update' };
  return data;
}
