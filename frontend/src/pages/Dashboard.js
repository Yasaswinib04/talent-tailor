import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, fmtINR, cx } from "../lib/api";
import { Plus, Briefcase, Users, TrendingUp, Search, Share2, ChevronRight, Zap, Star, X, Check, Lock, Sparkles } from "lucide-react";

const STAGES = ["New", "Shortlisted", "Interview", "Offer", "Rejected"];

export default function Dashboard() {
  const [params] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [q, setQ] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [cursor, setCursor] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [sampleBusy, setSampleBusy] = useState(false);
  const nav = useNavigate();

  const loadSample = async () => {
    setSampleBusy(true);
    try {
      await api.post("/sample-data");
      await load();
    } finally {
      setSampleBusy(false);
    }
  };

  const load = async () => {
    try {
      const [j, c, s] = await Promise.all([
        api.get("/jobs"),
        api.get("/candidates"),
        api.get("/analytics/summary"),
      ]);
      setJobs(j.data);
      setCandidates(c.data);
      setSummary(s.data);
      setLoadError(null);
    } catch (e) {
      // Distinguish "the server is unreachable" from "your filters matched nobody" —
      // showing an empty table for a network failure misleads the recruiter.
      setLoadError(
        e?.response
          ? `The server returned an error (${e.response.status}).`
          : "Can't reach the server. Check that the backend is running."
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (filterStage && c.stage !== filterStage) return false;
      if (filterJob && !c.role_ids.includes(filterJob)) return false;
      if (q) {
        const ql = q.toLowerCase();
        if (
          !c.name.toLowerCase().includes(ql) &&
          !c.current_company.toLowerCase().includes(ql) &&
          !c.skills.some((s) => s.toLowerCase().includes(ql))
        )
          return false;
      }
      return true;
    });
  }, [candidates, filterStage, filterJob, q]);

  // keyboard nav
  useEffect(() => {
    const h = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((v) => Math.min(filtered.length - 1, v + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((v) => Math.max(0, v - 1));
      } else if (e.key === "Enter" && filtered[cursor]) {
        nav(`/app/candidates/${filtered[cursor].id}`);
      } else if (e.key === "n") {
        nav("/app/jobs/new");
      } else if (e.key === "x") {
        // toggle select
        const c = filtered[cursor];
        if (c) {
          setSelected((prev) => {
            const s = new Set(prev);
            s.has(c.id) ? s.delete(c.id) : s.add(c.id);
            return s;
          });
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cursor, filtered, nav]);

  const bulkStage = async (stage) => {
    await Promise.all([...selected].map((id) => api.post(`/candidates/${id}/stage`, { stage })));
    setSelected(new Set());
    load();
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="font-mono-label mb-2">overview · jan 2026</div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Talent pipeline</h1>
        </div>
        <button
          onClick={() => nav("/app/jobs/new")}
          data-testid="dash-new-role-btn"
          className="btn btn-primary"
        >
          <Plus size={14} /> New role
        </button>
      </div>

      {loadError && (
        <div
          data-testid="dash-load-error"
          className="border border-red-500/40 bg-red-500/5 px-5 py-4 mb-8 flex items-start gap-3"
        >
          <X size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm mb-1">Couldn't load your pipeline</div>
            <div className="text-sm text-white/72">{loadError}</div>
          </div>
          <button
            onClick={load}
            className="ml-auto text-sm border hairline px-3 py-1.5 hover:bg-white/5 transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI band */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 border hairline mb-8">
          <Kpi label="open roles" value={summary.total_jobs} icon={<Briefcase size={14} />} testid="kpi-jobs" />
          <Kpi label="candidates" value={summary.total_candidates} icon={<Users size={14} />} testid="kpi-candidates" />
          <Kpi label="shortlisted" value={summary.funnel.Shortlisted} icon={<Star size={14} />} testid="kpi-shortlisted" />
          <Kpi label="interviewing" value={summary.funnel.Interview} icon={<TrendingUp size={14} />} testid="kpi-interview" />
          <Kpi label="auto-apply rate" value={`${Math.round(summary.auto_apply_conversion * 100)}%`} icon={<Zap size={14} />} testid="kpi-autoapply" gold />
        </div>
      )}

      {/* Roles grid */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Open roles</h2>
          <div className="font-mono-label">{jobs.length} active</div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {jobs.map((j) => (
            <div
              key={j.id}
              onClick={() => nav(`/app/jobs/${j.id}`)}
              data-testid={`role-card-${j.id}`}
              className="border hairline p-5 bg-surface hover:border-brand/40 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="font-mono-label">{j.department}</div>
                <ChevronRight size={14} className="text-white/55 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-lg font-medium mb-1 leading-snug">{j.title}</div>
              <div className="text-xs text-white/72 mb-4">{j.location} · {j.seniority}</div>
              <div className="flex items-center justify-between text-xs pt-3 border-t hairline">
                <span className="text-white/72">{j.candidates_count} candidates</span>
                <span className="font-mono text-brand">{fmtINR(j.salary_min)}–{fmtINR(j.salary_max)}</span>
              </div>
            </div>
          ))}
          {jobs.length < 4 && (
            <button
              onClick={() => nav("/app/jobs/new")}
              data-testid="empty-new-role-btn"
              className="border border-dashed hairline p-5 hover:border-brand/40 hover:bg-brand/5 transition-all flex flex-col items-center justify-center min-h-[168px]"
            >
              <Plus size={20} className="text-white/65 mb-2" />
              <div className="text-sm text-white/78">Create a new role</div>
              <div className="font-mono-label mt-2">press N</div>
            </button>
          )}
          {jobs.length === 0 && !loadError && (
            <button
              onClick={loadSample}
              disabled={sampleBusy}
              data-testid="load-sample-btn"
              className="border border-dashed border-brand/40 bg-brand/5 p-5 hover:bg-brand/10 transition-all flex flex-col items-center justify-center min-h-[168px] disabled:opacity-50"
            >
              <Sparkles size={20} className="text-brand mb-2" />
              <div className="text-sm text-white/78">{sampleBusy ? "Loading…" : "Explore with sample data"}</div>
              <div className="font-mono-label mt-2">4 roles · 20 candidates</div>
            </button>
          )}
        </div>
      </div>

      {/* Candidate table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold">All candidates</h2>
            {(q || filterStage || filterJob) && (
              <span className="text-[10px] font-mono flex items-center gap-1.5">
                <span className="text-white/78">{candidates.length} candidates</span>
                <span className="text-white/55">→</span>
                <span className={cx(
                  "px-1.5 py-0.5 border",
                  filtered.length === 0
                    ? "text-amber-400 border-amber-400/40 bg-amber-400/5"
                    : filtered.length < 5
                    ? "text-amber-300 border-amber-300/40 bg-amber-300/5"
                    : "text-brand border-brand/40 bg-brand/10"
                )}
                data-testid="dash-filter-pill"
                >
                  {filtered.length} matching
                </span>
                <button
                  onClick={() => { setQ(""); setFilterStage(""); setFilterJob(""); }}
                  data-testid="dash-clear-filters"
                  className="text-white/65 hover:text-white transition-colors ml-1"
                >
                  clear
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border hairline px-3 py-2">
              <Search size={12} className="text-white/65" />
              <input
                data-testid="candidates-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, company, skill…"
                className="bg-transparent focus:outline-none text-xs w-56"
              />
            </div>
            <select
              data-testid="candidates-stage-filter"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="bg-transparent border hairline px-3 py-2 text-xs focus:border-white outline-none"
            >
              <option value="" className="bg-app">All stages</option>
              {STAGES.map((s) => <option key={s} value={s} className="bg-app">{s}</option>)}
            </select>
            <select
              data-testid="candidates-role-filter"
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="bg-transparent border hairline px-3 py-2 text-xs focus:border-white outline-none max-w-[160px]"
            >
              <option value="" className="bg-app">All roles</option>
              {jobs.map((j) => <option key={j.id} value={j.id} className="bg-app">{j.title}</option>)}
            </select>
          </div>
        </div>

        <div className="border hairline overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b hairline bg-surface/60">
                <th className="w-8 py-3 px-3"></th>
                <th className="py-3 px-3 font-mono-label">candidate</th>
                <th className="py-3 px-3 font-mono-label">current</th>
                <th className="py-3 px-3 font-mono-label">exp</th>
                <th className="py-3 px-3 font-mono-label">ctc</th>
                <th className="py-3 px-3 font-mono-label">roles</th>
                <th className="py-3 px-3 font-mono-label">stage</th>
                <th className="py-3 px-3 font-mono-label text-right">match</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => nav(`/app/candidates/${c.id}`)}
                  data-testid={`cand-row-${c.id}`}
                  className={cx(
                    "border-b hairline/50 group cursor-pointer transition-colors",
                    i === cursor ? "bg-brand/5 border-l-2 border-l-brand" : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                  )}
                >
                  <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={(e) => {
                        const s = new Set(selected);
                        e.target.checked ? s.add(c.id) : s.delete(c.id);
                        setSelected(s);
                      }}
                      data-testid={`cand-check-${c.id}`}
                      className="accent-brand"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      {c.locked ? (
                        <div className="w-8 h-8 rounded-full bg-white/5 border hairline flex items-center justify-center shrink-0">
                          <Lock size={12} className="text-white/40" />
                        </div>
                      ) : (
                        <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                      )}
                      <div>
                        <div data-private className={cx("font-medium", c.locked && "text-white/50")}>{c.name}</div>
                        <div className="text-[11px] text-white/65">{c.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-white/80">{c.current_title}</div>
                    <div className="text-[11px] text-white/65">{c.current_company}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs">{c.experience_years}y</td>
                  <td className="py-3 px-3 font-mono text-xs">{fmtINR(c.expected_ctc)}</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {c.role_ids.slice(0, 2).map((rid) => {
                        const j = jobs.find((jj) => jj.id === rid);
                        return j ? (
                          <span key={rid} className="text-[10px] font-mono border-l-2 border-brand bg-white/5 px-2 py-0.5">
                            {j.title.split(" ").slice(0, 2).join(" ")}
                          </span>
                        ) : null;
                      })}
                      {c.role_ids.length > 2 && (
                        <span className="text-[10px] font-mono text-white/72">+{c.role_ids.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <StageBadge stage={c.stage} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <MatchScore score={c.match_score} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="py-16 text-center text-white/65 text-sm">
                  {loadError ? "Couldn't load candidates — see the error above." : "No candidates match these filters."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Keyboard hint */}
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-white/65">
          <span><span className="kbd">J</span> <span className="kbd">K</span> row nav</span>
          <span><span className="kbd">↵</span> open profile</span>
          <span><span className="kbd">X</span> select</span>
          <span><span className="kbd">N</span> new role</span>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 border border-brand/40 bg-surface shadow-[0_10px_40px_-10px_rgba(178,138,93,0.6)] flex items-center gap-2 px-3 py-2">
          <div className="font-mono text-xs text-brand pr-3 border-r hairline">{selected.size} selected</div>
          <BulkBtn label="Shortlist" onClick={() => bulkStage("Shortlisted")} testid="bulk-shortlist" />
          <BulkBtn label="Interview" onClick={() => bulkStage("Interview")} testid="bulk-interview" />
          <BulkBtn label="Reject" onClick={() => bulkStage("Rejected")} testid="bulk-reject" danger />
          <button onClick={() => setSelected(new Set())} className="text-white/65 hover:text-white p-1 ml-1" data-testid="bulk-clear">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, testid, gold }) {
  return (
    <div className="p-5 border-r hairline last:border-r-0" data-testid={testid}>
      <div className="flex items-center gap-2 mb-2">
        <span className={gold ? "text-brand" : "text-white/65"}>{icon}</span>
        <span className="font-mono-label">{label}</span>
      </div>
      <div className={cx("font-display text-3xl font-bold tabular-nums tracking-tight", gold && "text-brand")}>{value}</div>
    </div>
  );
}

function StageBadge({ stage }) {
  const map = {
    New: "text-white/78 border-white/20",
    Shortlisted: "text-brand border-brand/40",
    Interview: "text-gold border-gold/40",
    Offer: "text-success border-success/40",
    Rejected: "text-white/55 border-white/10 line-through",
  };
  return (
    <span className={cx("text-[10px] font-mono uppercase tracking-widest px-2 py-1 border", map[stage] || map.New)}>
      {stage}
    </span>
  );
}

function MatchScore({ score }) {
  const color = score >= 90 ? "text-brand" : score >= 75 ? "text-white" : "text-white/72";
  return (
    <div className="inline-flex items-center gap-2">
      <div className="w-16 h-1 bg-white/10 relative overflow-hidden">
        <div
          className={cx("h-full", score >= 90 ? "bg-brand" : score >= 75 ? "bg-white" : "bg-white/40")}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cx("font-display text-lg font-semibold tabular-nums", color)}>{score}</span>
    </div>
  );
}

function BulkBtn({ label, onClick, testid, danger }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={cx(
        "text-xs px-3 py-1.5 border hairline hover:bg-white hover:text-black transition-colors inline-flex items-center gap-1.5",
        danger && "hover:bg-danger hover:border-danger"
      )}
    >
      <Check size={12} /> {label}
    </button>
  );
}
