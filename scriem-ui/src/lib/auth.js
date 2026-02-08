const LS_AUTH = "scriem.auth.v1";

/**
 * Stored shape:
 * { token: string, role: "USER"|"SOC_ANALYST"|"ADMIN", username: string }
 */

export function getAuth() {
  try {
    const raw = localStorage.getItem(LS_AUTH);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getToken() {
  return getAuth()?.token || "";
}

export function getRole() {
  return getAuth()?.role || "";
}

export function isAuthed() {
  return !!getToken();
}

export function setAuth({ token, role, username }) {
  localStorage.setItem(LS_AUTH, JSON.stringify({ token, role, username }));
}

export function clearAuth() {
  localStorage.removeItem(LS_AUTH);
}
