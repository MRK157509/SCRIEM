import { authHeaders } from "./auth";

const BASE_URL = "";

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API request failed (${res.status})`);
  }
  return res.json();
}

export function fetchAlerts(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch(`/api/alerts/${q}`);
}

export function fetchAlertById(id) {
  return apiFetch(`/api/alerts/${id}`);
}

export function updateAlert(id, { status, notes }) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  // send notes even if empty string? you can choose. here only if defined:
  if (notes !== undefined) params.set("notes", notes);

  const qs = params.toString();
  return apiFetch(`/api/alerts/${id}${qs ? `?${qs}` : ""}`, { method: "PATCH" });
}

export function searchTimeline(query) {
  return apiFetch(`/api/timeline/search?q=${encodeURIComponent(query)}`);
}
