import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, setSession } from "../lib/api";
import { identify, track } from "../lib/analytics";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Sign in / create account. One page, one toggle — the product's discovery
 * still happens after this (empty workspace offers sample data), so the ask
 * here is as small as an account gate can be.
 */
export default function Auth({ mode: initialMode = "signup" }) {
  const nav = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "signup"
          ? await api.post("/auth/signup", form)
          : await api.post("/auth/login", { email: form.email, password: form.password });
      setSession(res.data.token, res.data.user);
      // Identify before the first in-app event so this session's replay and
      // pageviews stitch to the same person the backend reports on.
      identify(res.data.user);
      track(mode === "signup" ? "signed_up" : "signed_in");
      nav(location.state?.from || "/app");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      track("auth_failed", { mode, status: err?.response?.status || null });
      setError(
        Array.isArray(detail)
          ? detail[0]?.msg?.replace(/^Value error, /, "") || "Please check your details."
          : typeof detail === "string"
          ? detail
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen bg-app text-white flex flex-col">
      <div className="border-b hairline">
        <div className="max-w-4xl mx-auto px-8 py-5">
          <Link to="/" className="font-editorial text-xl">talent<span className="text-brand">.</span>tailor</Link>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="font-mono-label mb-3">{mode === "signup" ? "create your workspace" : "welcome back"}</div>
          <h1 className="font-editorial text-4xl mb-8">
            {mode === "signup" ? "Start shortlisting." : "Sign in."}
          </h1>
          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" && (
              <>
                <AuthField label="Your name" value={form.name} onChange={set("name")} testid="auth-name" autoFocus />
                <AuthField label="Company (optional)" value={form.company} onChange={set("company")} testid="auth-company" />
              </>
            )}
            <AuthField label="Work email" type="email" value={form.email} onChange={set("email")} testid="auth-email" autoFocus={mode === "login"} />
            <AuthField label="Password" type="password" value={form.password} onChange={set("password")} testid="auth-password"
              hint={mode === "signup" ? "At least 8 characters" : undefined} />
            {error && (
              <div data-testid="auth-error" className="border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <button type="submit" disabled={busy} data-testid="auth-submit" className="btn btn-light w-full justify-center disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              {mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={14} />
            </button>
          </form>
          <div className="mt-6 text-sm text-white/65">
            {mode === "signup" ? (
              <>Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(null); }} data-testid="auth-switch-login" className="text-brand hover:text-white underline underline-offset-2">Sign in</button>
              </>
            ) : (
              <>New here?{" "}
                <button onClick={() => { setMode("signup"); setError(null); }} data-testid="auth-switch-signup" className="text-brand hover:text-white underline underline-offset-2">Create an account</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthField({ label, value, onChange, testid, type = "text", hint, autoFocus }) {
  return (
    <label className="block">
      <div className="font-mono-label mb-1.5">{label}</div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        data-testid={testid}
        autoFocus={autoFocus}
        required={!label.includes("optional")}
        className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-white outline-none"
      />
      {hint && <div className="mt-1 text-[11px] text-white/55">{hint}</div>}
    </label>
  );
}
