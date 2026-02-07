const LS_CASES = "scriem:cases:v1";

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadAll() {
  return safeParse(localStorage.getItem(LS_CASES), []);
}

function saveAll(cases) {
  localStorage.setItem(LS_CASES, JSON.stringify(cases));
}

function makeId() {
  return `case-${Date.now()}`;
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((it) => ({
    kind: it?.kind || (it?.title ? "alert" : "event"),
    ...it,
  }));
}

function stableItemKey(it) {
  // best-effort de-dupe key
  return String(
    it?.__scriemKey ||
      it?.id ||
      it?._id ||
      it?.alert_id ||
      it?.event_id ||
      `${it?.title || it?.event_type || "untitled"}|${it?.host || "nohost"}|${it?.user || "nouser"}|${
        it?.created_at || it?.timestamp || ""
      }`
  );
}

export function getCases() {
  return loadAll();
}

export function getCaseById(id) {
  return loadAll().find((c) => c.id === id) || null;
}

export function createCase(payload = {}) {
  const now = new Date().toISOString();
  const id = payload.id || makeId();

  const newCase = {
    id,
    title: payload.title || `Investigation ${new Date().toLocaleString()}`,
    description: payload.description || "",
    severity: payload.severity || "MEDIUM",
    status: payload.status || "OPEN",
    createdAt: now,
    updatedAt: now,
    notes: payload.notes || "",
    items: normalizeItems(payload.items),
    timeline: [
      {
        at: now,
        type: "CASE_CREATED",
        message: "Case created",
      },
    ],
  };

  const all = loadAll();
  all.unshift(newCase);
  saveAll(all);

  return newCase;
}

export function addItemsToCase(caseId, items) {
  const all = loadAll();
  const idx = all.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;

  const c = all[idx];
  const existing = new Set((c.items || []).map(stableItemKey));

  const incoming = normalizeItems(items);
  const toAdd = incoming.filter((it) => !existing.has(stableItemKey(it)));

  if (toAdd.length === 0) return c;

  const now = new Date().toISOString();
  const updated = {
    ...c,
    items: [...toAdd, ...(c.items || [])],
    updatedAt: now,
    timeline: [
      {
        at: now,
        type: "ITEMS_ADDED",
        message: `Added ${toAdd.length} item(s)`,
      },
      ...(c.timeline || []),
    ],
  };

  all[idx] = updated;
  saveAll(all);
  return updated;
}

export function updateCaseNotes(caseId, notes) {
  const all = loadAll();
  const idx = all.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const updated = {
    ...all[idx],
    notes: String(notes || ""),
    updatedAt: now,
    timeline: [
      {
        at: now,
        type: "NOTES_UPDATED",
        message: "Notes updated",
      },
      ...(all[idx].timeline || []),
    ],
  };

  all[idx] = updated;
  saveAll(all);
  return updated;
}
