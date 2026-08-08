import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;

if (!BASE) {
  // Without this the baseURL silently becomes "undefined/api" and every request
  // fails with a confusing network error.
  throw new Error(
    "REACT_APP_BACKEND_URL is not set. Set it before building the frontend (see .env.example)."
  );
}

export const api = axios.create({
  baseURL: `${BASE.replace(/\/+$/, "")}/api`,
  headers: { "Content-Type": "application/json" },
});

// ---- Recruiter access code -------------------------------------------------
// Stored per-tab, never bundled into the build, and attached to every request.
// Candidate-facing endpoints ignore it.
const CODE_KEY = "cred_hr_access_code";

export const getAccessCode = () => sessionStorage.getItem(CODE_KEY) || "";
export const setAccessCode = (code) => sessionStorage.setItem(CODE_KEY, code);
export const clearAccessCode = () => sessionStorage.removeItem(CODE_KEY);

api.interceptors.request.use((config) => {
  const code = getAccessCode();
  if (code) config.headers["X-Access-Code"] = code;
  return config;
});

/** Turn an axios failure into a short sentence we can show a user. */
export const errMsg = (e, fallback = "Something went wrong. Please try again.") => {
  if (e?.response) {
    const d = e.response.data;
    if (e.response.status === 401) return "Your session expired. Enter the access code again.";
    if (Array.isArray(d?.detail)) {
      const first = d.detail[0];
      const field = (first?.loc || []).filter((x) => x !== "body").join(" ");
      return `${field ? field + ": " : ""}${first?.msg || fallback}`;
    }
    if (typeof d?.detail === "string") return d.detail;
    return `Request failed (${e.response.status}).`;
  }
  if (e?.request) return "Can't reach the server. Check your connection and try again.";
  return fallback;
};

export const fmtINR = (n) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export const cx = (...arr) => arr.filter(Boolean).join(" ");
