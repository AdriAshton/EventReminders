"use client";
import { useEffect, useState } from "react";
import { getEvents, addEvent, deleteEvent, updateEvent } from "@/services/eventService";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({
    eventtype: "",
    eventdate: "",
    notes: "",
    clientid: 1,
    companyid: 1,
  });
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null); // ✅ added error state

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const data = await getEvents();
    if (data.error) {
      setError(data.error);
    } else {
      setEvents(data);
      setError(null);
    }
  }

  async function handleAdd() {
    const res = await addEvent(newEvent);
    if (res.error) {
      setError(res.error);
    } else {
      await loadEvents();
      setNewEvent({ eventtype: "", eventdate: "", notes: "", clientid: 1, companyid: 1 });
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteEvent(id);
    if (res.error) {
      setError(res.error);
    } else {
      await loadEvents();
    }
  }

  async function handleUpdate() {
    if (!editingEvent) return;
    const res = await updateEvent(editingEvent);
    if (res.error) {
      setError(res.error);
    } else {
      await loadEvents();
      setEditingEvent(null);
    }
  }

  return (
    <div>
      <h1>Events</h1>

      {/* ✅ show error messages */}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <ul>
        {events.map(e => (
          <li key={e.eventid}>
            {e.eventtype} on {e.eventdate} ({e.notes})
            <button onClick={() => handleDelete(e.eventid)}>Delete</button>
            <button onClick={() => setEditingEvent(e)}>Edit</button>
          </li>
        ))}
      </ul>

      <h2>Add Event</h2>
      <input
        placeholder="Event Type"
        value={newEvent.eventtype}
        onChange={ev => setNewEvent({ ...newEvent, eventtype: ev.target.value })}
      />
      <input
        placeholder="Event Date"
        type="date"
        value={newEvent.eventdate}
        onChange={ev => setNewEvent({ ...newEvent, eventdate: ev.target.value })}
      />
      <input
        placeholder="Notes"
        value={newEvent.notes}
        onChange={ev => setNewEvent({ ...newEvent, notes: ev.target.value })}
      />
      <button onClick={handleAdd}>Add</button>

      {editingEvent && (
        <div>
          <h2>Edit Event</h2>
          <input
            value={editingEvent.eventtype}
            onChange={ev => setEditingEvent({ ...editingEvent, eventtype: ev.target.value })}
          />
          <input
            type="date"
            value={editingEvent.eventdate}
            onChange={ev => setEditingEvent({ ...editingEvent, eventdate: ev.target.value })}
          />
          <input
            value={editingEvent.notes}
            onChange={ev => setEditingEvent({ ...editingEvent, notes: ev.target.value })}
          />
          <button onClick={handleUpdate}>Save</button>
        </div>
      )}
    </div>
  );
}
