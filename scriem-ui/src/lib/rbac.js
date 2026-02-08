// src/lib/rbac.js
// Role rules:
// USER: no raw json, no iocs, rule names masked
// SOC_ANALYST: no raw json, no iocs, real rule name visible
// ADMIN: full access

const LS_AUTH = "scriem.auth"; // { token, role, username }

export function getAuth() {
  try {
    const raw = localStorage.getItem(LS_AUTH);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRole() {
  const auth = getAuth();
  const role = auth?.role;
  return typeof role === "string" ? role.toUpperCase() : "USER";
}

export function isAdmin() {
  return getRole() === "ADMIN";
}

export function isSocAnalyst() {
  return getRole() === "SOC_ANALYST";
}

export function isUser() {
  return getRole() === "USER";
}

// ---------- Permissions ----------
export function canSeeRaw() {
  return isAdmin(); // only ADMIN
}

export function canCopyIocs() {
  return isAdmin(); // only ADMIN
}

export function canCopyEvidenceJson() {
  return isAdmin(); // only ADMIN
}

export function canSeeRuleName() {
  // SOC_ANALYST + ADMIN see real rule name
  return isSocAnalyst() || isAdmin();
}

// ---------- Display helpers (used by UI) ----------
// ✅ TimelineStream.jsx expects this
export function displayRuleName(ruleName, fallbackId = null) {
  if (canSeeRuleName()) return ruleName || "—";

  // USER: show masked rule name
  // If you have rule id somewhere, pass it as fallbackId
  const n =
    fallbackId ??
    (typeof ruleName === "string"
      ? (ruleName.match(/\d+/)?.[0] ?? null)
      : null);

  return n ? `Threat Rule #${n}` : "Threat Rule";
}
