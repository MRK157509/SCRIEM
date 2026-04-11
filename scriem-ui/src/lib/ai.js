// scriem-ui/src/lib/ai.js
const API_BASE = import.meta?.env?.VITE_API_BASE || "";

function authHeaders() {
  // Common patterns: token stored as "token" or "access_token"
  const token =
    localStorage.getItem("scriem.auth.token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    "";

  const headers = {
    accept: "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  // If your backend uses x-api-key, you can also set:
  // headers["x-api-key"] = "scriem-secret-key";

  return headers;
}

export async function fetchAIAnalysis(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/ai-analysis`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Failed to fetch AI analysis (${res.status})`);
  }
  return res.json();
}

export async function reanalyzeAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/ai-reanalyze`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Failed to reanalyze (${res.status})`);
  }
  return res.json();
}
