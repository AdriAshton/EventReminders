// services/eventService.ts

import { authenticatedFetch } from "@/lib/authClient";

export async function getEvents(page = 1, pageSize = 10) {
  const url = `/api/events?page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
    String(pageSize),
  )}`;

  const res = await authenticatedFetch(url, {
    method: 'GET',
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Failed to fetch events' };
  }
  return data; // { rows, total }
}

export async function getEvent(eventid: number) {
  const res = await authenticatedFetch(`/api/events?id=${eventid}`, {
    method: "GET",
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
  const res = await authenticatedFetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authenticatedFetch("/api/events", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authenticatedFetch("/api/events", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ eventid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete event" };
  }
  return data;
}
