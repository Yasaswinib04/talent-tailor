import React, { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { errMessage } from "../lib/api";
import { ArrowRight, Loader2, AlertTriangle } from "lucide-react";

export default function Login() {
  const { user, checking, signIn } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Send them back to wherever they were headed before the redirect.
  const from = location.state?.from || "/app";

  if (checking) return <div className="min-h-screen bg-app" />;
  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signIn(email.trim(), password);
      nav(from, { replace: true });
    } catch (err) {
      setError(errMessage(err, "Couldn't sign you in."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-white flex items-center justify-center px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, #5E6AD2 0%, transparent 55%)" }}
      />
      <div className="w-full max-w-sm relative">
        <div className="font-editorial text-3xl leading-none mb-2">
          cred<span className="text-brand">.</span>hr
        </div>
        <div className="font-mono-label mb-10">talent · engine</div>

        <h1 className="font-display text-2xl font-semibold mb-1">Sign in</h1>
        <p className="text-white/50 text-sm mb-8">Candidate data is restricted to your team.</p>

        <form onSubmit={submit} className="space-y-6" data-testid="login-form">
          <label className="block">
            <div className="font-mono-label mb-2">work email</div>
            <input
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
              className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-brand outline-none transition-colors"
            />
          </label>
          <label className="block">
            <div className="font-mono-label mb-2">password</div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
              className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-brand outline-none transition-colors"
            />
          </label>

          {error && (
            <div className="border border-danger/50 bg-danger/10 px-3 py-2.5 flex items-start gap-2" data-testid="login-error">
              <AlertTriangle size={13} className="text-danger mt-0.5 shrink-0" />
              <span className="text-xs text-white/80">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="login-submit"
            className="w-full bg-brand text-white px-5 py-3 text-sm hover:bg-brand/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 linear-glow"
          >
            {busy ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={14} /></>}
          </button>
        </form>

        <p className="mt-8 text-[11px] text-white/30 leading-relaxed">
          No account? Ask an admin on your team to add you.
        </p>
      </div>
    </div>
  );
}
