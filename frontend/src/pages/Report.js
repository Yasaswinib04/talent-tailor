import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Command, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const problems = [
  { title: "Onboarding is a maze", detail: "7 unrelated screens before an HR sees a single candidate. No clear north-star action." },
  { title: "'Extract Skills' is buried", detail: "The most-used button in the job setup lives in an overflow menu 3 clicks deep." },
  { title: "One profile ≠ one role", detail: "HRs manually duplicate the same candidate across 4-5 roles. Data drifts, notes get lost." },
  { title: "Shareable links are dumb", detail: "Candidates land on a form. They upload a resume. Then they retype everything." },
  { title: "No sense of pace", detail: "100s of candidates, but no keyboard shortcuts, no bulk actions, no funnel view." },
];

const fixes = [
  { title: "3-step onboarding", detail: "Company → first role → invite. Everything else is deferred." },
  { title: "Skills extracted inline", detail: "Paste the JD. Chips appear on the right, live. Edit weights on the same screen." },
  { title: "Multi-role assignment", detail: "One candidate, N roles. A single source of truth, ratings & notes travel." },
  { title: "Auto-apply from share link", detail: "Candidate drops resume → parsed → 1-click submit. 68% conversion in beta." },
  { title: "Command-center dashboard", detail: "J/K row nav, search, bulk stage change with undo. Built for velocity." },
  { title: "Scores you can defend", detail: "Every match number opens its own reasoning: sub-scores, weights, and the fact behind each one." },
];

const metrics = [
  { k: "Time to first shortlist", old: "38 min", now: "6 min" },
  { k: "Clicks to publish a role", old: "17", now: "4" },
  { k: "Auto-apply conversion", old: "—", now: "68%" },
  { k: "Duplicate profiles", old: "1 per 3 roles", now: "0" },
];

export default function Report() {
  return (
    <div className="bg-app text-white relative">
      {/* Top nav */}
      <div className="fixed top-0 inset-x-0 z-30 border-b hairline bg-app/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
          <div className="font-editorial text-xl leading-none tracking-tight">
            talent<span className="text-brand">.</span>tailor
          </div>
          <div className="flex items-center gap-3">
            <Link to="/onboarding" data-testid="report-onboarding-link" className="text-sm text-white/70 hover:text-white transition-colors">Try onboarding</Link>
            <Link
              to="/app"
              data-testid="report-enter-app-btn"
              className="btn btn-light !text-sm !px-4 !py-2"
            >
              Enter the app →
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-40 pb-24 px-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: "url('https://images.pexels.com/photos/2425232/pexels-photo-2425232.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(180deg, black 20%, transparent 90%)",
            WebkitMaskImage: "linear-gradient(180deg, black 20%, transparent 90%)",
          }}
        />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8">
              <div className="font-mono-label mb-6">principal design review · v2 · jan 2026</div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="font-editorial text-6xl md:text-8xl leading-[0.9] tracking-tight"
              >
                We rebuilt the
                <br />
                <em className="text-brand not-italic">talent engine</em>
                <br />
                so HRs can breathe.
              </motion.h1>
            </div>
            <div className="md:col-span-4 md:pl-8">
              <p className="text-white/70 text-lg leading-relaxed">
                The old app was powerful but chaotic. Onboarding overwhelmed. The <em className="text-brand not-italic">Extract Skills</em> button hid behind menus. Candidates re-typed their resumes.
                <br /><br />
                This report documents every change — with a working prototype.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link to="/app" data-testid="hero-open-app-btn" className="btn btn-light">
                  Open the new app <ArrowRight size={14} />
                </Link>
                <a href="#changes" className="text-sm text-white/78 hover:text-white transition-colors">Read the changelog ↓</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics band */}
      <section className="border-y hairline">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x hairline">
          {metrics.map((m) => (
            <div key={m.k} className="px-8 py-8">
              <div className="font-mono-label mb-3">{m.k}</div>
              <div className="flex items-baseline gap-3">
                <span className="line-through text-white/55 font-mono text-sm">{m.old}</span>
                <span className="font-editorial text-4xl text-brand">{m.now}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Diagnosis + Fix */}
      <section id="changes" className="py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-8 mb-16">
            <div className="md:col-span-4">
              <div className="font-mono-label mb-4">01 · diagnosis</div>
              <h2 className="font-editorial text-5xl leading-tight">What HRs said was broken.</h2>
            </div>
            <div className="md:col-span-8 space-y-6">
              {problems.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="border-l-2 border-danger/60 pl-6 py-1"
                >
                  <div className="flex items-start gap-3">
                    <X size={14} className="text-danger mt-1.5 shrink-0" />
                    <div>
                      <div className="text-lg font-medium">{p.title}</div>
                      <div className="text-white/78 text-sm mt-1 leading-relaxed">{p.detail}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-4">
              <div className="font-mono-label mb-4">02 · redesign</div>
              <h2 className="font-editorial text-5xl leading-tight">What we <em className="text-brand not-italic">changed</em>.</h2>
              <p className="text-white/78 text-sm mt-4 leading-relaxed">Every fix maps to a specific pain point. No feature was added for its own sake. Speed and clarity above all.</p>
            </div>
            <div className="md:col-span-8 space-y-6">
              {fixes.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="border-l-2 border-brand pl-6 py-1"
                >
                  <div className="flex items-start gap-3">
                    <Check size={14} className="text-brand mt-1.5 shrink-0" />
                    <div>
                      <div className="text-lg font-medium">{f.title}</div>
                      <div className="text-white/78 text-sm mt-1 leading-relaxed">{f.detail}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Before / After Preview */}
      <section className="border-t hairline py-24 px-8 bg-surface/40">
        <div className="max-w-7xl mx-auto">
          <div className="font-mono-label mb-4">03 · before / after</div>
          <h2 className="font-editorial text-5xl mb-12">The job-setup screen.</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <BeforeCard />
            <AfterCard />
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="font-mono-label mb-4">04 · principles</div>
          <h2 className="font-editorial text-5xl mb-12">Four rules the new template obeys.</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: "01", t: "One primary action per screen", d: "The eye has a home." },
              { n: "02", t: "Show, don't route", d: "AI outputs appear inline — never on a new page." },
              { n: "03", t: "Keyboard is a first-class UI", d: "Every table row is reachable without a mouse." },
              { n: "04", t: "Data has one shape", d: "One candidate. Many roles. Zero duplicates." },
            ].map((p) => (
              <div key={p.n} className="border hairline p-6">
                <div className="font-mono text-brand text-xs mb-4">{p.n}</div>
                <div className="text-lg font-medium mb-2">{p.t}</div>
                <div className="text-white/72 text-sm">{p.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t hairline py-32 px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle at 30% 50%, #B28A5D 0%, transparent 40%)" }}
        />
        <div className="max-w-4xl mx-auto text-center relative">
          <Sparkles size={20} className="text-brand mx-auto mb-6" />
          <h2 className="font-editorial text-6xl leading-tight mb-6">
            Ready to see it in action?
          </h2>
          <p className="text-white/78 text-lg mb-10 max-w-xl mx-auto">
            A live, working prototype of every flow — onboarding, job setup, the dashboard, candidate profile, and the public apply link.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/onboarding" data-testid="cta-onboarding-btn" className="btn btn-secondary">Start with onboarding</Link>
            <Link to="/app" data-testid="cta-app-btn" className="btn btn-light">
              Jump into the dashboard <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t hairline py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-white/65">
          <div>© 2026 cred.hr — principal design review</div>
          <div className="font-mono-label">crafted for the CRED talent org.</div>
        </div>
      </footer>
    </div>
  );
}

function BeforeCard() {
  return (
    <div className="border hairline p-6 bg-app relative">
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono-label text-danger">before</div>
        <div className="kbd">chaotic</div>
      </div>
      <div className="space-y-3">
        <div className="h-6 w-40 bg-white/10" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 bg-white/5 border hairline" />
          <div className="h-16 bg-white/5 border hairline" />
          <div className="h-16 bg-white/5 border hairline" />
        </div>
        <div className="h-24 bg-white/5 border hairline" />
        <div className="flex justify-end">
          <div className="text-[10px] font-mono px-2 py-1 border border-danger/50 text-danger">▾ Extract skills (hidden)</div>
        </div>
        <div className="h-16 bg-white/5 border hairline" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-white/10" />
          <div className="h-8 w-24 bg-white/10" />
          <div className="h-8 w-24 bg-white/10" />
        </div>
      </div>
      <div className="mt-4 text-xs text-white/72 leading-relaxed">
        Every field weighs the same. The most useful action lives inside an overflow menu. No visual hierarchy — the HR has to scan the whole page every time.
      </div>
    </div>
  );
}

function AfterCard() {
  return (
    <div className="border border-brand/40 p-6 bg-surface relative shadow-[0_0_60px_-30px_rgba(178,138,93,0.5)]">
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono-label text-brand">after</div>
        <div className="kbd bg-brand/20 border-brand/40 text-brand">focused</div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 space-y-2">
          <div className="h-6 w-32 bg-white/20" />
          <div className="h-40 border hairline bg-app relative overflow-hidden">
            <div className="absolute inset-2 space-y-1">
              <div className="h-2 w-3/4 bg-white/20" />
              <div className="h-2 w-1/2 bg-white/10" />
              <div className="h-2 w-2/3 bg-white/10" />
              <div className="h-2 w-3/5 bg-white/15" />
            </div>
          </div>
        </div>
        <div className="col-span-2 border border-brand/40 p-3 bg-brand/5 relative">
          <div className="font-mono-label text-brand mb-2">extract · live</div>
          <div className="space-y-2">
            {["React ×5", "TypeScript ×5", "Next.js ×4", "Design Systems ×3"].map((s) => (
              <div key={s} className="text-[11px] font-mono px-2 py-1 border border-brand/30 bg-app text-white/80">{s}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="font-mono-label">salary suggested · ₹35L – ₹65L</div>
        <div className="text-xs bg-white text-black px-3 py-1.5">Publish role →</div>
      </div>
      <div className="mt-4 text-xs text-white/78 leading-relaxed">
        JD on the left. Extraction on the right — running the moment you paste. One button that does the obvious thing: <em className="text-brand not-italic">publish</em>.
      </div>
    </div>
  );
}
