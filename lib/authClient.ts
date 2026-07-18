const TOKEN_KEY = "token";
const AUTH_COOKIE_KEY = "auth";
const SESSION_IDLE_LIMIT_MS = 30 * 60 * 1000;
const SESSION_ACTIVITY_KEY = "authLastActivityAt";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const localToken = localStorage.getItem(TOKEN_KEY);
  if (localToken) {
    return localToken;
  }

  const cookieToken = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${AUTH_COOKIE_KEY}=`))
    ?.split("=")[1];

  return cookieToken ? decodeURIComponent(cookieToken) : null;
}

function getLastActivityAt() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = localStorage.getItem(SESSION_ACTIVITY_KEY);
  const parsedValue = rawValue ? Number(rawValue) : NaN;
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function setLastActivityAt(timestamp: number = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SESSION_ACTIVITY_KEY, String(timestamp));
}

function clearLastActivityAt() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_ACTIVITY_KEY);
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

export function isSessionIdleExpired() {
  const lastActivityAt = getLastActivityAt();
  if (!lastActivityAt) {
    return true;
  }

  return Date.now() - lastActivityAt >= SESSION_IDLE_LIMIT_MS;
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
  setLastActivityAt();
}

export function clearStoredToken() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  clearAuthCookie();
  clearLastActivityAt();
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
  if (!token || isTokenExpired(token) || isSessionIdleExpired()) {
    redirectToLogin(token ? "expired" : "missing");
    return null;
  }

  setAuthCookie(token);
  setLastActivityAt();
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

  setLastActivityAt();

  if (response.status === 401) {
    redirectToLogin("expired");
  }

  return response;
}