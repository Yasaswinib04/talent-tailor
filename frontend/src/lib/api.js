import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;

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
  baseURL: `${BASE}/api`,
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
