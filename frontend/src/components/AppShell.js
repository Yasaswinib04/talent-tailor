import React, { useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LayoutGrid, Briefcase, Users, Plus, Search, Command, LogOut } from "lucide-react";
import { cx, clearAccessCode } from "../lib/api";

export default function AppShell() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex bg-app text-white">
      {/* Sidebar */}
      <aside className="w-56 border-r hairline flex flex-col shrink-0">
        <div className="px-5 py-6 border-b hairline">
          <div className="font-editorial text-2xl leading-none tracking-tight">
            cred<span className="text-brand">.</span>hr
          </div>
          <div className="font-mono-label mt-2">talent · engine</div>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          <SideLink to="/app" tab="overview" icon={<LayoutGrid size={16} />} label="Overview" testid="nav-overview" />
          <SideLink to="/app?tab=jobs" tab="jobs" icon={<Briefcase size={16} />} label="Roles" testid="nav-roles" />
          <SideLink to="/app?tab=candidates" tab="candidates" icon={<Users size={16} />} label="Candidates" testid="nav-candidates" />
        </nav>
        <div className="p-3 border-t hairline">
          <button
            onClick={() => nav("/app/jobs/new")}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors linear-glow"
            data-testid="sidebar-new-role-btn"
          >
            <span className="flex items-center gap-2"><Plus size={14} /> New role</span>
            <span className="kbd">N</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * NavLink can't distinguish these three links — they share the /app path and
 * differ only by query string — so match on the `tab` param ourselves.
 */
function SideLink({ to, tab, icon, label, testid }) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const isActive = pathname === "/app" && (params.get("tab") || "overview") === tab;
  return (
    <Link
      to={to}
      data-testid={testid}
      aria-current={isActive ? "page" : undefined}
      className={cx(
        "flex items-center gap-3 px-3 py-2 text-sm transition-colors border-l-2",
        isActive
          ? "bg-white/5 text-white border-brand"
          : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function TopBar() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const inputRef = useRef(null);

  // ⌘K / Ctrl-K focuses search. The badge used to be decorative.
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const search = (value) => {
    const next = new URLSearchParams(params);
    next.set("tab", "candidates");
    if (value) next.set("q", value);
    else next.delete("q");
    nav(`/app?${next.toString()}`);
  };

  const signOut = () => {
    clearAccessCode();
    window.location.assign("/app");
  };

  return (
    <div className="h-14 border-b hairline flex items-center px-6 gap-4">
      <div className="flex items-center gap-2 text-white/40 focus-within:text-white/70 transition-colors">
        <Search size={14} />
        <input
          ref={inputRef}
          type="search"
          defaultValue={params.get("q") || ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") search(e.currentTarget.value.trim());
            if (e.key === "Escape") e.currentTarget.blur();
          }}
          placeholder="Search candidates by name, company, skill…"
          className="bg-transparent placeholder:text-white/30 focus:outline-none text-sm w-96 text-white"
          data-testid="global-search-input"
        />
        <span className="kbd flex items-center gap-1"><Command size={10} /> K</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <span className="font-mono-label">recruiter · maya n.</span>
        <button
          onClick={signOut}
          data-testid="sign-out-btn"
          title="Lock this workspace"
          className="text-white/40 hover:text-white transition-colors"
        >
          <LogOut size={14} />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-gold" />
      </div>
    </div>
  );
}
