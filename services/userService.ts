function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getUsers() {
  const res = await fetch("/api/users", {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
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
  companyId: number;
}) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
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
  companyId: number;
}) {
  const res = await fetch("/api/users", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
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
  const res = await fetch("/api/users", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ userid }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to delete user" };
  }
  return data;
}
