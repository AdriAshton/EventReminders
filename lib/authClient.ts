const TOKEN_KEY = "token";
const AUTH_COOKIE_KEY = "auth";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getTokenPayload(token?: string | null) {
  const currentToken = token ?? getStoredToken();
  if (!currentToken) {
    return null;
  }

  try {
    const payloadPart = currentToken.split(".")[1];
    if (!payloadPart) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payloadPart)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isTokenExpired(token?: string | null) {
  const payload = getTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
}

function setAuthCookie(token: string) {
  const payload = getTokenPayload(token);
  const expires =
    payload && typeof payload.exp === "number"
      ? `; expires=${new Date(payload.exp * 1000).toUTCString()}`
      : "";

  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(token)}; path=/; SameSite=Lax${expires}`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function setStoredToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  setAuthCookie(token);
}

export function clearStoredToken() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  clearAuthCookie();
}

export function redirectToLogin(reason = "expired") {
  if (typeof window === "undefined") {
    return;
  }

  clearStoredToken();
  const target = `/login?reason=${encodeURIComponent(reason)}`;
  if (window.location.pathname !== "/login") {
    window.location.assign(target);
  }
}

export function ensureValidSession() {
  const token = getStoredToken();
  if (!token || isTokenExpired(token)) {
    redirectToLogin(token ? "expired" : "missing");
    return null;
  }

  setAuthCookie(token);
  return token;
}

export function getAuthHeaders(): HeadersInit {
  const token = ensureValidSession();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  const authHeaders = getAuthHeaders();

  Object.entries(authHeaders).forEach(([key, value]) => {
    if (typeof value === "string") {
      headers.set(key, value);
    }
  });

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    redirectToLogin("expired");
  }

  return response;
}