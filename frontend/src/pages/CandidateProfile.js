import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, fmtINR, cx } from "../lib/api";
import { ChevronLeft, Mail, Phone, MapPin, Briefcase, Calendar, Star, Check, X, Plus, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const STAGES = ["New", "Shortlisted", "Interview", "Offer", "Rejected"];

export default function CandidateProfile() {
  const { cid } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState("resume");
  const [note, setNote] = useState("");
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const load = async () => {
    const [cr, jr] = await Promise.all([api.get(`/candidates/${cid}`), api.get("/jobs")]);
    setC(cr.data);
    setJobs(jr.data);
    setNote(cr.data.notes || "");
  };

  useEffect(() => {
    load();
  }, [cid]);

  if (!c) return <div className="p-8 text-white/65">Loading…</div>;

  const toggleRole = async (roleId) => {
    const newIds = c.role_ids.includes(roleId) ? c.role_ids.filter((r) => r !== roleId) : [...c.role_ids, roleId];
    await api.post(`/candidates/${cid}/assign-roles`, { role_ids: newIds });
    load();
  };

  const setStage = async (stage) => {
    await api.post(`/candidates/${cid}/stage`, { stage });
    load();
  };

  const saveNote = async () => {
    await api.patch(`/candidates/${cid}`, { notes: note });
    load();
  };

  const setRating = async (rating) => {
    await api.patch(`/candidates/${cid}`, { rating });
    load();
  };

  const assignedJobs = jobs.filter((j) => c.role_ids.includes(j.id));

  return (
    <div className="max-w-[1200px] mx-auto p-8">
      <button onClick={() => nav("/app")} data-testid="cp-back-btn" className="text-white/72 hover:text-white text-sm inline-flex items-center gap-1 mb-6 transition-colors">
        <ChevronLeft size={14} /> back
      </button>

      <div className="grid md:grid-cols-3 gap-8">
        {/* LEFT: Identity */}
        <div className="md:col-span-1 space-y-6">
          <div className="border hairline overflow-hidden bg-surface">
            {/* Airbnb-style large portrait treatment */}
            <div className="relative h-40 bg-gradient-to-br from-brand/40 via-brand/20 to-transparent">
              <img
                src={c.avatar}
                alt=""
                className="w-28 h-28 rounded-full object-cover absolute -bottom-14 left-6 border-4 border-surface shadow-2xl"
              />
            </div>
            <div className="pt-16 px-6 pb-6">
              <div className="font-mono-label mb-1">{c.current_title}</div>
              <h1 className="font-display text-3xl font-bold tracking-tight mb-1">{c.name}</h1>
              <div className="text-white/72 text-sm mb-6">at {c.current_company}</div>

              <div className="space-y-2 text-xs">
                <Row icon={<Mail size={12} />} label={c.email} />
                <Row icon={<Phone size={12} />} label={c.phone} />
                <Row icon={<MapPin size={12} />} label={c.location} />
                <Row icon={<Briefcase size={12} />} label={`${c.experience_years} years experience`} />
                <Row icon={<Calendar size={12} />} label={`Notice: ${c.notice_period}`} />
                <Row icon={<GraduationCap size={12} />} label={c.education} />
              </div>

              <div className="mt-6 pt-6 border-t hairline">
                <div className="font-mono-label mb-2">expected ctc</div>
                <div className="font-display text-3xl font-semibold text-brand">{fmtINR(c.expected_ctc)}</div>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="border hairline p-6 bg-surface">
            <div className="font-mono-label mb-3">your rating</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  data-testid={`cp-rating-${n}`}
                  className={cx(
                    "w-9 h-9 border transition-all",
                    n <= c.rating ? "bg-brand border-brand text-black" : "border-white/20 text-white/65 hover:border-white/50"
                  )}
                >
                  <Star size={14} className="mx-auto" fill={n <= c.rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Match + Stage + Multi-role */}
          <div className="border hairline p-6 bg-surface">
            <div className="grid grid-cols-2 gap-6 items-center pb-6 mb-6 border-b hairline">
              <div>
                <div className="font-mono-label mb-2">
                  match score
                  {c.scored_against?.title ? ` · vs ${c.scored_against.title}` : ""}
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={cx("font-display text-6xl font-bold tracking-tight", c.match_score >= 90 ? "text-brand" : "text-white")}>
                    {c.match_score}
                  </span>
                  <span className="text-white/65 text-sm">/ 100</span>
                </div>
                {!c.score_evidence && (
                  <div className="text-xs text-white/60 mt-2">
                    Assign a role below to see how this is calculated.
                  </div>
                )}
              </div>
              <div>
                <div className="font-mono-label mb-2">stage</div>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStage(s)}
                      data-testid={`cp-stage-${s}`}
                      className={cx(
                        "text-[10px] font-mono uppercase tracking-widest px-2 py-1 border transition-all",
                        c.stage === s
                          ? "bg-brand text-black border-brand"
                          : "border-white/15 text-white/72 hover:border-white/60 hover:text-white"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* The score's reasoning, always visible — this is the number the
                recruiter has to defend to a hiring manager. */}
            {c.score_evidence?.length > 0 && (
              <div className="pb-6 mb-6 border-b hairline" data-testid="cp-score-evidence">
                <div className="font-mono-label mb-3">how this was calculated</div>
                <div className="space-y-2">
                  {c.score_evidence.map((e) => (
                    <div
                      key={e.key}
                      data-testid={`cp-evidence-${e.key}`}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span
                        className={cx(
                          "font-mono text-xs px-1.5 py-0.5 border shrink-0 w-10 text-center",
                          e.tone === "pass"
                            ? "text-success border-success/40"
                            : e.tone === "warn"
                            ? "text-gold border-gold/40"
                            : "text-white/60 border-white/15"
                        )}
                      >
                        {e.value}
                      </span>
                      <div className="min-w-0">
                        <span className="text-white/85">{e.label}</span>
                        <span className="font-mono text-[10px] text-white/50 ml-2">{e.weight}% weight</span>
                        <div className="text-xs text-white/70 leading-relaxed mt-0.5">{e.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-role assignment */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-mono-label">assigned to roles</div>
                  <div className="text-xs text-white/65 mt-1">One profile, many roles. No duplication.</div>
                </div>
                <button
                  onClick={() => setShowRoleMenu((v) => !v)}
                  data-testid="cp-add-role-btn"
                  className="border hairline hover:border-brand hover:text-brand text-xs px-3 py-1.5 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={12} /> Manage roles
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {assignedJobs.length === 0 && (
                  <span className="text-xs text-white/65 italic">Not assigned to any role yet.</span>
                )}
                {assignedJobs.map((j) => (
                  <motion.span
                    key={j.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 border-l-2 border-brand bg-white/5 px-3 py-1.5 text-xs font-display"
                    data-testid={`cp-role-chip-${j.id}`}
                  >
                    {j.title}
                    <button onClick={() => toggleRole(j.id)} className="text-white/65 hover:text-danger">
                      <X size={10} />
                    </button>
                  </motion.span>
                ))}
              </div>

              {showRoleMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 border hairline p-3 bg-app"
                >
                  <div className="font-mono-label mb-2">select roles</div>
                  <div className="space-y-1 max-h-64 overflow-auto">
                    {jobs.map((j) => {
                      const active = c.role_ids.includes(j.id);
                      return (
                        <button
                          key={j.id}
                          onClick={() => toggleRole(j.id)}
                          data-testid={`cp-role-toggle-${j.id}`}
                          className={cx(
                            "w-full flex items-center gap-3 text-left px-3 py-2 text-sm border hairline transition-colors",
                            active ? "border-brand bg-brand/10" : "hover:border-white/40"
                          )}
                        >
                          <span className={cx("w-4 h-4 border flex items-center justify-center", active ? "bg-brand border-brand" : "border-white/30")}>
                            {active && <Check size={10} className="text-black" />}
                          </span>
                          <span className="flex-1">
                            <span className="font-medium">{j.title}</span>
                            <span className="text-white/65 text-xs ml-2">{j.department} · {j.location}</span>
                          </span>
                          <span className="font-mono text-[10px] text-brand">{fmtINR(j.salary_min).replace("₹", "")}+</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border hairline bg-surface">
            <div className="flex border-b hairline">
              {[
                { id: "resume", label: "Resume" },
                { id: "skills", label: "Skills" },
                { id: "notes", label: "Notes" },
                { id: "activity", label: "Activity" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  data-testid={`cp-tab-${t.id}`}
                  className={cx(
                    "px-5 py-3 text-xs font-mono uppercase tracking-widest transition-colors border-b-2",
                    tab === t.id ? "border-brand text-white" : "border-transparent text-white/65 hover:text-white/70"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === "resume" && (
                <div className="text-sm text-white/70 leading-relaxed whitespace-pre-line" data-testid="cp-resume-body">
                  {c.resume_summary}
                </div>
              )}
              {tab === "skills" && (
                <div className="flex flex-wrap gap-2">
                  {c.skills.map((s) => (
                    <span key={s} className="text-xs font-mono border hairline px-3 py-1.5 bg-app">{s}</span>
                  ))}
                </div>
              )}
              {tab === "notes" && (
                <div>
                  <textarea
                    data-testid="cp-notes-textarea"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={saveNote}
                    placeholder="Interview notes, follow-ups, red flags…"
                    className="w-full bg-transparent border hairline p-3 min-h-[180px] text-sm focus:border-white outline-none"
                  />
                  <div className="mt-2 text-[10px] text-white/65">Auto-saves on blur.</div>
                </div>
              )}
              {tab === "activity" && (
                <div className="space-y-3 text-sm">
                  <ActivityItem when="Just now" text={`Assigned to ${assignedJobs.length} role(s).`} />
                  <ActivityItem when="Yesterday" text={`Stage moved to ${c.stage}.`} />
                  <ActivityItem when="3 days ago" text={c.auto_applied ? "Auto-applied via shareable link." : "Added to pipeline by recruiter."} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label }) {
  return (
    <div className="flex items-center gap-2 text-white/70">
      <span className="text-white/65 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function ActivityItem({ when, text }) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-brand/40 pl-3 py-1">
      <div>
        <div className="font-mono-label mb-0.5">{when}</div>
        <div className="text-white/80">{text}</div>
      </div>
    </div>
  );
}
