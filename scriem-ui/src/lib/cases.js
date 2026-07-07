import { apiFetch } from "./api";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCase(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    title: raw.title || `Investigation ${raw.id}`,
    description: raw.description || "",
    severity: raw.severity || "MEDIUM",
    status: raw.status || "OPEN",
    notes: raw.notes || "",
    items: safeArray(raw.items),
    timeline: safeArray(raw.timeline),
    createdBy: raw.created_by || raw.createdBy || "",
    updatedBy: raw.updated_by || raw.updatedBy || "",
    createdAt: raw.created_at || raw.createdAt || null,
    updatedAt: raw.updated_at || raw.updatedAt || null,
  };
}

function normalizeList(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.cases || [];
  return rows.map(normalizeCase).filter(Boolean);
}

export async function getCases() {
  const data = await apiFetch("/api/cases/");
  return normalizeList(data);
}

export async function getCaseById(caseId) {
  if (!caseId) return null;
  const data = await apiFetch(`/api/cases/${encodeURIComponent(caseId)}`);
  return normalizeCase(data);
}

export async function createCase(payload = {}) {
  const data = await apiFetch("/api/cases/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeCase(data);
}

export async function addItemsToCase(caseId, items) {
  if (!caseId) return null;
  const data = await apiFetch(`/api/cases/${encodeURIComponent(caseId)}/items`, {
    method: "POST",
    body: JSON.stringify({ items: safeArray(items) }),
  });
  return normalizeCase(data);
}

export async function updateCaseNotes(caseId, notes) {
  if (!caseId) return null;
  const data = await apiFetch(`/api/cases/${encodeURIComponent(caseId)}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });
  return normalizeCase(data);
}

export async function updateCase(caseId, updates = {}) {
  if (!caseId) return null;
  const data = await apiFetch(`/api/cases/${encodeURIComponent(caseId)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return normalizeCase(data);
}
