import axios from "axios";

// CRA inlines this at BUILD time. When it is unset the value becomes the
// string "undefined", which silently produces requests to "undefined/api/..."
// — a bundle that looks fine and fails on every call. Fail at load instead.
const BASE = process.env.REACT_APP_BACKEND_URL;

// Throwing here would blank the whole app, including the screen that explains
// the problem — so surface it as a value and let index.js render it.
export const CONFIG_ERROR =
  !BASE || BASE === "undefined" || BASE === "null"
    ? "REACT_APP_BACKEND_URL was not set when this bundle was built."
    : null;

if (CONFIG_ERROR) console.error(CONFIG_ERROR);

export const api = axios.create({
  baseURL: `${(BASE || "").replace(/\/+$/, "")}/api`,
  headers: { "Content-Type": "application/json" },
  // The session lives in an httpOnly cookie, so it must be sent cross-origin.
  withCredentials: true,
});

// A 401 anywhere means the session ended — expired, revoked, or signed out in
// another tab. Notify once and let the app route to the login screen, rather
// than letting every in-flight call render its own error.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || "";
    // /auth/me probing for a session, and a failed sign-in, are expected 401s.
    const isAuthProbe = url.includes("/auth/me") || url.includes("/auth/login");
    if (err.response?.status === 401 && !isAuthProbe) onUnauthorized?.();
    return Promise.reject(err);
  }
);

export const fmtINR = (n) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export const cx = (...arr) => arr.filter(Boolean).join(" ");

/** Turn an axios failure into something worth showing a person. */
export const errMessage = (err, fallback = "Something went wrong.") => {
  if (err?.response) {
    const detail = err.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (err.response.status === 404) return "Not found.";
    if (err.response.status >= 500) return "The server had a problem. Try again in a moment.";
    return fallback;
  }
  if (err?.request) return "Can't reach the server — check your connection.";
  return fallback;
};
