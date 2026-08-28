import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, fmtINR, errMessage } from "../lib/api";
import { Upload, Check, Loader2, ArrowRight, Sparkles, FileText, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Public apply flow — the "auto-apply" experience.
 * Candidate uploads a resume (text/file, we simulate parsing), form auto-fills,
 * they hit submit. Response shows their match score.
 */
export default function PublicApply() {
  const { slug } = useParams();
  const [job, setJob] = useState(null);
  const [stage, setStage] = useState("upload"); // upload -> scanning -> review -> submitted
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    current_title: "",
    current_company: "",
    experience_years: 0,
    expected_ctc: 0,
    resume_text: "",
  });
  const [result, setResult] = useState(null);
  const [scanText, setScanText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [invalid, setInvalid] = useState({});

  useEffect(() => {
    api.get(`/jobs/share/${slug}`).then((r) => setJob(r.data)).catch(() => setJob(false));
  }, [slug]);

  const simulateParse = async (text, filename) => {
    setStage("scanning");
    setScanText(filename || "resume.pdf");
    await new Promise((r) => setTimeout(r, 1600));
    // Mock parse: pull "name" / "title" from text if provided, otherwise use sample
    const sample = {
      name: "Aarav Menon",
      email: "aarav.menon@email.in",
      phone: "+91 98450 22118",
      current_title: "Senior Frontend Engineer",
      current_company: "Razorpay",
      experience_years: 5.5,
      expected_ctc: 4000000,
      resume_text:
        text ||
        "Senior Frontend Engineer at Razorpay. 5.5 years of production React, TypeScript, Next.js. Built the design system used across all consumer surfaces. Previously at Freshworks working on performance optimization. B.Tech from IIT Roorkee.",
    };
    setForm(sample);
    setStage("review");
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // We can't truly parse PDF here; simulate.
    simulateParse("", file.name);
  };

  const onDemoParse = () => simulateParse("");

  const fieldErrors = () => {
    const e = {};
    if (!form.name.trim() || !/[^\W\d_]/u.test(form.name)) e.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Please enter a valid email address.";
    if (form.experience_years < 0 || form.experience_years > 60) e.experience_years = "Enter a number between 0 and 60.";
    if (form.expected_ctc < 0) e.expected_ctc = "This can't be negative.";
    return e;
  };

  const submit = async () => {
    if (submitting) return;
    const errs = fieldErrors();
    setInvalid(errs);
    if (Object.keys(errs).length) {
      setSubmitError("Please fix the highlighted fields before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await api.post(`/apply/${slug}`, form);
      setResult(res.data);
      setStage("submitted");
    } catch (err) {
      // Keep them on the review step with their details intact so they can retry.
      setSubmitError(errMessage(err, "We couldn't submit your application. Nothing was lost — try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (job === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app text-white/60">
        This job link is no longer active.
      </div>
    );
  }
  if (!job) return <div className="min-h-screen flex items-center justify-center text-white/40">Loading…</div>;

  return (
    <div className="min-h-screen bg-app text-white">
      {/* Header */}
      <div className="border-b hairline">
        <div className="max-w-4xl mx-auto px-8 py-5 flex items-center justify-between">
          <Link to="/" className="font-editorial text-xl">cred<span className="text-brand">.</span>hr</Link>
          <div className="font-mono-label">apply · in 30 seconds</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Job header */}
        <div className="mb-10">
          <div className="font-mono-label mb-3">{job.department} · {job.location}</div>
          <h1 className="font-editorial text-5xl md:text-6xl leading-[0.95] mb-4">{job.title}</h1>
          <div className="flex items-baseline gap-4">
            <span className="font-editorial text-2xl text-brand">{fmtINR(job.salary_min)} – {fmtINR(job.salary_max)}</span>
            <span className="font-mono-label">per annum</span>
          </div>
          <div className="mt-6 border-l-2 border-brand pl-4 text-white/70 text-sm leading-relaxed whitespace-pre-line max-w-2xl">
            {job.jd}
          </div>
        </div>

        {/* Flow */}
        <AnimatePresence mode="wait">
          {stage === "upload" && (
            <motion.div key="u" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-2 border-dashed hairline p-12 text-center bg-surface/30 hover:border-brand/50 transition-colors">
              <Upload size={28} className="text-brand mx-auto mb-4" />
              <h2 className="font-display text-2xl font-medium mb-2">Drop your resume — we do the rest</h2>
              <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">
                No forms. No typing your job history twice. Upload once, we extract everything.
              </p>
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={onFile}
                  className="hidden"
                  data-testid="pa-file-input"
                />
                <span className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 text-sm hover:bg-gray-200 transition-colors">
                  <Upload size={14} /> Upload resume
                </span>
              </label>
              <div className="mt-6 text-[11px] text-white/40">
                or{" "}
                <button onClick={onDemoParse} data-testid="pa-demo-btn" className="text-brand hover:text-white underline underline-offset-2">
                  try with a demo resume
                </button>
              </div>
            </motion.div>
          )}

          {stage === "scanning" && (
            <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border hairline p-12 bg-surface/30 relative overflow-hidden">
              <div className="absolute inset-x-0 h-32 bg-gradient-to-b from-brand/20 to-transparent animate-trace pointer-events-none" />
              <div className="flex items-center gap-4 mb-6">
                <FileText size={20} className="text-brand" />
                <div>
                  <div className="font-mono-label">reading</div>
                  <div className="font-medium">{scanText}</div>
                </div>
                <Loader2 size={16} className="animate-spin text-brand ml-auto" />
              </div>
              <div className="space-y-2">
                {["Name and contact", "Current title & company", "Years of experience", "Skills & expertise", "Education"].map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 * i }}
                    className="flex items-center gap-3 text-xs text-white/70"
                  >
                    <Check size={12} className="text-success" />
                    <span>Extracted {s.toLowerCase()}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "review" && (
            <motion.div key="r" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="border hairline p-8 bg-surface/30">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles size={14} className="text-brand" />
                <div className="font-mono-label">auto-filled · confirm and submit</div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <FieldPA label="Full name" value={form.name} error={invalid.name} onChange={(v) => setForm({ ...form, name: v })} testid="pa-name" />
                <FieldPA label="Email" value={form.email} error={invalid.email} onChange={(v) => setForm({ ...form, email: v })} testid="pa-email" />
                <FieldPA label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} testid="pa-phone" />
                <FieldPA label="Current title" value={form.current_title} onChange={(v) => setForm({ ...form, current_title: v })} testid="pa-title" />
                <FieldPA label="Current company" value={form.current_company} onChange={(v) => setForm({ ...form, current_company: v })} testid="pa-company" />
                <FieldPA label="Experience (years)" value={form.experience_years} error={invalid.experience_years} type="number" onChange={(v) => setForm({ ...form, experience_years: Number(v) })} testid="pa-exp" />
                <FieldPA label="Expected CTC (INR)" value={form.expected_ctc} error={invalid.expected_ctc} onChange={(v) => setForm({ ...form, expected_ctc: Number(v) })} type="number" testid="pa-ctc" />
              </div>
              {submitError && (
                <div className="mt-6 border border-danger/50 bg-danger/10 px-4 py-3 flex items-start gap-2" data-testid="pa-submit-error">
                  <AlertTriangle size={13} className="text-danger mt-0.5 shrink-0" />
                  <span className="text-xs text-white/80">{submitError}</span>
                </div>
              )}
              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setStage("upload")} data-testid="pa-back-btn" className="text-sm text-white/50 hover:text-white transition-colors">
                  ← Upload a different resume
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  data-testid="pa-submit-btn"
                  className="bg-white text-black px-6 py-3 text-sm hover:bg-gray-200 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                    : <>Submit application <ArrowRight size={14} /></>}
                </button>
              </div>
            </motion.div>
          )}

          {stage === "submitted" && result && (
            <motion.div key="d" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="border border-brand/40 p-12 bg-surface/40 text-center shadow-[0_0_60px_-20px_rgba(178,138,93,0.5)]">
              <div className="w-14 h-14 border border-brand rounded-full mx-auto flex items-center justify-center mb-6">
                <Check size={22} className="text-brand" />
              </div>
              <h2 className="font-editorial text-4xl mb-3">
                {result.duplicate ? "Updated." : "Applied."}
              </h2>
              <p className="text-white/60 max-w-md mx-auto mb-8" data-testid="pa-result-message">
                {result.message || "Our team will review your profile. Your match score for this role is:"}
              </p>
              <div className="font-editorial text-8xl text-brand mb-2">{result.match_score}</div>
              <div className="font-mono-label">match / 100</div>
              <div className="mt-10 text-xs text-white/40">You may safely close this tab.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FieldPA({ label, value, onChange, testid, type = "text", error }) {
  return (
    <label className="block">
      <div className="font-mono-label mb-1.5">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        aria-invalid={error ? "true" : undefined}
        className={`w-full bg-transparent border-b pb-2 text-lg outline-none transition-colors ${
          error ? "border-danger focus:border-danger" : "hairline focus:border-white"
        }`}
      />
      {error && (
        <div className="mt-1.5 text-[11px] text-danger" data-testid={`${testid}-error`}>
          {error}
        </div>
      )}
    </label>
  );
}
