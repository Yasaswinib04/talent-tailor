import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR, errMessage } from "../lib/api";
import {
  Sparkles, X, Plus, ChevronLeft, Loader2, Check, ChevronDown, ChevronUp,
  Filter, Scale, Info, RotateCcw, GraduationCap, Briefcase, Clock, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SAMPLE_JD = `We're looking for a Senior Frontend Engineer to lead the UI architecture of our flagship consumer product. You'll work with React, TypeScript, and Next.js at scale, drive performance optimization, and shape our design systems used by millions of users in India.

Requirements:
- 5+ years of production React & TypeScript experience
- Deep understanding of web performance
- Experience building design systems
- Fintech / UPI / payments background is a plus`;

const EDUCATION_OPTIONS = [
  "No preference",
  "Bachelor's degree or equivalent",
  "Bachelor's in CS/Engineering",
  "Master's or higher",
  "Tier-1 institute (IIT/NIT/IIIT/BITS)",
];

const NOTICE_OPTIONS = [
  { value: 30, label: "Within 30 days" },
  { value: 60, label: "Within 60 days" },
  { value: 90, label: "Within 90 days" },
  { value: 180, label: "Flexible" },
];

const DEFAULT_WEIGHTS = { skills: 40, experience: 25, education: 15, notice: 10, cultural_fit: 10 };

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
    filters: {
      min_experience_years: 3,
      education_preference: "Bachelor's degree or equivalent",
      notice_period_max_days: 90,
      must_have_skills: [],
      preferred_companies: [],
      locations: ["Bengaluru"],
    },
    scoring_weights: DEFAULT_WEIGHTS,
  });
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [usingRecommended, setUsingRecommended] = useState({ filters: true, weights: true });
  const [recommendedSnapshot, setRecommendedSnapshot] = useState({ filters: null, weights: null });
  const [filterPreview, setFilterPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [extractError, setExtractError] = useState("");

  useEffect(() => {
    if (!form.jd || form.jd.length < 40) {
      setExtracted(false);
      return;
    }
    setExtracting(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.post("/extract-skills", { jd: form.jd });
        setExtractError("");
        setForm((f) => ({
          ...f,
          skills: res.data.skills,
          salary_min: res.data.salary_suggestion.min,
          salary_max: res.data.salary_suggestion.max,
          screening_questions: res.data.screening_questions,
          filters: usingRecommended.filters ? { ...f.filters, ...res.data.recommended_filters } : f.filters,
          scoring_weights: usingRecommended.weights ? res.data.recommended_weights : f.scoring_weights,
        }));
        setRecommendedSnapshot({
          filters: res.data.recommended_filters,
          weights: res.data.recommended_weights,
        });
        setExtracted(true);
      } catch (err) {
        setExtractError(errMessage(err, "Couldn't read that job description."));
      } finally {
        setExtracting(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [form.jd]); // eslint-disable-line

  // Live filter preview — debounced
  useEffect(() => {
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await api.post("/candidates/preview-filter", {
          filters: form.filters,
          skills: form.skills,
        });
        setFilterPreview(res.data);
      } catch {
        setFilterPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [form.filters, form.skills]);

  const setSkillWeight = (idx, w) =>
    setForm((f) => ({ ...f, skills: f.skills.map((s, i) => (i === idx ? { ...s, weight: w } : s)) }));
  const removeSkill = (idx) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((_, i) => i !== idx) }));
  const addSkill = (name) => {
    if (!name.trim()) return;
    setForm((f) => ({ ...f, skills: [...f.skills, { name: name.trim(), weight: 3 }] }));
  };

  const setFilter = (k, v) => {
    setUsingRecommended((u) => ({ ...u, filters: false }));
    setForm((f) => ({ ...f, filters: { ...f.filters, [k]: v } }));
  };

  const setWeight = (k, v) => {
    setUsingRecommended((u) => ({ ...u, weights: false }));
    setForm((f) => ({ ...f, scoring_weights: { ...f.scoring_weights, [k]: v } }));
  };

  const restoreRecommended = (section) => {
    if (section === "filters" && recommendedSnapshot.filters) {
      setForm((f) => ({ ...f, filters: { ...f.filters, ...recommendedSnapshot.filters } }));
      setUsingRecommended((u) => ({ ...u, filters: true }));
    }
    if (section === "weights" && recommendedSnapshot.weights) {
      setForm((f) => ({ ...f, scoring_weights: recommendedSnapshot.weights }));
      setUsingRecommended((u) => ({ ...u, weights: true }));
    }
  };

  const weightsTotal = Object.values(form.scoring_weights).reduce((a, b) => a + b, 0);

  const publish = async () => {
    if (!form.title.trim()) {
      setPublishError("Give the role a title before publishing.");
      return;
    }
    setSaving(true);
    setPublishError("");
    try {
      const res = await api.post("/jobs", form);
      nav(`/app/jobs/${res.data.id}`);
    } catch (err) {
      setPublishError(errMessage(err, "Couldn't publish this role. Your draft is still here."));
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
          {publishError && (
            <span className="text-[11px] text-danger border border-danger/50 bg-danger/10 px-3 py-1.5" data-testid="js-publish-error">
              {publishError}
            </span>
          )}
          <button onClick={() => nav("/app")} data-testid="js-cancel-btn" className="text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={publish}
            disabled={saving || !form.title}
            data-testid="js-publish-btn"
            className="bg-brand text-white px-5 py-2.5 text-sm hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 linear-glow"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Publish role
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid md:grid-cols-2 gap-0 min-h-[calc(100vh-8rem)]">
        {/* LEFT — JD & Basics + Advanced criteria */}
        <div className="p-8 border-r hairline space-y-8 pb-24">
          <div>
            <div className="font-mono-label mb-2">step 01 · role title</div>
            <input
              data-testid="js-title-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Senior Frontend Engineer"
              className="w-full bg-transparent text-3xl font-display font-medium border-b hairline focus:border-brand pb-3 outline-none placeholder:text-white/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <SmallField label="Department">
              <select
                data-testid="js-dept-select"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:border-brand outline-none"
              >
                {["Engineering", "Product", "Design", "Growth", "Ops", "Finance"].map((x) => <option key={x} className="bg-app">{x}</option>)}
              </select>
            </SmallField>
            <SmallField label="Location">
              <input
                data-testid="js-loc-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:border-brand outline-none"
              />
            </SmallField>
            <SmallField label="Seniority">
              <select
                data-testid="js-seniority-select"
                value={form.seniority}
                onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:border-brand outline-none"
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
              placeholder="Paste or write the job description. Skills, salary, filters and scoring weights will appear on the right as you type."
              className="w-full bg-transparent border hairline p-4 focus:border-brand outline-none min-h-[280px] text-sm leading-relaxed transition-colors"
            />
            <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40">
              <Sparkles size={10} className="text-brand" />
              <span>Everything on the right runs the moment you pause. No buttons to press.</span>
            </div>
          </div>

          {/* Advanced Criteria — Progressive disclosure */}
          <div className="space-y-4 pt-2">
            {/* Mandatory Filters section */}
            <CollapsibleSection
              open={showCriteria}
              onToggle={() => setShowCriteria((v) => !v)}
              step="step 03 · optional"
              title="Mandatory criteria & filters"
              subtitle={
                filterPreview
                  ? `${filterPreview.passing} of ${filterPreview.total} candidates in your pool would pass these.`
                  : "Any candidate below these bars is auto-filtered out."
              }
              icon={<Filter size={14} />}
              testid="js-criteria-toggle"
              badge={usingRecommended.filters && extracted ? "recommended · applied" : null}
              onRestore={extracted ? () => restoreRecommended("filters") : null}
            >
              <div className="grid grid-cols-2 gap-4">
                <SmallField label={<span className="inline-flex items-center gap-1.5"><Briefcase size={11} /> Min experience</span>}>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      data-testid="js-filter-minexp"
                      value={form.filters.min_experience_years}
                      onChange={(e) => setFilter("min_experience_years", Number(e.target.value))}
                      className="w-20 bg-transparent border hairline px-2 py-2 text-sm focus:border-brand outline-none"
                      min={0}
                    />
                    <span className="text-white/50 text-xs">years</span>
                  </div>
                </SmallField>
                <SmallField label={<span className="inline-flex items-center gap-1.5"><GraduationCap size={11} /> Education</span>}>
                  <select
                    data-testid="js-filter-education"
                    value={form.filters.education_preference}
                    onChange={(e) => setFilter("education_preference", e.target.value)}
                    className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:border-brand outline-none"
                  >
                    {EDUCATION_OPTIONS.map((x) => <option key={x} className="bg-app">{x}</option>)}
                  </select>
                </SmallField>
                <SmallField label={<span className="inline-flex items-center gap-1.5"><Clock size={11} /> Notice period</span>}>
                  <select
                    data-testid="js-filter-notice"
                    value={form.filters.notice_period_max_days}
                    onChange={(e) => setFilter("notice_period_max_days", Number(e.target.value))}
                    className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:border-brand outline-none"
                  >
                    {NOTICE_OPTIONS.map((x) => <option key={x.value} value={x.value} className="bg-app">{x.label}</option>)}
                  </select>
                </SmallField>
                <SmallField label={<span className="inline-flex items-center gap-1.5"><MapPin size={11} /> Accepted locations</span>}>
                  <TagInput
                    values={form.filters.locations}
                    onChange={(v) => setFilter("locations", v)}
                    placeholder="Add a city"
                    testid="js-filter-locations"
                  />
                </SmallField>
                <div className="col-span-2">
                  <SmallField label={<span className="inline-flex items-center gap-1.5">Must-have skills · <span className="text-white/40 lowercase">(strict filter)</span></span>}>
                    <TagInput
                      values={form.filters.must_have_skills}
                      onChange={(v) => setFilter("must_have_skills", v)}
                      placeholder="Type a skill and press Enter"
                      testid="js-filter-must-have"
                    />
                  </SmallField>
                </div>
                <div className="col-span-2">
                  <SmallField label="Preferred previous companies (soft boost)">
                    <TagInput
                      values={form.filters.preferred_companies}
                      onChange={(v) => setFilter("preferred_companies", v)}
                      placeholder="e.g. Razorpay, Swiggy, Flipkart"
                      testid="js-filter-companies"
                    />
                  </SmallField>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2 text-[11px] text-white/40 bg-brand/5 border border-brand/20 px-3 py-2">
                <Info size={11} className="text-brand mt-0.5 shrink-0" />
                <span>These are <em className="text-brand not-italic">optional</em>. Skip if you want to review everyone yourself.</span>
              </div>
              {filterPreview && (
                <div className="mt-3 border hairline p-3 bg-app/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono-label">impact on current pool</div>
                    <div className="text-[11px] font-mono">
                      <span className="text-white/60">{filterPreview.total}</span>
                      <span className="text-white/30 mx-1">→</span>
                      <span className={filterPreview.passing === 0 ? "text-amber-400" : "text-brand"}>
                        {filterPreview.passing} pass
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {[
                      { key: "failed_experience", label: "Fail experience minimum" },
                      { key: "failed_education", label: "Fail education preference" },
                      { key: "failed_notice", label: "Fail notice period" },
                      { key: "failed_must_have", label: "Missing a must-have skill" },
                      { key: "failed_location", label: "Wrong location" },
                    ].filter((r) => filterPreview.breakdown[r.key] > 0).map((r) => (
                      <div key={r.key} className="flex items-center justify-between text-white/60">
                        <span>{r.label}</span>
                        <span className="font-mono text-white/80">−{filterPreview.breakdown[r.key]}</span>
                      </div>
                    ))}
                    {Object.values(filterPreview.breakdown).every((v) => v === 0) && (
                      <div className="text-white/40 italic">Every candidate in your pool passes.</div>
                    )}
                  </div>
                  {filterPreview.unknown &&
                    Object.values(filterPreview.unknown).some((v) => v > 0) && (
                      <div className="mt-3 pt-3 border-t hairline space-y-1 text-[11px]" data-testid="js-unknown-breakdown">
                        <div className="text-white/40 mb-1.5">
                          Passing on missing data — we don't reject a candidate because their
                          resume didn't say:
                        </div>
                        {[
                          { key: "unknown_education", label: "Education not stated" },
                          { key: "unknown_notice", label: "Notice period not stated" },
                          { key: "unknown_location", label: "Location not stated" },
                        ]
                          .filter((r) => filterPreview.unknown[r.key] > 0)
                          .map((r) => (
                            <div key={r.key} className="flex items-center justify-between text-white/50">
                              <span>{r.label}</span>
                              <span className="font-mono text-white/70">{filterPreview.unknown[r.key]}</span>
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              )}
            </CollapsibleSection>

            {/* Scoring Weights section */}
            <CollapsibleSection
              open={showWeights}
              onToggle={() => setShowWeights((v) => !v)}
              step="step 04 · optional"
              title="Scoring weights"
              subtitle="How the match score is calculated. Totals should be 100%."
              icon={<Scale size={14} />}
              testid="js-weights-toggle"
              badge={usingRecommended.weights && extracted ? "recommended · applied" : (weightsTotal !== 100 ? `${weightsTotal}% — adjust` : null)}
              badgeTone={weightsTotal !== 100 ? "warn" : "brand"}
              onRestore={extracted ? () => restoreRecommended("weights") : null}
            >
              <div className="space-y-3">
                {[
                  { key: "skills", label: "Skills match", hint: "How well their skills overlap with what you extracted." },
                  { key: "experience", label: "Years of experience", hint: "Compared to your minimum experience filter." },
                  { key: "education", label: "Education fit", hint: "Compared to your education preference." },
                  { key: "notice", label: "Notice period", hint: "Faster joiners score higher." },
                  { key: "cultural_fit", label: "Cultural / signal", hint: "Preferred companies, gap tolerance, etc." },
                ].map((row) => (
                  <div key={row.key} className="flex items-center gap-3">
                    <div className="w-40 shrink-0">
                      <div className="text-xs">{row.label}</div>
                      <div className="text-[10px] text-white/40">{row.hint}</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      value={form.scoring_weights[row.key]}
                      onChange={(e) => setWeight(row.key, Number(e.target.value))}
                      data-testid={`js-weight-${row.key}`}
                      className="flex-1 accent-brand"
                    />
                    <div className="w-14 text-right font-mono text-sm">{form.scoring_weights[row.key]}%</div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t hairline pt-3 mt-3">
                  <span className="text-xs text-white/50">Total</span>
                  <span className={`font-mono text-sm ${weightsTotal === 100 ? "text-brand" : "text-amber-400"}`}>
                    {weightsTotal}% {weightsTotal !== 100 && `(should be 100%)`}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2 text-[11px] text-white/40 bg-brand/5 border border-brand/20 px-3 py-2">
                <Info size={11} className="text-brand mt-0.5 shrink-0" />
                <span>System recommends weights based on the seniority in your JD. Edit only what matters to you.</span>
              </div>
            </CollapsibleSection>
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
                {extractError && !extracting && (
                  <span className="text-[10px] font-mono text-danger" data-testid="js-extract-error">
                    {extractError}
                  </span>
                )}
                {extracted && !extracting && !extractError && (
                  <span className="text-[10px] font-mono text-success inline-flex items-center gap-1">
                    <Check size={10} /> ready
                  </span>
                )}
              </div>
              <h3 className="font-display text-xl font-medium mb-4">Skills detected</h3>
              {form.skills.length === 0 && (
                <div className="border border-dashed hairline p-8 text-center text-white/40 text-sm">
                  Paste a job description to see skills, salary, filters and scoring weights appear here — live.
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
                    <button onClick={() => removeSkill(idx)} className="text-white/30 hover:text-red-400 p-1" data-testid={`js-remove-skill-${idx}`}>
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
                  <span className="font-display text-2xl font-semibold text-brand">{fmtINR(form.salary_min)}</span>
                  <span className="text-white/40">→</span>
                  <span className="font-display text-2xl font-semibold text-brand">{fmtINR(form.salary_max)}</span>
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
                        className="text-white/30 hover:text-red-400"
                        data-testid={`js-remove-q-${i}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter/weight preview stub */}
            {extracted && (
              <div className="border-t hairline pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono-label">what this role will filter for</div>
                  {filterPreview && (
                    <div className="text-[10px] font-mono flex items-center gap-1.5">
                      <span className={previewing ? "text-white/30" : "text-white/60"}>
                        {filterPreview.total} candidates →
                      </span>
                      <span className={`px-1.5 py-0.5 border ${
                        filterPreview.passing === 0
                          ? "text-amber-400 border-amber-400/40 bg-amber-400/5"
                          : filterPreview.passing < 5
                          ? "text-amber-300 border-amber-300/40 bg-amber-300/5"
                          : "text-brand border-brand/40 bg-brand/10"
                      }`}>
                        {filterPreview.passing} will pass
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                  <Chip>≥ {form.filters.min_experience_years}y exp</Chip>
                  <Chip>{form.filters.education_preference}</Chip>
                  <Chip>≤ {form.filters.notice_period_max_days}d notice</Chip>
                  {form.filters.locations.map((l) => <Chip key={l}>📍 {l}</Chip>)}
                  {form.filters.must_have_skills.slice(0, 3).map((s) => <Chip key={s} strong>{s}</Chip>)}
                </div>
                {filterPreview && filterPreview.passing === 0 && (
                  <div className="mt-3 text-[11px] text-amber-400/80 border border-amber-400/30 bg-amber-400/5 px-3 py-2 flex items-start gap-2">
                    <Info size={11} className="mt-0.5 shrink-0" />
                    <span>No candidates in your current pool pass these filters. Try relaxing must-have skills or education.</span>
                  </div>
                )}
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

function CollapsibleSection({ open, onToggle, step, title, subtitle, icon, badge, badgeTone = "brand", onRestore, testid, children }) {
  return (
    <div className="border hairline bg-surface/40">
      <button
        onClick={onToggle}
        data-testid={testid}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-brand">{icon}</span>
          <div>
            <div className="font-mono-label mb-1">{step}</div>
            <div className="font-display text-base font-medium">{title}</div>
            <div className="text-[11px] text-white/50 mt-0.5">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge && (
            <span
              className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border ${
                badgeTone === "warn"
                  ? "text-amber-400 border-amber-400/40 bg-amber-400/5"
                  : "text-brand border-brand/40 bg-brand/5"
              }`}
            >
              {badge}
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-white/50" /> : <ChevronDown size={14} className="text-white/50" />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t hairline">
              {onRestore && (
                <div className="flex justify-end mb-3">
                  <button
                    onClick={onRestore}
                    data-testid={`${testid}-restore`}
                    className="text-[10px] font-mono text-white/40 hover:text-brand inline-flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={10} /> restore recommended
                  </button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

function TagInput({ values, onChange, placeholder, testid }) {
  const [v, setV] = useState("");
  return (
    <div className="border hairline bg-transparent p-2 flex flex-wrap gap-1.5 min-h-[40px] focus-within:border-brand transition-colors">
      {values.map((t, i) => (
        <span key={t + i} className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-brand/10 border border-brand/30 text-brand px-2 py-0.5">
          {t}
          <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="hover:text-white">
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            e.preventDefault();
            onChange([...values, v.trim()]);
            setV("");
          } else if (e.key === "Backspace" && !v && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        placeholder={values.length === 0 ? placeholder : ""}
        data-testid={testid}
        className="bg-transparent focus:outline-none text-xs flex-1 min-w-[100px]"
      />
    </div>
  );
}

function Chip({ children, strong }) {
  return (
    <span className={`px-2 py-1 border ${strong ? "border-brand/50 bg-brand/10 text-brand" : "border-white/15 bg-white/[0.02] text-white/70"}`}>
      {children}
    </span>
  );
}
