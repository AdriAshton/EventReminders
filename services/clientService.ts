// services/clientService.ts

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getClients(page = 1, pageSize = 10) {
  const url = `/api/clients?page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
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
    return { error: data.error || 'Failed to fetch clients' };
  }
  // expected shape: { rows: [...], total: number }
  return data;
}

export async function getClient(clientid: number) {
  const res = await fetch(`/api/clients?id=${clientid}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch client" };
  }
  return data;
}

export async function addClient(client: {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  companyId: number;
}) {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(client),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to add client" };
  }
  return data;
}

export async function updateClient(client: {
  clientid: number;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  companyId: number;
}) {
  const res = await fetch("/api/clients", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(client),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to update client" };
  }
  return data;
}

export async function deleteClient(clientid: number) {
  const res = await fetch("/api/clients", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ clientid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete client" };
  }
  return data;
}

export async function deleteClients(clientids: number[]) {
  const res = await fetch("/api/clients", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ ids: clientids }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete clients" };
  }
  return data;
}
