// services/eventService.ts

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getEvents(page = 1, pageSize = 10) {
  const url = `/api/events?page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
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
    return { error: data.error || 'Failed to fetch events' };
  }
  return data; // { rows, total }
}

export async function getEvent(eventid: number) {
  const res = await fetch(`/api/events?id=${eventid}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch event" };
  }
  return data;
}

export async function addEvent(event: {
  clientid: number;
  companyid: number;
  eventtypeid: number;
  eventdate: string; // ✅ use string for JSON compatibility
  notes: string;
}) {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(event),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to add event" };
  }
  return data;
}

export async function updateEvent(event: {
  clientid: number;
  companyid: number;
  eventtypeid: number;
  eventdate: string; // ✅ use string for JSON compatibility
  notes: string;
  eventid: number;
}) {
  const res = await fetch("/api/events", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(event),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to update event" };
  }
  return data;
}

export async function deleteEvent(eventid: number) {
  const res = await fetch("/api/events", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ eventid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete event" };
  }
  return data;
}
