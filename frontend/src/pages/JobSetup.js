import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR } from "../lib/api";
import { Sparkles, X, Plus, ChevronLeft, Zap, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SAMPLE_JD = `We're looking for a Senior Frontend Engineer to lead the UI architecture of our flagship consumer product. You'll work with React, TypeScript, and Next.js at scale, drive performance optimization, and shape our design systems used by millions of users in India.

Requirements:
- 5+ years of production React & TypeScript experience
- Deep understanding of web performance
- Experience building design systems
- Fintech / UPI / payments background is a plus`;

export default function JobSetup() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    department: "Engineering",
    location: "Bengaluru",
    seniority: "Senior",
    jd: "",
    skills: [],
    salary_min: 1500000,
    salary_max: 3000000,
    screening_questions: [],
  });
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Debounced extraction on JD change
  useEffect(() => {
    if (!form.jd || form.jd.length < 40) {
      setExtracted(false);
      return;
    }
    setExtracting(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.post("/extract-skills", { jd: form.jd });
        setForm((f) => ({
          ...f,
          skills: res.data.skills,
          salary_min: res.data.salary_suggestion.min,
          salary_max: res.data.salary_suggestion.max,
          screening_questions: res.data.screening_questions,
        }));
        setExtracted(true);
      } finally {
        setExtracting(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [form.jd]);

  const setSkillWeight = (idx, weight) => {
    setForm((f) => ({ ...f, skills: f.skills.map((s, i) => (i === idx ? { ...s, weight } : s)) }));
  };
  const removeSkill = (idx) => {
    setForm((f) => ({ ...f, skills: f.skills.filter((_, i) => i !== idx) }));
  };
  const addSkill = (name) => {
    if (!name.trim()) return;
    setForm((f) => ({ ...f, skills: [...f.skills, { name: name.trim(), weight: 3 }] }));
  };

  const publish = async () => {
    if (!form.title.trim()) return alert("Add a role title first");
    setSaving(true);
    try {
      const res = await api.post("/jobs", form);
      nav(`/app/jobs/${res.data.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b hairline px-8 py-5 flex items-center justify-between sticky top-0 bg-app/90 backdrop-blur-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => nav("/app")} data-testid="js-back-btn" className="text-white/50 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="font-mono-label">new role · draft</div>
            <div className="font-display text-lg font-medium">{form.title || "Untitled role"}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => nav("/app")} data-testid="js-cancel-btn" className="text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={publish}
            disabled={saving || !form.title}
            data-testid="js-publish-btn"
            className="bg-white text-black px-5 py-2.5 text-sm hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Publish role
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid md:grid-cols-2 gap-0 min-h-[calc(100vh-8rem)]">
        {/* LEFT — JD & Basics */}
        <div className="p-8 border-r hairline space-y-8">
          <div>
            <div className="font-mono-label mb-2">step 01 · role title</div>
            <input
              data-testid="js-title-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Senior Frontend Engineer"
              className="w-full bg-transparent text-3xl font-display font-medium border-b hairline focus:border-white pb-3 outline-none placeholder:text-white/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <SmallField label="Department">
              <select
                data-testid="js-dept-select"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:border-white outline-none"
              >
                {["Engineering", "Product", "Design", "Growth", "Ops", "Finance"].map((x) => <option key={x} className="bg-app">{x}</option>)}
              </select>
            </SmallField>
            <SmallField label="Location">
              <input
                data-testid="js-loc-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:border-white outline-none"
              />
            </SmallField>
            <SmallField label="Seniority">
              <select
                data-testid="js-seniority-select"
                value={form.seniority}
                onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:border-white outline-none"
              >
                {["Junior", "Mid", "Senior", "Lead", "Principal"].map((x) => <option key={x} className="bg-app">{x}</option>)}
              </select>
            </SmallField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono-label">step 02 · job description</div>
              <button
                data-testid="js-fill-sample-btn"
                onClick={() => setForm({ ...form, jd: SAMPLE_JD, title: form.title || "Senior Frontend Engineer" })}
                className="text-[10px] font-mono text-brand hover:text-white transition-colors"
              >
                fill with sample →
              </button>
            </div>
            <textarea
              data-testid="js-jd-textarea"
              value={form.jd}
              onChange={(e) => setForm({ ...form, jd: e.target.value })}
              placeholder="Paste or write the job description. Skills, salary, and screening questions will appear on the right as you type."
              className="w-full bg-transparent border hairline p-4 focus:border-white outline-none min-h-[380px] text-sm leading-relaxed"
            />
            <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40">
              <Zap size={10} className="text-brand" />
              <span>Extraction runs the moment you pause. No buttons to press.</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Live extraction */}
        <div className="p-8 bg-surface/30 relative">
          <div className="sticky top-24 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-brand" />
                  <span className="font-mono-label">live extraction</span>
                </div>
                {extracting && (
                  <span className="text-[10px] font-mono text-brand inline-flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> scanning
                  </span>
                )}
                {extracted && !extracting && (
                  <span className="text-[10px] font-mono text-success inline-flex items-center gap-1">
                    <Check size={10} /> ready
                  </span>
                )}
              </div>
              <h3 className="font-display text-xl font-medium mb-4">Skills we detected</h3>
              {form.skills.length === 0 && (
                <div className="border border-dashed hairline p-8 text-center text-white/40 text-sm">
                  Paste a job description to see skills, salary, and screening questions appear here — live.
                </div>
              )}
              <div className={`space-y-2 ${extracting ? "scan" : ""}`}>
                {form.skills.map((s, idx) => (
                  <motion.div
                    key={s.name + idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 border hairline p-2 pl-3 bg-app group"
                    data-testid={`js-skill-${idx}`}
                  >
                    <span className="font-mono text-xs text-white/90 flex-1">{s.name}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setSkillWeight(idx, n)}
                          data-testid={`js-skill-weight-${idx}-${n}`}
                          className={`w-2 h-4 border ${n <= s.weight ? "bg-brand border-brand" : "border-white/20"}`}
                          title={`Weight ${n}`}
                        />
                      ))}
                    </div>
                    <button onClick={() => removeSkill(idx)} className="text-white/30 hover:text-danger p-1" data-testid={`js-remove-skill-${idx}`}>
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
                {form.skills.length > 0 && <AddSkillInput onAdd={addSkill} />}
              </div>
            </div>

            {form.skills.length > 0 && (
              <div>
                <div className="font-mono-label mb-3">salary suggestion · based on JD</div>
                <div className="border hairline p-4 bg-app flex items-baseline gap-3">
                  <span className="font-editorial text-3xl text-brand">{fmtINR(form.salary_min)}</span>
                  <span className="text-white/40">→</span>
                  <span className="font-editorial text-3xl text-brand">{fmtINR(form.salary_max)}</span>
                  <span className="ml-auto text-[10px] font-mono text-white/40">per annum</span>
                </div>
              </div>
            )}

            {form.screening_questions.length > 0 && (
              <div>
                <div className="font-mono-label mb-3">screening questions</div>
                <div className="space-y-2">
                  {form.screening_questions.map((q, i) => (
                    <div key={i} className="flex gap-3 items-start border hairline p-3 bg-app text-sm">
                      <span className="font-mono text-brand text-[11px] mt-0.5">Q{i + 1}</span>
                      <span className="flex-1 text-white/80">{q}</span>
                      <button
                        onClick={() => setForm({ ...form, screening_questions: form.screening_questions.filter((_, j) => j !== i) })}
                        className="text-white/30 hover:text-danger"
                        data-testid={`js-remove-q-${i}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallField({ label, children }) {
  return (
    <div>
      <div className="font-mono-label mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function AddSkillInput({ onAdd }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-2 border border-dashed hairline p-2 pl-3">
      <Plus size={12} className="text-white/40" />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(v);
            setV("");
          }
        }}
        data-testid="js-add-skill-input"
        placeholder="Add a skill and press Enter"
        className="bg-transparent focus:outline-none text-xs flex-1 font-mono"
      />
    </div>
  );
}
