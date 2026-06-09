"use client";
import { useEffect, useState } from "react";
import { getClients, addClient, deleteClient, updateClient } from "@/services/clientService";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [newClient, setNewClient] = useState({ firstname: "", lastname: "", email: "", phone: "", companyId: 1 });
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null); // ✅ added error state

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const data = await getClients();
    if (data.error) {
      setError(data.error);
    } else {
      setClients(data);
      setError(null);
    }
  }

  async function handleAdd() {
    const res = await addClient(newClient);
    if (res.error) {
      setError(res.error);
    } else {
      await loadClients();
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteClient(id);
    if (res.error) {
      setError(res.error);
    } else {
      await loadClients();
    }
  }

  async function handleUpdate() {
    if (!editingClient) return;
    const res = await updateClient(editingClient);
    if (res.error) {
      setError(res.error);
    } else {
      await loadClients();
      setEditingClient(null);
    }
  }

  return (
    <div>
      <h1>Clients</h1>

      {/* ✅ show error messages */}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <ul>
        {clients.map(c => (
          <li key={c.clientid}>
            {c.firstname} {c.lastname} ({c.email})
            <button onClick={() => handleDelete(c.clientid)}>Delete</button>
            <button onClick={() => setEditingClient(c)}>Edit</button>
          </li>
        ))}
      </ul>

      <h2>Add Client</h2>
      <input placeholder="First Name" onChange={e => setNewClient({ ...newClient, firstname: e.target.value })} />
      <input placeholder="Last Name" onChange={e => setNewClient({ ...newClient, lastname: e.target.value })} />
      <input placeholder="Email" onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
      <input placeholder="Phone" onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
      <button onClick={handleAdd}>Add</button>

      {editingClient && (
        <div>
          <h2>Edit Client</h2>
          <input
            value={editingClient.firstname}
            onChange={e => setEditingClient({ ...editingClient, firstname: e.target.value })}
          />
          <input
            value={editingClient.lastname}
            onChange={e => setEditingClient({ ...editingClient, lastname: e.target.value })}
          />
          <input
            value={editingClient.email}
            onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
          />
          <input
            value={editingClient.phone}
            onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
          />
          <button onClick={handleUpdate}>Save</button>
        </div>
      )}
    </div>
  );
}
