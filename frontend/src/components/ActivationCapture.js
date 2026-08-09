import React, { useState } from "react";
import { api } from "../lib/api";
import { Mail, Check } from "lucide-react";

/**
 * Asks for contact details at the activation moment — never before it.
 *
 * Activation here is "this person got a real shortlist", not "this person
 * opened the app". By the time this renders they have already done the work
 * and are looking at the result, so the ask trades on something delivered
 * rather than something promised. The value offered (send me this shortlist)
 * is a continuation of what they just did, not a toll for entering.
 *
 * Renders nothing once they've given details, or if there's no result yet.
 */
const STORAGE_KEY = "tt_visitor";

export function getVisitor() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export default function ActivationCapture({ context, count }) {
  const [visitor, setVisitor] = useState(getVisitor);
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (justSaved) {
    return (
      <div data-testid="capture-done" className="border border-brand/40 bg-brand/5 p-6 flex items-center gap-3">
        <Check size={16} className="text-brand shrink-0" />
        <div className="text-sm">
          Sent to <span className="text-white">{visitor?.email}</span> — we'll be in touch about
          running this on your own candidates.
        </div>
      </div>
    );
  }

  // Already known, or nothing worth capturing against yet.
  if (visitor || !count) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post("/visitors", { ...form, source: context || "shortlist" });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      setVisitor(res.data);
      setJustSaved(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail[0]?.msg?.replace(/^Value error, /, "") || "Please check your details."
          : "Couldn't save that. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="activation-capture" className="border hairline bg-surface/40 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Mail size={14} className="text-brand" />
        <div className="font-mono-label">take it with you</div>
      </div>
      <div className="font-display text-lg font-semibold mb-1">
        Email me this shortlist of {count}
      </div>
      <p className="text-sm text-white/72 mb-5 max-w-md">
        We'll send the ranked list, and show you what this looks like against your own
        candidate pool.
      </p>
      <form onSubmit={submit} className="flex flex-wrap gap-3 items-start">
        <input
          required
          value={form.name}
          placeholder="Your name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          data-testid="capture-name"
          className="bg-app border hairline px-4 py-2.5 text-sm placeholder:text-white/40 focus:border-brand focus:outline-none transition-colors flex-1 min-w-[140px]"
        />
        <input
          required
          type="email"
          value={form.email}
          placeholder="Work email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          data-testid="capture-email"
          className="bg-app border hairline px-4 py-2.5 text-sm placeholder:text-white/40 focus:border-brand focus:outline-none transition-colors flex-1 min-w-[180px]"
        />
        <button type="submit" disabled={busy} data-testid="capture-submit" className="btn btn-primary !py-2.5">
          {busy ? "Sending…" : "Send it"}
        </button>
      </form>
      {error && (
        <div data-testid="capture-error" className="mt-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
