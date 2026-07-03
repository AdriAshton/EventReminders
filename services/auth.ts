// services/auth.ts

// Signup
export async function signup(username: string, email: string, password: string) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Signup failed");
  }

  return data;
}

// Login
export async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const contentType = res.headers.get("content-type") || "";
  const responseText = await res.text();
  const data = contentType.includes("application/json") && responseText
    ? JSON.parse(responseText)
    : responseText;

  if (!res.ok) {
    const message = typeof data === "string"
      ? data
      : data?.error || "Login failed";
    throw new Error(message);
  }

  // You’ll typically get back a JWT token here
  return data;
}
