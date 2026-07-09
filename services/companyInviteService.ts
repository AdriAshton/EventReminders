import { authenticatedFetch } from "@/lib/authClient";

export async function getCompanyInvites() {
  const res = await authenticatedFetch("/api/company-invites", { method: "GET" });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch invites" };
  }
  return data;
}

export async function sendCompanyInvite(payload: {
  companyid: number;
  email: string;
  roleid: number;
}) {
  const res = await authenticatedFetch("/api/company-invites", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to send invite" };
  }
  return data;
}