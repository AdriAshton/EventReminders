// services/companyService.ts

import { authenticatedFetch } from "@/lib/authClient";

// GET all companies (or scoped by JWT depending on backend)
export async function getCompanies() {
  const res = await authenticatedFetch("/api/companies", {
    method: "GET",
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
  const res = await authenticatedFetch("/api/companies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authenticatedFetch("/api/companies", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
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
  const res = await authenticatedFetch("/api/companies", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ companyid }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete company" };
  }
  return data;
}
