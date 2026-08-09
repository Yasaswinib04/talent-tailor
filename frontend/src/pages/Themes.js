import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Users, TrendingUp, Star, ChevronRight, Search, Command, Sparkles, Zap } from "lucide-react";

/**
 * Theme showcase — 6 half-page previews of the same dashboard slice.
 * Pure inline styles so each preview is fully self-contained.
 */

const CANDIDATES = [
  { name: "Rohan Sharma", title: "Sr. Frontend Engineer", company: "Razorpay", score: 92, stage: "Shortlisted" },
  { name: "Priya Desai", title: "Product Manager", company: "Swiggy", score: 88, stage: "Interview" },
  { name: "Anand Iyer", title: "Backend Lead", company: "Flipkart", score: 95, stage: "Interview" },
];

const KPIS = [
  { label: "open roles", value: "4", icon: Briefcase },
  { label: "candidates", value: "148", icon: Users },
  { label: "shortlisted", value: "23", icon: Star },
  { label: "interviewing", value: "9", icon: TrendingUp },
];

export default function Themes() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 sticky top-0 bg-neutral-950/90 backdrop-blur z-20">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link to="/" className="font-editorial text-xl">talent<span className="text-brand">.</span>tailor</Link>
          <div className="text-xs font-mono uppercase tracking-widest text-white/72">theme explorations</div>
          <Link to="/app" className="text-xs text-white/78 hover:text-white">Back to app →</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-12">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/72 mb-3">pick a direction</div>
          <h1 className="font-editorial text-5xl md:text-6xl leading-none">Six ways this could feel.</h1>
          <p className="text-white/72 max-w-xl mt-4 text-sm leading-relaxed">
            Same slice of the dashboard, six aesthetics. Scroll through, tell me which one clicks — I'll rebuild the whole app in it.
          </p>
        </div>

        <div className="space-y-16">
          <ThemeBlock
            n="01"
            name="Notion-Meets-Muji"
            desc="Warm minimalism. Paper background, ink text, one clay accent. Zero visual fatigue over 8-hour shifts."
            bestFor="HRs who live in the app"
          >
            <NotionMujiPreview />
          </ThemeBlock>

          <ThemeBlock
            n="02"
            name="Airbnb-Grade Editorial Light"
            desc="Rounded cards, candidate photos front-and-center, generous whitespace. Humans first, data second."
            bestFor="Making candidates feel like people, not rows"
          >
            <AirbnbPreview />
          </ThemeBlock>

          <ThemeBlock
            n="03"
            name="Linear Product OS"
            desc="Ultra-precise, keyboard-first, subtle indigo glow. Feels like an engineer's internal tool. Perceived-speed is the aesthetic."
            bestFor="Fast movers, tech-company HRs"
          >
            <LinearPreview />
          </ThemeBlock>

          <ThemeBlock
            n="04"
            name="Swiss Newsroom"
            desc="Monochrome + one cobalt hero color. Thick rules, display serifs, table like a print masthead. Numbers set like stock tickers."
            bestFor="Exec demos and print-tier polish"
          >
            <SwissPreview />
          </ThemeBlock>

          <ThemeBlock
            n="05"
            name="Duolingo Confidence"
            desc="Chunky buttons, offset shadows, playful color, guided energy. Fights the 'overwhelmed' feeling head-on."
            bestFor="Fixing chaotic onboarding perception"
          >
            <DuoPreview />
          </ThemeBlock>

          <ThemeBlock
            n="06"
            name="Stripe / Vercel Ship"
            desc="Crisp light UI + one bold gradient moment on the marketing hero. Berkeley Mono skills. Premium, technical, never dark."
            bestFor="Staying light but keeping a hero moment"
          >
            <StripePreview />
          </ThemeBlock>
        </div>

        <div className="mt-20 border-t border-white/10 pt-8 text-sm text-white/72 text-center">
          Which one? Tell me the number and I'll rebuild the whole app in it — or a hybrid (e.g. "03 for the dashboard, 04 for the report page").
        </div>
      </div>
    </div>
  );
}

function ThemeBlock({ n, name, desc, bestFor, children }) {
  return (
    <div>
      <div className="grid md:grid-cols-12 gap-6 mb-4">
        <div className="md:col-span-4">
          <div className="font-mono text-brand text-xs mb-2">theme · {n}</div>
          <h2 className="font-editorial text-3xl leading-tight mb-2">{name}</h2>
          <p className="text-white/78 text-sm leading-relaxed mb-3">{desc}</p>
          <div className="text-[11px] font-mono uppercase tracking-widest text-white/65">
            best for: <span className="text-brand">{bestFor}</span>
          </div>
        </div>
        <div className="md:col-span-8 border border-white/10 overflow-hidden rounded-sm">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────── 01 · Notion-Meets-Muji ─────────────────────── */
function NotionMujiPreview() {
  return (
    <div style={{ background: "#FAF9F6", color: "#1C1B1A", padding: 28, fontFamily: "'Inter Tight', ui-sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8582", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>overview · jan 2026</div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em" }}>Talent pipeline</div>
        </div>
        <button style={{ background: "#C9522A", color: "white", padding: "10px 18px", fontSize: 13, borderRadius: 8, fontWeight: 500 }}>+ New role</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ background: "#EFE9DE", padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8582", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 500 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "white", border: "1px solid #E5E1D8", borderRadius: 8, overflow: "hidden" }}>
        {CANDIDATES.map((c, i) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", padding: 14, gap: 12, borderTop: i > 0 ? "1px solid #F0EBE0" : "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EFE9DE" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "#8A8582" }}>{c.title} · {c.company}</div>
            </div>
            <div style={{ fontSize: 11, color: "#C9522A", background: "#FBE9DF", padding: "3px 8px", borderRadius: 4, fontWeight: 500 }}>{c.stage}</div>
            <div style={{ fontSize: 22, fontWeight: 500, minWidth: 40, textAlign: "right" }}>{c.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── 02 · Airbnb Editorial Light ─────────────────────── */
function AirbnbPreview() {
  return (
    <div style={{ background: "white", color: "#111", padding: 28, fontFamily: "'Circular Std', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "#767676", marginBottom: 6 }}>Good morning, Maya ✨</div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>Your pipeline today</div>
        </div>
        <button style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)", color: "white", padding: "12px 22px", fontSize: 14, borderRadius: 24, fontWeight: 600, boxShadow: "0 6px 20px -8px rgba(255,56,92,0.6)" }}>+ New role</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ background: "#F7F7F7", padding: 16, borderRadius: 16 }}>
            <div style={{ fontSize: 12, color: "#767676", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {CANDIDATES.map((c) => (
          <div key={c.name} style={{ background: "white", border: "1px solid #EBEBEB", borderRadius: 20, padding: 16, boxShadow: "0 2px 8px -4px rgba(0,0,0,0.08)" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #FFB1C1, #FF385C)", marginBottom: 12 }} />
            <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "#767676", marginBottom: 10 }}>{c.title}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, background: "#FFE8EC", color: "#FF385C", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }}>{c.stage}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{c.score}<span style={{ fontSize: 12, color: "#767676", fontWeight: 400 }}>/100</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── 03 · Linear Product OS ─────────────────────── */
function LinearPreview() {
  return (
    <div style={{ background: "#08090A", color: "#F7F8F8", padding: 24, fontFamily: "'Inter Variable', 'Inter', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #1F2023" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#141517", padding: "6px 12px", borderRadius: 6, border: "1px solid #26282D", flex: 1 }}>
          <Search size={12} style={{ color: "#8A8F98" }} />
          <span style={{ fontSize: 12, color: "#8A8F98" }}>Search candidates, roles, skills…</span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#8A8F98", background: "#1F2023", padding: "2px 6px", borderRadius: 3, fontFamily: "monospace" }}>⌘K</span>
        </div>
        <button style={{ background: "#5E6AD2", color: "white", padding: "6px 12px", fontSize: 12, borderRadius: 6, fontWeight: 500, boxShadow: "0 0 0 1px rgba(94,106,210,0.4), 0 2px 8px -2px rgba(94,106,210,0.5)" }}>+ New role  <span style={{ opacity: 0.6, marginLeft: 4 }}>N</span></button>
      </div>
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#8A8F98", marginBottom: 4, letterSpacing: "-0.01em" }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#0D0E10", border: "1px solid #1F2023", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 60px", padding: "8px 14px", fontSize: 10, color: "#8A8F98", textTransform: "uppercase", letterSpacing: "0.06em", background: "#101113", borderBottom: "1px solid #1F2023" }}>
          <span>Candidate</span><span>Company</span><span>Stage</span><span style={{ textAlign: "right" }}>Match</span>
        </div>
        {CANDIDATES.map((c, i) => (
          <div key={c.name} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 60px", padding: "10px 14px", fontSize: 13, alignItems: "center", borderBottom: i < CANDIDATES.length - 1 ? "1px solid #1A1B1E" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#5E6AD2" }} />
              <span>{c.name}</span>
            </div>
            <span style={{ color: "#8A8F98" }}>{c.company}</span>
            <span style={{ fontSize: 11, color: "#5E6AD2" }}>● {c.stage}</span>
            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{c.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── 04 · Swiss Newsroom ─────────────────────── */
function SwissPreview() {
  return (
    <div style={{ background: "white", color: "#000", padding: 28, fontFamily: "'Söhne', 'Inter', sans-serif" }}>
      <div style={{ borderBottom: "3px solid #000", paddingBottom: 12, marginBottom: 20, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>talent · vol iv · issue 07</div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.03em", fontFamily: "'Söhne Breit', serif" }}>THE PIPELINE</div>
        </div>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em" }}>07 · JAN · 2026</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: "1px solid #000", borderBottom: "1px solid #000", marginBottom: 20 }}>
        {KPIS.map((k, i) => (
          <div key={k.label} style={{ padding: "16px 12px", borderRight: i < 3 ? "1px solid #E5E5E5" : "none" }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8, color: "#0047AB" }}>{k.label}</div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000" }}>
            <th style={{ textAlign: "left", padding: "8px 0", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500 }}>Candidate</th>
            <th style={{ textAlign: "left", padding: "8px 0", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500 }}>Role</th>
            <th style={{ textAlign: "right", padding: "8px 0", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500 }}>Match</th>
          </tr>
        </thead>
        <tbody>
          {CANDIDATES.map((c) => (
            <tr key={c.name} style={{ borderBottom: "1px solid #E5E5E5" }}>
              <td style={{ padding: "12px 0" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "'JetBrains Mono', monospace" }}>{c.company}</div>
              </td>
              <td style={{ padding: "12px 0", fontSize: 13 }}>{c.title}</td>
              <td style={{ padding: "12px 0", textAlign: "right", fontSize: 28, fontWeight: 800, color: c.score >= 90 ? "#0047AB" : "#000", fontVariantNumeric: "tabular-nums" }}>{c.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────── 05 · Duolingo Confidence ─────────────────────── */
function DuoPreview() {
  return (
    <div style={{ background: "white", color: "#3C3C3C", padding: 28, fontFamily: "'Nunito', 'Feather Bold', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 4, fontWeight: 700 }}>YOU'RE ON A 5-DAY STREAK 🔥</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#3C3C3C" }}>Your Pipeline</div>
        </div>
        <button style={{ background: "#58CC02", color: "white", padding: "12px 20px", fontSize: 14, borderRadius: 16, fontWeight: 800, boxShadow: "0 4px 0 #4CAD00", border: "none", letterSpacing: "0.05em", textTransform: "uppercase" }}>+ NEW ROLE</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { l: "OPEN ROLES", v: "4", c: "#1CB0F6" },
          { l: "CANDIDATES", v: "148", c: "#58CC02" },
          { l: "SHORTLISTED", v: "23", c: "#FFC800" },
          { l: "OFFERED", v: "3", c: "#FF4B4B" },
        ].map((k) => (
          <div key={k.l} style={{ background: "white", border: `2px solid ${k.c}`, boxShadow: `0 3px 0 ${k.c}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#777", fontWeight: 800, letterSpacing: "0.06em", marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: k.c, lineHeight: 1 }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CANDIDATES.map((c) => (
          <div key={c.name} style={{ background: "white", border: "2px solid #E5E5E5", borderBottom: "4px solid #E5E5E5", borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #1CB0F6, #58CC02)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16 }}>{c.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "#777" }}>{c.title} · {c.company}</div>
            </div>
            <div style={{ background: "#FFF3B0", color: "#946800", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>{c.stage}</div>
            <div style={{ background: "#58CC02", color: "white", padding: "6px 12px", borderRadius: 12, fontSize: 15, fontWeight: 800, minWidth: 48, textAlign: "center", boxShadow: "0 2px 0 #4CAD00" }}>{c.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── 06 · Stripe / Vercel Ship ─────────────────────── */
function StripePreview() {
  return (
    <div style={{ background: "white", color: "#0A2540", padding: 0, fontFamily: "'Söhne', 'Inter', sans-serif", overflow: "hidden" }}>
      {/* Gradient hero band */}
      <div style={{ background: "linear-gradient(135deg, #00D4FF 0%, #635BFF 50%, #FF6B9D 100%)", padding: "24px 28px", color: "white", position: "relative" }}>
        <div style={{ fontSize: 10, fontFamily: "'Berkeley Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.85, marginBottom: 6 }}>talent · dashboard</div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>Talent pipeline</div>
        <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>148 candidates across 4 open roles.</div>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
          {KPIS.map((k) => (
            <div key={k.label} style={{ background: "white", border: "1px solid #EEF0F3", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontFamily: "'Berkeley Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#697386", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#0A2540", letterSpacing: "-0.02em" }}>{k.value}</div>
            </div>
          ))}
        </div>
        <div style={{ border: "1px solid #EEF0F3", borderRadius: 10, overflow: "hidden" }}>
          {CANDIDATES.map((c, i) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", padding: 14, gap: 12, borderTop: i > 0 ? "1px solid #EEF0F3" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #635BFF, #00D4FF)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#0A2540" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#697386" }}>{c.title}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {["React", "TypeScript"].map((s) => (
                  <span key={s} style={{ fontSize: 10, fontFamily: "'Berkeley Mono', monospace", background: "#F6F9FC", color: "#635BFF", padding: "3px 7px", borderRadius: 4, border: "1px solid #EAF0F6" }}>{s}</span>
                ))}
              </div>
              <div style={{ fontSize: 11, background: "#EDFDF3", color: "#0A6640", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }}>{c.stage}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#635BFF", minWidth: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
