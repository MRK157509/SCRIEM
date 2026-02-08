import { getToken, clearAuth } from "./auth";

const BASE_URL = "";

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

  if (!res.ok) {
    // If token expired/invalid, force logout
    if (res.status === 401) {
      clearAuth();
      // Optional: you can also redirect in UI layer
    }

    const text = await res.text();
    throw new Error(text || `API request failed (${res.status})`);
  }

  return res.json();
}

export function fetchAlerts() {
  return apiFetch("/api/alerts/");
}

export function fetchAlertById(id) {
  return apiFetch(`/api/alerts/${id}`);
}

export function patchAlert(id, payload) {
  return apiFetch(`/api/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function searchTimeline(query) {
  return apiFetch(`/api/timeline/search?q=${encodeURIComponent(query)}`);
}

export function fetchEvents(params = {}) {
  const sp = new URLSearchParams();
  if (params.host) sp.set("host", params.host);
  if (params.user) sp.set("user", params.user);
  if (params.event_type) sp.set("event_type", params.event_type);
  const qs = sp.toString();
  return apiFetch(`/api/events${qs ? `?${qs}` : ""}`);
}
