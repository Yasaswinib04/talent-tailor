import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, fmtINR, errMsg } from "../lib/api";
import { Upload, Check, Loader2, ArrowRight, Sparkles, FileText, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  current_title: "",
  current_company: "",
  experience_years: "",
  expected_ctc: "",
  location: "",
  education: "",
  notice_period: "",
  resume_text: "",
};

const DEMO_FORM = {
  name: "Aarav Menon",
  email: "aarav.menon@email.in",
  phone: "+91 98450 22118",
  current_title: "Senior Frontend Engineer",
  current_company: "Razorpay",
  experience_years: 5.5,
  expected_ctc: 4000000,
  location: "Bengaluru",
  education: "B.Tech, IIT Roorkee",
  notice_period: "60 days",
  resume_text:
    "Senior Frontend Engineer at Razorpay. 5.5 years of production React, TypeScript, Next.js. Built the design system used across all consumer surfaces. Previously at Freshworks working on performance optimization. B.Tech from IIT Roorkee.",
};

const REQUIRED = [
  ["name", "Full name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["current_title", "Current title"],
  ["current_company", "Current company"],
];

/**
 * Public apply flow. A resume upload pre-fills whatever we can genuinely read
 * from the file; anything we can't read is left blank for the candidate to
 * complete. We never invent details on someone's behalf.
 */
export default function PublicApply() {
  const { slug } = useParams();
  const [job, setJob] = useState(null);
  const [stage, setStage] = useState("upload"); // upload -> scanning -> review -> submitted
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [scanText, setScanText] = useState("");
  const [readNote, setReadNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    api.get(`/jobs/share/${slug}`).then((r) => setJob(r.data)).catch(() => setJob(false));
  }, [slug]);

  /** Pull what we can out of plain-text resumes. No guessing beyond this. */
  const extractFromText = (text) => {
    const found = {};
    const email = text.match(/[^\s<>()]+@[^\s<>()]+\.[a-z]{2,}/i);
    if (email) found.email = email[0];
    const phone = text.match(/(?:\+91[\s-]?)?\d[\d\s-]{8,13}\d/);
    if (phone) found.phone = phone[0].trim();
    const years = text.match(/(\d{1,2}(?:\.\d)?)\s*\+?\s*years?/i);
    if (years) found.experience_years = Number(years[1]);
    // A name is only trustworthy if the first non-empty line looks like one.
    const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "";
    if (/^[A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*){1,3}$/.test(firstLine) && firstLine.length <= 60) {
      found.name = firstLine.replace(/\b\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
    }
    found.resume_text = text.slice(0, 20000);
    return found;
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDemo(false);
    setError("");
    setStage("scanning");
    setScanText(file.name);

    const isPlainText = /\.txt$/i.test(file.name) || file.type === "text/plain";
    let found = {};
    if (isPlainText) {
      try {
        found = extractFromText(await file.text());
      } catch {
        found = {};
      }
    }
    // Keep the scan visible long enough to read, then show what we actually got.
    await new Promise((r) => setTimeout(r, 900));

    const filled = Object.keys(found).filter((k) => k !== "resume_text" && found[k]);
    setForm({ ...EMPTY_FORM, ...found });
    setReadNote(
      isPlainText
        ? filled.length
          ? `Read ${filled.length} field${filled.length > 1 ? "s" : ""} from ${file.name}. Please check them and fill in the rest.`
          : `We couldn't pull any details out of ${file.name}. Please fill the form in below.`
        : `We can't read ${file.name.split(".").pop().toUpperCase()} files automatically yet — please fill the form in below. Your file details aren't stored.`
    );
    setStage("review");
    e.target.value = "";
  };

  const onDemoParse = async () => {
    setIsDemo(true);
    setError("");
    setStage("scanning");
    setScanText("sample-resume.pdf");
    await new Promise((r) => setTimeout(r, 1200));
    setForm(DEMO_FORM);
    setReadNote("This is sample data for trying the flow — replace it with your own details.");
    setStage("review");
  };

  const missing = REQUIRED.filter(([k]) => !String(form[k] ?? "").trim()).map(([, label]) => label);

  const submit = async () => {
    if (submitting) return;
    if (missing.length) {
      setError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post(`/apply/${slug}`, {
        ...form,
        experience_years: Number(form.experience_years) || 0,
        expected_ctc: Number(form.expected_ctc) || 0,
      });
      setResult(res.data);
      setStage("submitted");
    } catch (e) {
      setError(errMsg(e, "We couldn't submit your application. Please try again."));
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
              <h2 className="font-display text-2xl font-medium mb-2">Start with your resume</h2>
              <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">
                Upload a <span className="text-white/70">.txt</span> resume and we'll pre-fill what we can read.
                PDF and Word uploads still need a quick manual fill — it takes about a minute.
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
                {["name", "email address", "phone number", "years of experience"].map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 * i }}
                    className="flex items-center gap-3 text-xs text-white/70"
                  >
                    <Loader2 size={12} className="text-brand animate-spin" />
                    <span>Looking for {s}…</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "review" && (
            <motion.div key="r" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="border hairline p-8 bg-surface/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-brand" />
                <div className="font-mono-label">
                  {isDemo ? "sample data · edit before submitting" : "your details · confirm and submit"}
                </div>
              </div>
              {readNote && (
                <div
                  className="mb-6 text-[11px] text-white/60 border border-brand/20 bg-brand/5 px-3 py-2 flex items-start gap-2"
                  data-testid="pa-read-note"
                >
                  <AlertCircle size={11} className="text-brand mt-0.5 shrink-0" />
                  <span>{readNote}</span>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-6">
                <FieldPA label="Full name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="pa-name" />
                <FieldPA label="Email" required type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} testid="pa-email" />
                <FieldPA label="Phone" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} testid="pa-phone" />
                <FieldPA label="Current title" required value={form.current_title} onChange={(v) => setForm({ ...form, current_title: v })} testid="pa-title" />
                <FieldPA label="Current company" required value={form.current_company} onChange={(v) => setForm({ ...form, current_company: v })} testid="pa-company" />
                <FieldPA label="Experience (years)" value={form.experience_years} type="number" onChange={(v) => setForm({ ...form, experience_years: v })} testid="pa-exp" />
                <FieldPA label="Expected CTC (INR)" value={form.expected_ctc} type="number" onChange={(v) => setForm({ ...form, expected_ctc: v })} testid="pa-ctc" />
                <FieldPA label="Current location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} testid="pa-location" />
                <FieldPA label="Highest education" value={form.education} onChange={(v) => setForm({ ...form, education: v })} testid="pa-education" />
                <FieldPA label="Notice period" value={form.notice_period} onChange={(v) => setForm({ ...form, notice_period: v })} testid="pa-notice" placeholder="e.g. 30 days / Immediate" />
              </div>
              {error && (
                <div
                  className="mt-6 text-xs text-red-400 border border-red-400/30 bg-red-400/5 px-3 py-2 flex items-start gap-2"
                  data-testid="pa-error"
                >
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => { setStage("upload"); setError(""); }} data-testid="pa-back-btn" className="text-sm text-white/50 hover:text-white transition-colors">
                  ← Start over
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  data-testid="pa-submit-btn"
                  className="bg-white text-black px-6 py-3 text-sm hover:bg-gray-200 inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <>Submit application <ArrowRight size={14} /></>}
                </button>
              </div>
            </motion.div>
          )}

          {stage === "submitted" && result && (
            <motion.div key="d" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="border border-brand/40 p-12 bg-surface/40 text-center shadow-[0_0_60px_-20px_rgba(178,138,93,0.5)]">
              <div className="w-14 h-14 border border-brand rounded-full mx-auto flex items-center justify-center mb-6">
                <Check size={22} className="text-brand" />
              </div>
              <h2 className="font-editorial text-4xl mb-3">{result.updated ? "Application updated." : "Applied."}</h2>
              <p className="text-white/60 max-w-md mx-auto mb-8">
                {result.updated
                  ? "We already had a profile for this email, so we've updated it and added this role. Your match score is:"
                  : "Our team will review your profile. Your match score for this role is:"}
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

function FieldPA({ label, value, onChange, testid, type = "text", required, placeholder }) {
  return (
    <label className="block">
      <div className="font-mono-label mb-1.5">
        {label}
        {required && <span className="text-brand ml-1">*</span>}
      </div>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        placeholder={placeholder}
        className="w-full bg-transparent border-b hairline pb-2 text-lg focus:border-white outline-none placeholder:text-white/25"
      />
    </label>
  );
}
