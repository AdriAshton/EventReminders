// services/clientService.ts

import { authenticatedFetch } from "@/lib/authClient";

export async function getClients(page = 1, pageSize = 10, filters?: { firstname?: string; lastname?: string; birthdate?: string }) {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filters?.firstname) searchParams.set("firstname", filters.firstname);
  if (filters?.lastname) searchParams.set("lastname", filters.lastname);
  if (filters?.birthdate) searchParams.set("birthdate", filters.birthdate);

  const url = `/api/clients?${searchParams.toString()}`;

  const res = await authenticatedFetch(url, {
    method: 'GET',
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Failed to fetch clients' };
  }
  // expected shape: { rows: [...], total: number }
  return data;
}

export async function getClientFilterValues() {
  const res = await authenticatedFetch("/api/clients?distinct=1", {
    method: "GET",
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch client filter values" };
  }
  return data;
}

export async function getClient(clientid: number) {
  const res = await authenticatedFetch(`/api/clients?id=${clientid}`, {
    method: "GET",
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
  birthdate?: string;
  companyId: number;
}) {
  const res = await authenticatedFetch("/api/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
  birthdate?: string;
  companyId: number;
}) {
  const res = await authenticatedFetch("/api/clients", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authenticatedFetch("/api/clients", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authenticatedFetch("/api/clients", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: clientids }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete clients" };
  }
  return data;
}
