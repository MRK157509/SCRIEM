import { getRole } from "./auth";

// Strict security mode:
// - Only ADMIN can see raw JSON / copy JSON / copy IOCs
export function isAdmin() {
  return (getRole() || "").toUpperCase() === "ADMIN";
}

export function canSeeRaw() {
  return isAdmin();
}

export function canCopyEvidenceJson() {
  return isAdmin();
}

export function canCopyIocs() {
  return isAdmin();
}

export function displayRuleName(alert) {
  if (!alert) return "";
  if (isAdmin()) return alert.rule_name || "";
  // Mask for everyone except ADMIN:
  const id = alert.id ?? alert.alert_id ?? "";
  return id ? `Threat Rule #${id}` : "Threat Rule";
}
