// services/companyService.ts

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET all companies (or scoped by JWT depending on backend)
export async function getCompanies() {
  const res = await fetch("/api/companies", {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch companies" };
  }
  return data;
}

// POST new company
export async function addCompany(company: {
  companyname: string;
  contactemail?: string;
  contactphone?: string;
}) {
  const res = await fetch("/api/companies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(company),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to add company" };
  }
  return data;
}

// PUT update company
export async function updateCompany(company: {
  companyid: number;
  companyname: string;
  contactemail?: string;
  contactphone?: string;
}) {
  const res = await fetch("/api/companies", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(company),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to update company" };
  }
  return data;
}

// DELETE company
export async function deleteCompany(companyid: number) {
  const res = await fetch("/api/companies", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ companyid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete company" };
  }
  return data;
}
