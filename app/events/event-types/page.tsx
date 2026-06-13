"use client";

import React, { useEffect, useState } from 'react';
import { getEventTypes, addEventType, deleteEventType, updateEventType } from '@/services/eventTypeService';

export default function EventTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getEventTypes();
      if ((res as any).error) setError((res as any).error);
      else setTypes(res as any || []);
    })();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Name is required');
    setLoading(true);
    try {
      const res = await addEventType(name.trim(), description.trim() || undefined);
      if ((res as any).error) setError((res as any).error);
      else {
        setTypes(prev => [res, ...prev]);
        setName('');
        setDescription('');
      }
    } catch (err: any) {
      setError(err?.message || 'Create failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this event type?')) return;
    setError(null);
    try {
      const res = await deleteEventType(id);
      if ((res as any).error) setError((res as any).error);
      else setTypes(prev => prev.filter(t => t.eventtypeid !== id));
    } catch (err) {
      setError('Delete failed');
    }
  }

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  function startEdit(t: any) {
    setEditingId(t.eventtypeid);
    setEditName(t.eventtypename || '');
    setEditDescription(t.description || '');
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await updateEventType(editingId, editName.trim(), editDescription.trim() || undefined);
      if ((res as any).error) setError((res as any).error);
      else {
        setTypes(prev => prev.map(t => (t.eventtypeid === editingId ? res : t)));
        setEditingId(null);
      }
    } catch (err) {
      setError('Update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Event Types</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}

      <form onSubmit={handleCreate} className="mb-4 space-y-2">
        <div>
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="border p-2 rounded w-full" />
        </div>
        <div>
          <input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="border p-2 rounded w-full" />
        </div>
        <div>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-3 py-1 rounded">
            {loading ? 'Saving...' : 'Create'}
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {types.map(t => (
          <li key={t.eventtypeid} className="p-2 border rounded">
            {editingId === t.eventtypeid ? (
              <form onSubmit={submitEdit} className="space-y-2">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="border p-1 rounded w-full" />
                <input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="border p-1 rounded w-full" />
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="bg-green-600 text-white px-2 py-1 rounded">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="px-2 py-1 rounded border">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{t.eventtypename}</div>
                  {t.description && <div className="text-sm text-gray-600">{t.description}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(String(t.eventtypeid))} className="text-sm text-gray-500">Copy ID</button>
                  <button onClick={() => startEdit(t)} className="text-sm text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(t.eventtypeid)} className="text-sm text-red-600">Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
