import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Filter, Users, Link2 } from "lucide-react";

/**
 * The front door.
 *
 * Deliberately one screen: an HR should know what this does and be able to
 * start, without scrolling. The design review that used to live here is a
 * different audience and a different job — it moved to /report.
 */
const POINTS = [
  {
    icon: <Filter size={16} />,
    title: "See who qualifies before you publish",
    body: "Set your criteria and watch the count move live. No guessing how many people clear the bar.",
  },
  {
    icon: <Users size={16} />,
    title: "One profile, every role",
    body: "Assign a candidate to as many roles as they fit. No duplicate records, no lost notes.",
  },
  {
    icon: <Link2 size={16} />,
    title: "Applicants fill themselves in",
    body: "Share one link. Candidates upload a resume and land on your dashboard, already scored.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-app text-white flex flex-col">
      <header className="border-b hairline">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="font-editorial text-xl leading-none tracking-tight">
            cred<span className="text-brand">.</span>hr
          </div>
          <Link
            to="/report"
            data-testid="landing-report-link"
            className="text-sm text-white/72 hover:text-white transition-colors"
          >
            How we designed it
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-8 py-16 w-full">
          <div className="font-mono-label mb-5">for recruiters hiring at volume</div>

          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Shortlist the right candidates
            <br />
            in minutes, not weeks.
          </h1>

          <p className="text-lg text-white/78 mt-6 max-w-xl leading-relaxed">
            Describe the role in plain English. We pull out the skills, show you exactly who
            in your pool qualifies, and rank them the way you'd rank them.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-10">
            <Link to="/app" data-testid="landing-primary-cta" className="btn btn-primary">
              Try the live demo <ArrowRight size={15} />
            </Link>
            <span className="text-sm text-white/65">
              Real data, no setup — takes about two minutes.
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-subtle border hairline mt-16">
            {POINTS.map((p) => (
              <div key={p.title} className="bg-app p-6">
                <div className="text-brand mb-3">{p.icon}</div>
                <div className="font-medium mb-2 leading-snug">{p.title}</div>
                <div className="text-sm text-white/72 leading-relaxed">{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t hairline">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="font-mono-label">cred.hr · talent engine</div>
          <Link to="/report" className="font-mono-label hover:text-white transition-colors">
            design review ↗
          </Link>
        </div>
      </footer>
    </div>
  );
}
