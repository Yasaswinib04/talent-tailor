import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, fmtINR, cx } from "../lib/api";
import { ChevronLeft, Share2, Copy, Check, ExternalLink, Users, Lock, Unlock, Download, X } from "lucide-react";

export default function JobDetail() {
  const { jobId } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [cands, setCands] = useState([]);
  const [copied, setCopied] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState(null);
  const [unlockBusy, setUnlockBusy] = useState(false);

  const load = async () => {
    const [j, c] = await Promise.all([api.get(`/jobs/${jobId}`), api.get(`/candidates?job_id=${jobId}`)]);
    setJob(j.data);
    setCands(c.data);
  };

  useEffect(() => {
    load();
  }, [jobId]);

  if (!job) return <div className="p-8 text-white/65">Loading…</div>;

  const shareUrl = `${window.location.origin}/apply/${job.share_slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitUnlock = async (e) => {
    e.preventDefault();
    setUnlockError(null);
    setUnlockBusy(true);
    try {
      await api.post(`/jobs/${jobId}/unlock`, { code: unlockCode });
      setUnlockOpen(false);
      setUnlockCode("");
      await load();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setUnlockError(typeof detail === "string" ? detail : "Couldn't unlock. Please try again.");
    } finally {
      setUnlockBusy(false);
    }
  };

  const exportCsv = async () => {
    const res = await api.get(`/jobs/${jobId}/export`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-shortlist.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lockedCount = cands.filter((c) => c.locked).length;

  return (
    <div className="max-w-[1200px] mx-auto p-8">
      <button onClick={() => nav("/app")} data-testid="jd-back-btn" className="text-white/72 hover:text-white text-sm inline-flex items-center gap-1 mb-6 transition-colors">
        <ChevronLeft size={14} /> back to overview
      </button>

      <div className="grid md:grid-cols-3 gap-8 mb-10">
        <div className="md:col-span-2">
          <div className="font-mono-label mb-3">{job.department} · {job.location} · {job.seniority}</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mb-4">{job.title}</h1>
          <div className="flex items-baseline gap-4 mb-6">
            <span className="font-editorial text-2xl text-brand">{fmtINR(job.salary_min)} – {fmtINR(job.salary_max)}</span>
            <span className="font-mono-label">annually</span>
          </div>
          <div className="border-l-2 border-brand pl-4 text-white/70 leading-relaxed text-sm whitespace-pre-line">
            {job.jd}
          </div>
        </div>

        <div className="space-y-6">
          {/* Share link */}
          <div className="border hairline p-5 bg-surface">
            <div className="flex items-center gap-2 mb-3">
              <Share2 size={12} className="text-brand" />
              <span className="font-mono-label">public apply link</span>
            </div>
            <div className="text-xs font-mono text-white/70 bg-app border hairline p-2 break-all mb-3">
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                data-testid="jd-copy-link-btn"
                className="flex-1 border hairline hover:border-white text-xs py-2 inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="jd-open-link-btn"
                className="flex-1 border hairline hover:border-brand hover:text-brand text-xs py-2 inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink size={12} /> Preview
              </a>
            </div>
            <div className="mt-3 text-[10px] text-white/65 leading-relaxed">
              Candidates upload a resume and apply in one click. Their profile is auto-scored against this role.
            </div>
          </div>

          <div className="border hairline p-5 bg-surface">
            <div className="font-mono-label mb-3">required skills</div>
            <div className="space-y-2">
              {job.skills.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{s.name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={`w-1.5 h-3 ${n <= s.weight ? "bg-brand" : "bg-white/10"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          {job.filters && Object.keys(job.filters).length > 0 && (
            <div className="border hairline p-5 bg-surface">
              <div className="font-mono-label mb-3">mandatory filters</div>
              <div className="space-y-2 text-xs text-white/70">
                {job.filters.min_experience_years != null && (
                  <div className="flex justify-between"><span>Min experience</span><span className="font-mono">{job.filters.min_experience_years}+ years</span></div>
                )}
                {job.filters.education_preference && (
                  <div className="flex justify-between"><span>Education</span><span className="font-mono text-right max-w-[60%]">{job.filters.education_preference}</span></div>
                )}
                {job.filters.notice_period_max_days != null && (
                  <div className="flex justify-between"><span>Notice</span><span className="font-mono">≤ {job.filters.notice_period_max_days}d</span></div>
                )}
                {job.filters.must_have_skills?.length > 0 && (
                  <div>
                    <div className="mb-1">Must-have</div>
                    <div className="flex flex-wrap gap-1">
                      {job.filters.must_have_skills.map((s) => (
                        <span key={s} className="text-[10px] font-mono border border-brand/30 bg-brand/5 text-brand px-1.5 py-0.5">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scoring weights */}
          {job.scoring_weights && Object.keys(job.scoring_weights).length > 0 && (
            <div className="border hairline p-5 bg-surface">
              <div className="font-mono-label mb-3">scoring weights</div>
              <div className="space-y-2">
                {Object.entries(job.scoring_weights).map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="capitalize">{k.replace("_", " ")}</span>
                      <span className="font-mono">{v}%</span>
                    </div>
                    <div className="h-1 bg-white/10">
                      <div className="h-full bg-brand" style={{ width: `${(v / 60) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Candidates for this role */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users size={16} className="text-brand" />
            <h2 className="font-display text-xl font-semibold">Candidates for this role</h2>
            <span className="font-mono-label">{cands.length} total</span>
          </div>
          {job.unlocked ? (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-success flex items-center gap-1.5" data-testid="jd-unlocked-badge">
                <Unlock size={12} /> full shortlist unlocked
              </span>
              <button
                onClick={exportCsv}
                data-testid="jd-export-btn"
                className="btn btn-light !py-2 text-xs"
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
          ) : (
            lockedCount > 0 && (
              <button
                onClick={() => setUnlockOpen(true)}
                data-testid="jd-unlock-btn"
                className="btn btn-primary !py-2 text-xs"
              >
                <Lock size={12} /> Unlock all {cands.length} — ₹1,999
              </button>
            )
          )}
        </div>
        <div className="border hairline">
          {cands.map((c) => (
            <div
              key={c.id}
              onClick={() => nav(`/app/candidates/${c.id}`)}
              data-testid={`jd-cand-${c.id}`}
              className="flex items-center gap-4 p-4 border-b hairline last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors group"
            >
              {c.locked ? (
                <div className="w-10 h-10 rounded-full bg-white/5 border hairline flex items-center justify-center shrink-0">
                  <Lock size={14} className="text-white/40" />
                </div>
              ) : (
                <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" />
              )}
              <div className="flex-1 min-w-0">
                <div className={cx("font-medium", c.locked && "text-white/50")}>{c.name}</div>
                <div className="text-xs text-white/72">{c.current_title} · {c.current_company} · {c.experience_years}y · {fmtINR(c.expected_ctc)}</div>
              </div>
              <div className="text-xs text-white/72 hidden md:block">
                {c.skills.slice(0, 3).join(" · ")}
              </div>
              <div className="w-20 text-right">
                <span className={cx("font-editorial text-2xl", c.match_score >= 90 ? "text-brand" : "text-white")}>
                  {c.match_score}
                </span>
              </div>
            </div>
          ))}
          {cands.length === 0 && (
            <div className="p-12 text-center text-white/65 text-sm">
              No candidates yet. Share the public apply link →
            </div>
          )}
        </div>

        {/* The ask sits here and nowhere earlier: the full ranked list is on
            screen with the top of it revealed, so what's being bought is
            visible before it's paid for. */}
        {!job.unlocked && lockedCount > 0 && (
          <div data-testid="jd-paywall-banner" className="mt-6 border border-brand/40 bg-brand/5 p-6 flex flex-wrap items-center gap-4">
            <Lock size={16} className="text-brand shrink-0" />
            <div className="flex-1 min-w-[240px]">
              <div className="font-display text-lg font-semibold mb-1">
                Top {cands.length - lockedCount} revealed free — {lockedCount} more ranked candidate{lockedCount > 1 ? "s" : ""} hidden
              </div>
              <p className="text-sm text-white/72">
                Unlock the full shortlist for this role: every name, contact detail, and the CSV export. ₹1,999, one-time, per role.
              </p>
            </div>
            <button onClick={() => setUnlockOpen(true)} data-testid="jd-paywall-unlock-btn" className="btn btn-primary">
              <Unlock size={14} /> Unlock full shortlist
            </button>
          </div>
        )}
      </div>

      {/* Unlock modal */}
      {unlockOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setUnlockOpen(false)}>
          <div className="bg-surface border hairline max-w-md w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setUnlockOpen(false)} data-testid="unlock-close" className="absolute top-4 right-4 text-white/55 hover:text-white">
              <X size={16} />
            </button>
            <div className="font-mono-label mb-2">unlock this shortlist</div>
            <div className="font-editorial text-3xl mb-1">₹1,999 <span className="text-base text-white/55">· one-time · this role</span></div>
            <p className="text-sm text-white/72 mt-3 mb-6">
              You get every ranked candidate's name and contact details, plus the CSV export —
              for all current and future applicants to this role.
            </p>
            <div className="border hairline bg-app p-4 text-sm text-white/78 mb-6 leading-relaxed">
              {/* TODO(owner): put your real payment contact (WhatsApp / UPI / email) here
                  before sending this to buyers. */}
              To pay: contact the Talent Tailor team with this role's name. You'll get a
              payment link and an unlock code within minutes.
            </div>
            <form onSubmit={submitUnlock} className="flex gap-3">
              <input
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
                placeholder="Unlock code"
                data-testid="unlock-code-input"
                className="flex-1 bg-app border hairline px-4 py-2.5 text-sm placeholder:text-white/40 focus:border-brand focus:outline-none"
              />
              <button type="submit" disabled={unlockBusy || !unlockCode.trim()} data-testid="unlock-submit" className="btn btn-light disabled:opacity-50">
                {unlockBusy ? "Unlocking…" : "Unlock"}
              </button>
            </form>
            {unlockError && (
              <div data-testid="unlock-error" className="mt-3 text-sm text-red-300">{unlockError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
