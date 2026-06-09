"use client";
import { useEffect, useState } from "react";
import { getReminders, addReminder, deleteReminder, updateReminder } from "@/services/reminderServices";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [newReminder, setNewReminder] = useState({
    eventid: 1,
    companyid: 1,
    reminderdatetime: "",
    remindermethod: "",
    status: "Pending",
  });
  const [editingReminder, setEditingReminder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null); // ✅ added error state

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    const data = await getReminders();
    if (data.error) {
      setError(data.error);
    } else {
      setReminders(data);
      setError(null);
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteReminder(id);
    if (res.error) {
      setError(res.error);
    } else {
      await loadReminders();
    }
  }

  async function handleAdd() {
    const res = await addReminder({
      ...newReminder,
      reminderdatetime: new Date(newReminder.reminderdatetime),
    });
    if (res.error) {
      setError(res.error);
    } else {
      await loadReminders();
      setNewReminder({
        eventid: 1,
        companyid: 1,
        reminderdatetime: "",
        remindermethod: "",
        status: "Pending",
      });
    }
  }

  async function handleUpdate() {
    if (!editingReminder) return;
    const res = await updateReminder({
      ...editingReminder,
      reminderdatetime: new Date(editingReminder.reminderdatetime),
    });
    if (res.error) {
      setError(res.error);
    } else {
      await loadReminders();
      setEditingReminder(null);
    }
  }

  return (
    <div>
      <h1>Reminders</h1>

      {/* ✅ show error messages */}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <ul>
        {reminders.map(r => (
          <li key={r.reminderid}>
            Reminder #{r.reminderid}: Event {r.eventid}, Company {r.companyid}, 
            at {r.reminderdatetime} via {r.remindermethod} 
            (Status: {r.status})
            <button onClick={() => handleDelete(r.reminderid)}>Delete</button>
            <button onClick={() => setEditingReminder(r)}>Edit</button>
          </li>
        ))}
      </ul>

      <h2>Add Reminder</h2>
      <input
        placeholder="Event ID"
        type="number"
        value={newReminder.eventid}
        onChange={ev => setNewReminder({ ...newReminder, eventid: Number(ev.target.value) })}
      />
      <input
        placeholder="Company ID"
        type="number"
        value={newReminder.companyid}
        onChange={ev => setNewReminder({ ...newReminder, companyid: Number(ev.target.value) })}
      />
      <input
        type="datetime-local"
        value={newReminder.reminderdatetime}
        onChange={ev => setNewReminder({ ...newReminder, reminderdatetime: ev.target.value })}
      />
      <input
        placeholder="Reminder Method"
        value={newReminder.remindermethod}
        onChange={ev => setNewReminder({ ...newReminder, remindermethod: ev.target.value })}
      />
      <input
        placeholder="Status"
        value={newReminder.status}
        onChange={ev => setNewReminder({ ...newReminder, status: ev.target.value })}
      />
      <button onClick={handleAdd}>Add</button>

      {editingReminder && (
        <div>
          <h2>Edit Reminder</h2>
          <input
            type="number"
            value={editingReminder.eventid}
            onChange={ev => setEditingReminder({ ...editingReminder, eventid: Number(ev.target.value) })}
          />
          <input
            type="number"
            value={editingReminder.companyid}
            onChange={ev => setEditingReminder({ ...editingReminder, companyid: Number(ev.target.value) })}
          />
          <input
            type="datetime-local"
            value={editingReminder.reminderdatetime}
            onChange={ev => setEditingReminder({ ...editingReminder, reminderdatetime: ev.target.value })}
          />
          <input
            value={editingReminder.remindermethod}
            onChange={ev => setEditingReminder({ ...editingReminder, remindermethod: ev.target.value })}
          />
          <input
            value={editingReminder.status}
            onChange={ev => setEditingReminder({ ...editingReminder, status: ev.target.value })}
          />
          <button onClick={handleUpdate}>Save</button>
        </div>
      )}
    </div>
  );
}
