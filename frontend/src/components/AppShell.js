import React, { useEffect, useRef } from "react";
import { Link, Outlet, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { LayoutGrid, Briefcase, Users, Plus, Search, Command, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth";

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

/** NavLink ignores query strings, so all three links matched "/app" at once and
 *  every one of them rendered as active. Match on the tab param instead. */
function SideLink({ to, tab, icon, label, testid }) {
  const location = useLocation();
  const [params] = useSearchParams();
  const current = params.get("tab") || "overview";
  const isActive = location.pathname === "/app" && current === tab;
  return (
    <Link
      to={to}
      data-testid={testid}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-white/5 text-white border-l-2 border-brand"
          : "text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function TopBar() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const searchRef = useRef(null);
  const q = params.get("q") || "";

  // Drives the dashboard's candidate filter through the URL, so the search is
  // shareable and survives a reload. It previously did nothing at all.
  const onSearch = (value) => {
    if (location.pathname !== "/app") {
      nav(value ? `/app?q=${encodeURIComponent(value)}` : "/app");
      return;
    }
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    setParams(next, { replace: true });
  };

  // The kbd hint promised a shortcut that was never wired up.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        searchRef.current.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const initials = (user?.name || user?.email || "?")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const onSignOut = async () => {
    await signOut();
    nav("/login", { replace: true });
  };

  return (
    <div className="h-14 border-b hairline flex items-center px-6 gap-4">
      <div className="flex items-center gap-2 text-white/40">
        <Search size={14} />
        <input
          ref={searchRef}
          type="text"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search candidates, roles, skills…"
          className="bg-transparent placeholder:text-white/30 focus:outline-none text-sm w-96"
          data-testid="global-search-input"
        />
        <span className="kbd flex items-center gap-1"><Command size={10} /> K</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <span className="font-mono-label" data-testid="topbar-user">
          {user ? `${user.role} · ${user.name}` : ""}
        </span>
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-gold flex items-center justify-center text-[11px] font-medium"
          title={user?.email}
        >
          {initials}
        </div>
        <button
          onClick={onSignOut}
          data-testid="signout-btn"
          title="Sign out"
          className="text-white/40 hover:text-white transition-colors"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}
