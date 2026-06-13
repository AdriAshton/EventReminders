function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getEventTypes() {
  const res = await fetch('/api/event-types', {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Failed to fetch event types' };
  return data;
}

export async function addEventType(name: string, description?: string) {
  const res = await fetch('/api/event-types', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ eventtypename: name, description }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Failed to create' };
  return data;
}

export async function deleteEventType(eventtypeid: number) {
  const res = await fetch('/api/event-types', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventtypeid }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Failed to delete' };
  return data;
}

export async function updateEventType(eventtypeid: number, name: string, description?: string) {
  const res = await fetch('/api/event-types', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventtypeid, eventtypename: name, description }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Failed to update' };
  return data;
}
