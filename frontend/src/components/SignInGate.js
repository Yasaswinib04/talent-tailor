import React, { useState } from "react";
import { api } from "../lib/api";
import { ArrowRight, Lock } from "lucide-react";

/**
 * Identification gate in front of the app (not the public apply link).
 *
 * Not authentication — no password, no session, nothing to forget. It exists to
 * answer one question: who has used this product? One honest email is the bar.
 * Identity is kept in localStorage so a returning visitor passes straight through;
 * the backend counts their visits.
 */
const STORAGE_KEY = "tt_visitor";

export function getVisitor() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export default function SignInGate({ children }) {
  const [visitor, setVisitor] = useState(getVisitor);
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (visitor) return children;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post("/visitors", form);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      setVisitor(res.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail[0]?.msg?.replace(/^Value error, /, "") || "Please check your details."
          : "Couldn't sign you in. Is the server running?"
      );
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, placeholder, type = "text", required = true) => (
    <div>
      <div className="font-mono-label mb-2">{label}</div>
      <input
        type={type}
        required={required}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        data-testid={`gate-${key}`}
        className="w-full bg-surface border hairline px-4 py-3 text-sm placeholder:text-white/40 focus:border-brand focus:outline-none transition-colors"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="font-editorial text-2xl mb-10 text-center">
          cred<span className="text-brand">.</span>hr
        </div>
        <form onSubmit={submit} className="border hairline bg-surface/40 p-8">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={13} className="text-brand" />
            <div className="font-mono-label">before you enter</div>
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Who's trying the demo?</h1>
          <p className="text-sm text-white/72 mb-8">
            No password, no account — we just like to know who's looking around.
          </p>
          <div className="space-y-5">
            {field("name", "your name", "Priya Sharma")}
            {field("email", "work email", "priya@company.com", "email")}
            {field("company", "company · optional", "Acme Corp", "text", false)}
          </div>
          {error && (
            <div data-testid="gate-error" className="mt-5 border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <button type="submit" disabled={busy} data-testid="gate-submit" className="btn btn-primary w-full mt-8">
            {busy ? "One moment…" : "Enter the demo"} <ArrowRight size={14} />
          </button>
        </form>
        <div className="text-center text-xs text-white/55 mt-6">
          Your details stay with us — no mailing lists, no spam.
        </div>
      </div>
    </div>
  );
}
