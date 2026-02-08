const LS_TOKEN = "scriem.auth.token";
const LS_ROLE = "scriem.auth.role";
const LS_USER = "scriem.auth.user";

function emitAuthChanged() {
  window.dispatchEvent(new CustomEvent("scriem:auth:changed"));
}

export function setSession({ token, role, username }) {
  if (token) localStorage.setItem(LS_TOKEN, token);
  if (role) localStorage.setItem(LS_ROLE, role);
  if (username) localStorage.setItem(LS_USER, username);
  emitAuthChanged();
}

export function clearSession() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_ROLE);
  localStorage.removeItem(LS_USER);
  emitAuthChanged();
}

export function getToken() {
  return localStorage.getItem(LS_TOKEN) || "";
}

export function getRole() {
  return (localStorage.getItem(LS_ROLE) || "USER").toUpperCase();
}

export function getUsername() {
  return localStorage.getItem(LS_USER) || "user";
}

export function isLoggedIn() {
  return !!getToken();
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
