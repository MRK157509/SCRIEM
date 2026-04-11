// src/lib/api.js
const BASE_URL = "";

// Keep token storage consistent across the app.
// If your Login.jsx uses a different key, update TOKEN_KEY to match it.
const TOKEN_KEY = "scriem.auth.token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore storage failures
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("scriem.auth.role"); // if you store role
    localStorage.removeItem("scriem.auth.user"); // if you store username
  } catch {
    // ignore storage failures
  }
}

function redirectToLogin() {
  // Avoid infinite loops if we're already there
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // If backend blocks request, force re-login
  if (res.status === 401 || res.status === 403) {
    clearAuth();
    redirectToLogin();
    throw new Error(`Unauthorized (${res.status})`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API request failed (${res.status})`);
  }

  // Some endpoints might return empty body (204). Be safe.
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return res.text();
  }
  return res.json();
}

/** Alerts */
export function fetchAlerts(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch(`/api/alerts/${qs}`);
}

export function fetchMetricsSummary() {
  return apiFetch("/api/metrics/summary");
}

export function updateAlert(alertId, { status, notes } = {}) {
  // your backend uses query params for patch (status, notes)
  const sp = new URLSearchParams();
  if (status != null) sp.set("status", status);
  if (notes != null) sp.set("notes", notes);

  const q = sp.toString();
  return apiFetch(`/api/alerts/${alertId}${q ? `?${q}` : ""}`, {
    method: "PATCH",
  });
}

/** Timeline */
export function searchTimeline(query) {
  return apiFetch(`/api/timeline/search?q=${encodeURIComponent(query)}`);
}

export function fetchHostTimeline(host) {
  return apiFetch(`/api/timeline/${encodeURIComponent(host)}`);
}

/** Auth */
export async function login(username, password) {
  const res = await fetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Login failed (${res.status})`);
  }

  const data = await res.json();
  // expected: { access_token, role, token_type }
  if (data?.access_token) setToken(data.access_token);

  // optionally store role/user for UI
  try {
    if (data?.role) localStorage.setItem("scriem.auth.role", data.role);
    if (username) localStorage.setItem("scriem.auth.user", username);
  } catch {
    // ignore storage failures
  }

  return data;
}

export function logout() {
  clearAuth();
  redirectToLogin();
}
