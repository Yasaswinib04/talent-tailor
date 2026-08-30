import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Building2, Briefcase, UserPlus, Loader2, AlertTriangle } from "lucide-react";
import { api, errMessage } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  { id: 1, title: "Your company", icon: Building2 },
  { id: 2, title: "Your first role", icon: Briefcase },
  { id: 3, title: "Invite your team", icon: UserPlus },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState({ name: "", size: "50-500", industry: "Fintech" });
  const [role, setRole] = useState({ title: "", department: "Engineering", location: "Bengaluru" });
  const [invites, setInvites] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const nav = useNavigate();

  // Everything entered across these three steps used to be discarded on Finish.
  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const emails = invites
        .split(/[,\s]+/)
        .map((e) => e.trim())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e));
      const res = await api.post("/onboarding", {
        company_name: company.name,
        company_size: company.size,
        industry: company.industry,
        role_title: role.title,
        role_department: role.department,
        role_location: role.location,
        invite_emails: emails,
      });
      // If they named a first role, take them straight into it.
      nav(res.data.job ? `/app/jobs/${res.data.job.id}` : "/app");
    } catch (err) {
      setSaveError(errMessage(err, "Couldn't save your setup. Nothing was lost — try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, #B28A5D 0%, transparent 50%)" }}
      />
      <div className="max-w-3xl mx-auto px-8 py-16 relative">
        {/* Brand */}
        <div className="flex items-center justify-between mb-16">
          <div className="font-editorial text-2xl leading-none">
            cred<span className="text-brand">.</span>hr
          </div>
          <button
            onClick={() => nav("/app")}
            data-testid="skip-onboarding-btn"
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            Skip →
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-4 mb-16">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 flex items-center justify-center border transition-colors ${
                    step >= s.id ? "border-brand bg-brand text-black" : "border-white/20 text-white/40"
                  }`}
                >
                  {step > s.id ? <Check size={14} /> : <span className="font-mono text-xs">0{s.id}</span>}
                </div>
                <div className={`text-sm ${step >= s.id ? "text-white" : "text-white/40"}`}>{s.title}</div>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-px ${step > s.id ? "bg-brand" : "bg-white/10"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="border hairline p-10 bg-surface/40 backdrop-blur-sm min-h-[420px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="font-mono-label mb-4">step 01 · takes 30 seconds</div>
                <h2 className="font-editorial text-4xl mb-2">Tell us where you work.</h2>
                <p className="text-white/50 mb-8">We use this to shape the templates for your team.</p>
                <div className="space-y-5">
                  <Field label="Company name">
                    <input
                      data-testid="onb-company-name"
                      placeholder="Your company"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-white outline-none"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-8">
                    <Field label="Team size">
                      <select
                        data-testid="onb-company-size"
                        value={company.size}
                        onChange={(e) => setCompany({ ...company, size: e.target.value })}
                        className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-white outline-none"
                      >
                        <option className="bg-app">1-50</option>
                        <option className="bg-app">50-500</option>
                        <option className="bg-app">500-1000</option>
                        <option className="bg-app">1000+</option>
                      </select>
                    </Field>
                    <Field label="Industry">
                      <select
                        data-testid="onb-company-industry"
                        value={company.industry}
                        onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                        className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-white outline-none"
                      >
                        <option className="bg-app">Fintech</option>
                        <option className="bg-app">SaaS</option>
                        <option className="bg-app">Consumer Tech</option>
                        <option className="bg-app">D2C</option>
                        <option className="bg-app">Other</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="font-mono-label mb-4">step 02 · we'll set the rest for you</div>
                <h2 className="font-editorial text-4xl mb-2">What's your first hire?</h2>
                <p className="text-white/50 mb-8">Just a title. You'll add the JD & skills next — it's fast.</p>
                <div className="space-y-5">
                  <Field label="Role title">
                    <input
                      data-testid="onb-role-title"
                      placeholder="e.g. Senior Frontend Engineer"
                      value={role.title}
                      onChange={(e) => setRole({ ...role, title: e.target.value })}
                      className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-white outline-none"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-8">
                    <Field label="Department">
                      <select
                        data-testid="onb-role-dept"
                        value={role.department}
                        onChange={(e) => setRole({ ...role, department: e.target.value })}
                        className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-white outline-none"
                      >
                        <option className="bg-app">Engineering</option>
                        <option className="bg-app">Product</option>
                        <option className="bg-app">Design</option>
                        <option className="bg-app">Growth</option>
                        <option className="bg-app">Ops</option>
                      </select>
                    </Field>
                    <Field label="Location">
                      <input
                        data-testid="onb-role-location"
                        value={role.location}
                        onChange={(e) => setRole({ ...role, location: e.target.value })}
                        className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-white outline-none"
                      />
                    </Field>
                  </div>
                </div>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="font-mono-label mb-4">step 03 · optional</div>
                <h2 className="font-editorial text-4xl mb-2">Bring the crew.</h2>
                <p className="text-white/50 mb-8">Add teammate emails to collaborate. Skip if it's just you.</p>
                <Field label="Team emails (comma separated)">
                  <textarea
                    data-testid="onb-invite-emails"
                    placeholder="anita@cred.club, kunal@cred.club"
                    value={invites}
                    onChange={(e) => setInvites(e.target.value)}
                    className="w-full bg-transparent border hairline p-3 focus:border-white outline-none min-h-[120px] text-sm"
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {saveError && (
          <div className="mt-6 border border-danger/50 bg-danger/10 px-4 py-3 flex items-start gap-2" data-testid="onb-error">
            <AlertTriangle size={13} className="text-danger mt-0.5 shrink-0" />
            <span className="text-xs text-white/80">{saveError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => (step === 1 ? nav("/") : setStep(step - 1))}
            data-testid="onb-back-btn"
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <div className="font-mono-label">step {String(step).padStart(2, "0")} / 03</div>
            <button
              data-testid="onb-continue-btn"
              disabled={saving || (step === 1 && !company.name.trim())}
              onClick={() => {
                if (step < 3) setStep(step + 1);
                else finish();
              }}
              className="bg-white text-black px-6 py-3 text-sm hover:bg-gray-200 inline-flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : <>{step === 3 ? "Finish & set up first role" : "Continue"} <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="font-mono-label mb-2">{label}</div>
      {children}
    </label>
  );
}
