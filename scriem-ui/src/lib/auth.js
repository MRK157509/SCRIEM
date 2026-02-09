// src/lib/auth.js
// Single source of truth for auth storage + role/user display.
// Keys must stay consistent across Login/Topbar/API.

const TOKEN_KEY = "scriem.auth.token";
const ROLE_KEY = "scriem.auth.role";
const USER_KEY = "scriem.auth.user";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function getRole() {
  try {
    return (localStorage.getItem(ROLE_KEY) || "USER").toUpperCase();
  } catch {
    return "USER";
  }
}

export function getUsername() {
  try {
    return localStorage.getItem(USER_KEY) || "";
  } catch {
    return "";
  }
}

export function setSession({ token, role, username }) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (role) localStorage.setItem(ROLE_KEY, String(role).toUpperCase());
    if (username) localStorage.setItem(USER_KEY, String(username));
  } catch {}

  window.dispatchEvent(new Event("scriem:auth:changed"));
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}

  window.dispatchEvent(new Event("scriem:auth:changed"));
}
