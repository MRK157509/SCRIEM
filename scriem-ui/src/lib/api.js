const BASE_URL = "";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
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

export function searchTimeline(query) {
  return apiFetch(`/api/timeline/search?q=${encodeURIComponent(query)}`);
}
