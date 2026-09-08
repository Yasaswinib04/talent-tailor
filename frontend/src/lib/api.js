import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;

// CRA inlines REACT_APP_* at build time, so an unset variable becomes the
// literal string "undefined" and every call goes to "undefined/api" — a bundle
// that looks fine until it 404s in the browser. scripts/check-env.js fails the
// build first; this is the belt-and-braces check, so a bundle built some other
// way says what is wrong instead of showing an empty shell.
export const CONFIG_ERROR =
  !BASE || BASE === "undefined" || BASE === "null"
    ? "REACT_APP_BACKEND_URL was not set when this bundle was built, so the app has no API to talk to."
    : null;

const TOKEN_KEY = "tt_token";
const USER_KEY = "tt_user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};
export const setSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const api = axios.create({
  baseURL: `${(BASE || "").replace(/\/+$/, "")}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // An expired/invalid session inside the app bounces to sign-in. Public
    // pages (landing, apply) never trigger this — their calls are unauthenticated.
    if (err?.response?.status === 401 && window.location.pathname.startsWith("/app")) {
      clearSession();
      window.location.assign("/login");
    }
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

/** FastAPI returns 422 detail as a list of per-field objects; a raw dump of that
 *  in the UI reads as a stack trace. Turn it into something a person can act on. */
export const errMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null;
        const msg = (d?.msg || "").replace(/^Value error, /, "");
        return field && field !== "body" ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }
  if (err?.response?.status === 429) return "Too many requests. Give it a minute and try again.";
  if (!err?.response) return "Could not reach the server. Check your connection and try again.";
  return fallback;
};
