import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, fmtINR, cx } from "../lib/api";
import { ChevronLeft, Share2, Copy, Check, ExternalLink, Users } from "lucide-react";

export default function JobDetail() {
  const { jobId } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [cands, setCands] = useState([]);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const [j, c] = await Promise.all([api.get(`/jobs/${jobId}`), api.get(`/candidates?job_id=${jobId}`)]);
    setJob(j.data);
    setCands(c.data);
  };

  useEffect(() => {
    load();
  }, [jobId]);

  if (!job) return <div className="p-8 text-white/40">Loading…</div>;

  const shareUrl = `${window.location.origin}/apply/${job.share_slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[1200px] mx-auto p-8">
      <button onClick={() => nav("/app")} data-testid="jd-back-btn" className="text-white/50 hover:text-white text-sm inline-flex items-center gap-1 mb-6 transition-colors">
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
            <div className="mt-3 text-[10px] text-white/40 leading-relaxed">
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
        </div>
        <div className="border hairline">
          {cands.map((c) => (
            <div
              key={c.id}
              onClick={() => nav(`/app/candidates/${c.id}`)}
              data-testid={`jd-cand-${c.id}`}
              className="flex items-center gap-4 p-4 border-b hairline last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors group"
            >
              <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-white/50">{c.current_title} · {c.current_company} · {c.experience_years}y · {fmtINR(c.expected_ctc)}</div>
              </div>
              <div className="text-xs text-white/50 hidden md:block">
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
            <div className="p-12 text-center text-white/40 text-sm">
              No candidates yet. Share the public apply link →
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
