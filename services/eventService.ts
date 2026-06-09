// services/eventService.ts

export async function getEvents() {
  const res = await fetch("/api/events", { method: "GET" });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch events" };
  }
  return data;
}

export async function addEvent(event: {
  clientid: number;
  companyid: number;
  eventtype: string;
  eventdate: string; // ✅ use string for JSON compatibility
  notes: string;
}) {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  eventtype: string;
  eventdate: string; // ✅ use string for JSON compatibility
  notes: string;
  eventid: number;
}) {
  const res = await fetch("/api/events", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete event" };
  }
  return data;
}
