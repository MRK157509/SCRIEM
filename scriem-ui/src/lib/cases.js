const LS_CASES = "scriem:cases:v1";

function loadCases() {
  try {
    return JSON.parse(localStorage.getItem(LS_CASES) || "[]");
  } catch {
    return [];
  }
}

function saveCases(cases) {
  localStorage.setItem(LS_CASES, JSON.stringify(cases));
}

export function listCases() {
  const cases = loadCases();
  // newest first
  return cases.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

export function getCaseById(id) {
  return loadCases().find((c) => c.id === id) || null;
}

export function createCase({
  title,
  description = "",
  severity = "MEDIUM",
  status = "OPEN",
  tags = [],
  items = [],
}) {
  const now = new Date().toISOString();
  const id = `CASE-${Date.now()}`;

  const newCase = {
    id,
    title: title || `Case ${id}`,
    description,
    severity,
    status,
    tags,
    items, // alerts/events snapshots
    created_at: now,
    updated_at: now,
    timeline: [
      { at: now, action: "CASE_CREATED", note: "Case created" },
    ],
  };

  const cases = loadCases();
  cases.unshift(newCase);
  saveCases(cases);

  return newCase;
}

export function updateCase(id, patch) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const updated = {
    ...cases[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  cases[idx] = updated;
  saveCases(cases);

  return updated;
}

export function addCaseTimeline(id, entry) {
  const c = getCaseById(id);
  if (!c) return null;

  const now = new Date().toISOString();
  const next = {
    ...c,
    updated_at: now,
    timeline: [{ at: now, ...entry }, ...(c.timeline || [])],
  };

  return updateCase(id, next);
}

export function addItemsToCase(id, items) {
  const c = getCaseById(id);
  if (!c) return null;

  const existing = Array.isArray(c.items) ? c.items : [];
  const incoming = Array.isArray(items) ? items : [];

  // de-dup by kind+id/event_id+host+title/event_type
  const keyOf = (it) =>
    `${it.kind || ""}|${it.id ?? it.event_id ?? ""}|${it.host ?? ""}|${
      it.title ?? it.event_type ?? ""
    }|${it.created_at ?? it.timestamp ?? ""}`;

  const seen = new Set(existing.map(keyOf));
  const merged = [...existing];

  for (const it of incoming) {
    const k = keyOf(it);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.unshift(it);
  }

  const updated = updateCase(id, { items: merged });
  if (updated) {
    addCaseTimeline(id, {
      action: "ITEMS_ADDED",
      note: `Added ${incoming.length} item(s)`,
    });
  }
  return updated;
}
