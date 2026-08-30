import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, fmtINR, cx, errMessage } from "../lib/api";
import { Plus, Briefcase, Users, TrendingUp, Search, Share2, ChevronRight, Zap, Star, X, Check } from "lucide-react";
import Avatar from "../components/Avatar";
import ErrorState from "../components/ErrorState";

const STAGES = ["New", "Shortlisted", "Interview", "Offer", "Rejected"];

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const urlQuery = params.get("q") || "";
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [q, setQ] = useState(urlQuery);
  const [filterStage, setFilterStage] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [j, c, s] = await Promise.all([
        api.get("/jobs"),
        api.get("/candidates?limit=500"),
        api.get("/analytics/summary"),
      ]);
      setJobs(j.data);
      setCandidates(c.data.items || []);
      setTotalCandidates(c.data.total ?? (c.data.items || []).length);
      setSummary(s.data);
      setError("");
    } catch (err) {
      setError(errMessage(err, "Couldn't load your pipeline."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // The top-bar search writes ?q=; keep the table in step with it.
  useEffect(() => {
    setQ(urlQuery);
  }, [urlQuery]);

  const unassignedCount = useMemo(
    () => candidates.filter((c) => c.role_ids.length === 0).length,
    [candidates]
  );

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (filterStage && c.stage !== filterStage) return false;
      // "unassigned" keeps candidates reachable after their role is deleted;
      // otherwise they exist but appear under no role at all.
      if (filterJob === "unassigned") {
        if (c.role_ids.length > 0) return false;
      } else if (filterJob && !c.role_ids.includes(filterJob)) return false;
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
    try {
      await Promise.all([...selected].map((id) => api.post(`/candidates/${id}/stage`, { stage })));
      setSelected(new Set());
      load();
    } catch (err) {
      setError(errMessage(err, "Couldn't update those candidates."));
    }
  };

  if (error && !jobs.length && !candidates.length) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <ErrorState message={error} onRetry={load} testid="dash-error" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={load} testid="dash-error-inline" />
        </div>
      )}
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="font-mono-label mb-2">
            {tab === "jobs" ? "roles" : tab === "candidates" ? "candidates" : "overview"}
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            {tab === "jobs" ? "Open roles" : tab === "candidates" ? "All candidates" : "Talent pipeline"}
          </h1>
        </div>
        <button
          onClick={() => nav("/app/jobs/new")}
          data-testid="dash-new-role-btn"
          className="bg-brand text-white px-5 py-2.5 text-sm hover:bg-brand/90 transition-colors inline-flex items-center gap-2 linear-glow"
        >
          <Plus size={14} /> New role
        </button>
      </div>

      {/* KPI band */}
      {summary && tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-5 border hairline mb-8">
          <Kpi label="open roles" value={summary.total_jobs} icon={<Briefcase size={14} />} testid="kpi-jobs" />
          <Kpi label="candidates" value={summary.total_candidates} icon={<Users size={14} />} testid="kpi-candidates" />
          <Kpi label="shortlisted" value={summary.funnel.Shortlisted} icon={<Star size={14} />} testid="kpi-shortlisted" />
          <Kpi label="interviewing" value={summary.funnel.Interview} icon={<TrendingUp size={14} />} testid="kpi-interview" />
          <Kpi
            label="self-applied"
            value={summary.self_applied_share == null ? "—" : `${Math.round(summary.self_applied_share * 100)}%`}
            hint={summary.self_applied_count != null ? `${summary.self_applied_count} of ${summary.total_candidates}` : null}
            icon={<Zap size={14} />}
            testid="kpi-autoapply"
            gold
          />
        </div>
      )}

      {/* Roles grid */}
      <div className={cx("mb-10", tab === "candidates" && "hidden")}>
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
                <ChevronRight size={14} className="text-white/30 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-lg font-medium mb-1 leading-snug">{j.title}</div>
              <div className="text-xs text-white/50 mb-4">{j.location} · {j.seniority}</div>
              <div className="flex items-center justify-between text-xs pt-3 border-t hairline">
                <span className="text-white/50">{j.candidates_count} candidates</span>
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
              <Plus size={20} className="text-white/40 mb-2" />
              <div className="text-sm text-white/60">Create a new role</div>
              <div className="font-mono-label mt-2">press N</div>
            </button>
          )}
        </div>
      </div>

      {/* Candidate table */}
      <div className={cx(tab === "jobs" && "hidden")}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold">All candidates</h2>
            {(q || filterStage || filterJob) && (
              <span className="text-[10px] font-mono flex items-center gap-1.5">
                <span className="text-white/60">{candidates.length} candidates</span>
                <span className="text-white/30">→</span>
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
                  onClick={() => {
                    setQ(""); setFilterStage(""); setFilterJob("");
                    if (urlQuery) {
                      const next = new URLSearchParams(params);
                      next.delete("q");
                      setParams(next, { replace: true });
                    }
                  }}
                  data-testid="dash-clear-filters"
                  className="text-white/40 hover:text-white transition-colors ml-1"
                >
                  clear
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border hairline px-3 py-2">
              <Search size={12} className="text-white/40" />
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
              {unassignedCount > 0 && (
                <option value="unassigned" className="bg-app">Unassigned ({unassignedCount})</option>
              )}
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
                      <Avatar src={c.avatar} name={c.name} size={32} className="grayscale group-hover:grayscale-0 transition-all" />
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-[11px] text-white/40">{c.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-white/80">{c.current_title}</div>
                    <div className="text-[11px] text-white/40">{c.current_company}</div>
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
                        <span className="text-[10px] font-mono text-white/50">+{c.role_ids.length - 2}</span>
                      )}
                      {c.role_ids.length === 0 && (
                        <span className="text-[10px] font-mono text-amber-400/70 border border-amber-400/30 px-2 py-0.5">
                          unassigned
                        </span>
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
                <tr><td colSpan="8" className="py-16 text-center text-white/40 text-sm">
                  {loading ? "Loading candidates…" : "No candidates match these filters."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalCandidates > candidates.length && (
          <div className="mt-3 text-[11px] text-white/40" data-testid="dash-truncated">
            Showing {candidates.length} of {totalCandidates} candidates. Use search or filters to narrow down.
          </div>
        )}

        {/* Keyboard hint */}
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-white/40">
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
          <button onClick={() => setSelected(new Set())} className="text-white/40 hover:text-white p-1 ml-1" data-testid="bulk-clear">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, testid, gold, hint }) {
  return (
    <div className="p-5 border-r hairline last:border-r-0" data-testid={testid}>
      <div className="flex items-center gap-2 mb-2">
        <span className={gold ? "text-brand" : "text-white/40"}>{icon}</span>
        <span className="font-mono-label">{label}</span>
      </div>
      <div className={cx("font-display text-3xl font-bold tabular-nums tracking-tight", gold && "text-brand")}>{value}</div>
      {hint && <div className="text-[10px] text-white/35 mt-1 font-mono">{hint}</div>}
    </div>
  );
}

function StageBadge({ stage }) {
  const map = {
    New: "text-white/60 border-white/20",
    Shortlisted: "text-brand border-brand/40",
    Interview: "text-gold border-gold/40",
    Offer: "text-success border-success/40",
    Rejected: "text-white/30 border-white/10 line-through",
  };
  return (
    <span className={cx("text-[10px] font-mono uppercase tracking-widest px-2 py-1 border", map[stage] || map.New)}>
      {stage}
    </span>
  );
}

function MatchScore({ score }) {
  const color = score >= 90 ? "text-brand" : score >= 75 ? "text-white" : "text-white/50";
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
