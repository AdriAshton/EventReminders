import { authenticatedFetch } from "@/lib/authClient";

export async function getUsers() {
  const res = await authenticatedFetch("/api/users", {
    method: "GET",
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to fetch users" };
  }
  return data;
}

export async function addUser(user: {
  username: string;
  password: string;
  roleid: number;
  email: string;
}) {
  const res = await authenticatedFetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to add user" };
  }
  return data;
}

export async function updateUser(user: {
  userid: number;
  username: string;
  password?: string;
  roleid: number;
  email: string;
}) {
  const res = await authenticatedFetch("/api/users", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to update user" };
  }
  return data;
}

export async function deleteUser(userid: number) {
  const res = await authenticatedFetch("/api/users", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userid }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete user" };
  }
  return data;
}
