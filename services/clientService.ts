// services/clientService.ts

export async function getClients() {
  const res = await fetch("/api/clients", { method: "GET" });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch clients" };
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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete client" };
  }
  return data;
}
