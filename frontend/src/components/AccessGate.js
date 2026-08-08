import React, { useEffect, useState } from "react";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { api, setAccessCode, clearAccessCode, getAccessCode } from "../lib/api";

/**
 * Wraps the recruiter app. Candidate data (names, emails, phone numbers,
 * expected CTC, private notes) is only fetched once a valid code is supplied.
 * The code lives in sessionStorage — it is never baked into the JS bundle.
 */
export default function AccessGate({ children }) {
  const [state, setState] = useState(getAccessCode() ? "checking" : "locked");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Validate a code already held in this tab. Only a 401 means the code is
  // wrong — a network failure must not sign the recruiter out mid-session.
  useEffect(() => {
    if (state !== "checking") return;
    api
      .get("/jobs")
      .then(() => setState("open"))
      .catch((err) => {
        if (err?.response?.status === 401) {
          clearAccessCode();
          setState("locked");
        } else {
          setState("open");
        }
      });
  }, [state]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    setAccessCode(code.trim());
    try {
      await api.get("/jobs");
      setState("open");
    } catch (err) {
      if (err?.response?.status === 401) {
        clearAccessCode();
        setError("That code isn't right.");
      } else {
        // Keep the code — the server, not the code, is the problem.
        setError("Can't reach the server. Try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === "open") return children;

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-app text-white/40 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-white flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm" data-testid="access-gate">
        <div className="font-editorial text-3xl leading-none mb-10">
          cred<span className="text-brand">.</span>hr
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Lock size={13} className="text-brand" />
          <span className="font-mono-label">recruiter access</span>
        </div>
        <h1 className="font-display text-2xl font-medium mb-2">Enter your access code.</h1>
        <p className="text-white/50 text-sm mb-7">
          This workspace holds candidate contact details. Your team lead has the code.
        </p>
        <input
          type="password"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          data-testid="access-code-input"
          placeholder="Access code"
          className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-brand outline-none mb-2 transition-colors"
        />
        {error && (
          <div className="text-[11px] text-red-400 mb-2" data-testid="access-error">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          data-testid="access-submit"
          className="mt-5 w-full bg-brand text-white px-5 py-3 text-sm hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          Open workspace
        </button>
        <p className="mt-8 text-[11px] text-white/30 leading-relaxed">
          Applying for a role? You don't need a code — use the link the recruiter sent you.
        </p>
      </form>
    </div>
  );
}
