import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { HRDashboard } from '../pages/hr/Dashboard.js';
import { HRPreferences } from '../pages/hr/Preferences.js';
import { HRRoleDashboard } from '../pages/hr/RoleDashboard.js';
import { HRTalentPools } from '../pages/hr/TalentPools.js';
import { HRCompare } from '../pages/hr/Compare.js';
import { auth, signInWithGoogle } from '../lib/firebase.js';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { AuthOverlay } from '../components/AuthOverlay.js';
import { AnimatePresence } from 'motion/react';
import { createSession } from '../lib/api.js';
import { DevBugReporter } from '../components/DevBugReporter.js';

export function HRLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasSkippedSignIn, setHasSkippedSignIn] = useState(() => {
    return sessionStorage.getItem('hasSkippedSignIn') === 'true';
  });
  const [creating, setCreating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [isDevMode, setIsDevMode] = useState(() => localStorage.getItem('developer_mode') === 'true');
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        const nextMode = !isDevMode;
        localStorage.setItem('developer_mode', nextMode ? 'true' : 'false');
        setIsDevMode(nextMode);
        alert(nextMode ? 'Developer Mode Enabled!' : 'Developer Mode Disabled.');
        return 0;
      }
      return next;
    });
  };

  useEffect(() => {
    if (logoClicks > 0) {
      const timer = setTimeout(() => setLogoClicks(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [logoClicks]);

  const handleSandboxSignIn = () => {
    localStorage.setItem('uat_bypass_user', 'true');
    setUser({
      uid: 'uat-test-user-id',
      email: 'uat-tester@example.com',
      displayName: 'UAT Tester',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
      getIdToken: async () => 'uat-test-token-76839210-9b37-4d76-88d4-539c94b7f83e'
    } as any);
  };

  const handleSkipSignIn = () => {
    setHasSkippedSignIn(true);
    sessionStorage.setItem('hasSkippedSignIn', 'true');
  };

  const handleSignOut = async () => {
    localStorage.removeItem('uat_bypass_user');
    sessionStorage.removeItem('hasSkippedSignIn');
    setHasSkippedSignIn(false);
    setUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setAuthLoading(false); }, 3000);

    if (localStorage.getItem('uat_bypass_user') === 'true') {
      setUser({
        uid: 'uat-test-user-id',
        email: 'uat-tester@example.com',
        displayName: 'UAT Tester',
        getIdToken: async () => 'uat-test-token-76839210-9b37-4d76-88d4-539c94b7f83e'
      } as any);
      setAuthLoading(false);
      clearTimeout(timer);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (cancelled) return;
        setUser(u);
        setAuthLoading(false);
        clearTimeout(timer);
      });
      return () => { cancelled = true; clearTimeout(timer); unsubscribe(); };
    } catch (e) {
      console.warn("Firebase auth initialization failed:", e);
      if (!cancelled) setAuthLoading(false);
      clearTimeout(timer);
    }
  }, []);

  const isRouteActive = (path: string) => {
    if (path === '/hr' && location.pathname === '/hr') return true;
    if (path !== '/hr' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleNewRole = async () => {
    try {
      setCreating(true);
      const res = await createSession({ name: "New Role", roleType: "General", experienceTier: "Mid-Level" });
      navigate(`/hr/role/${res.sessionId}/setup`);
    } catch (err: any) {
      console.error("Failed to create role", err);
      alert(`Failed to create role: ${err.message || 'Database connection error'}`);
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) return <div className="bg-background h-screen w-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;

  return (
    <div className="bg-background text-on-surface font-body antialiased flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      
      <AnimatePresence>
        {!user && !hasSkippedSignIn && (
          <AuthOverlay
            onLogin={async () => {
              try {
                setAuthError(null);
                await signInWithGoogle();
              } catch (err: any) {
                const msg = err?.message || err?.code || '';
                setAuthError('Google Sign-In is not configured for this domain. Automatically switching to Sandbox/Demo mode...');
                setTimeout(() => {
                  handleSandboxSignIn();
                  setAuthError(null);
                }, 2000);
              }
            }}
            onSkip={handleSkipSignIn}
            onSandboxLogin={handleSandboxSignIn}
            error={authError}
          />
        )}
      </AnimatePresence>
      
      {/* SideNavBar */}
      <nav className="hidden md:flex bg-surface-container-low text-primary text-on-surface docked fixed left-0 top-0 h-screen w-64 border-r border-outline-variant flex-col py-6 px-4 gap-2 z-40">
        <div 
          onClick={handleLogoClick}
          className="mb-6 px-2 flex flex-col gap-2 cursor-pointer select-none group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-105 transition-transform animate-float-1">
              <span className="material-symbols-outlined text-lg" data-icon="hub">hub</span>
            </div>
            <div>
              <h1 className="text-sm font-headline font-bold text-on-surface tracking-tight leading-none">TalentMatch AI</h1>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Recruitment Engine</p>
            </div>
          </div>
          
          {isDevMode && (
            <div className="mt-1 px-2.5 py-1 rounded bg-primary-container text-primary text-[10px] font-mono border border-primary/20 flex items-center gap-1.5 w-fit animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              DEV MODE ACTIVE
            </div>
          )}
        </div>

        {/* New Request Button */}
        <div className="px-2 mb-4">
          <button 
            onClick={handleNewRole} 
            disabled={creating}
            className="w-full bg-primary text-on-primary px-4 py-2.5 rounded-md font-medium hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(167,139,250,0.15)] disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">{creating ? "sync" : "add"}</span>
            {creating ? "Creating..." : "New Request"}
          </button>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <Link to="/hr/pools" className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group ${isRouteActive('/hr/pools') ? 'bg-primary-container text-primary border-l-2 border-primary font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
            <span className="material-symbols-outlined text-lg" data-icon="group">group</span>
            <span className="text-sm">Talent Pools</span>
          </Link>
          <Link to="/hr" className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group ${isRouteActive('/hr') && !isRouteActive('/hr/pools') && !isRouteActive('/hr/compare') && !isRouteActive('/hr/analytics') && !isRouteActive('/hr/settings') ? 'bg-primary-container text-primary border-l-2 border-primary font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
            <span className="material-symbols-outlined text-lg" data-icon="work" data-weight={isRouteActive('/hr') && !isRouteActive('/hr/pools') && !isRouteActive('/hr/compare') && !isRouteActive('/hr/analytics') && !isRouteActive('/hr/settings') ? "fill" : "outline"} style={{ fontVariationSettings: isRouteActive('/hr') && !isRouteActive('/hr/pools') && !isRouteActive('/hr/compare') && !isRouteActive('/hr/analytics') && !isRouteActive('/hr/settings') ? "'FILL' 1" : "'FILL' 0" }}>work</span>
            <span className="text-sm">Active Roles</span>
          </Link>
          <Link to="/hr/compare" className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group ${isRouteActive('/hr/compare') ? 'bg-primary-container text-primary border-l-2 border-primary font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
            <span className="material-symbols-outlined text-lg" data-icon="compare_arrows">compare_arrows</span>
            <span className="text-sm">Compare</span>
          </Link>
          <Link to="/hr/analytics" className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group ${isRouteActive('/hr/analytics') ? 'bg-primary-container text-primary border-l-2 border-primary font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
            <span className="material-symbols-outlined text-lg" data-icon="analytics">analytics</span>
            <span className="text-sm">Analytics</span>
          </Link>
          <Link to="/hr/settings" className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group ${isRouteActive('/hr/settings') ? 'bg-primary-container text-primary border-l-2 border-primary font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
            <span className="material-symbols-outlined text-lg" data-icon="settings">settings</span>
            <span className="text-sm">Settings</span>
          </Link>
          
          {/* Bottom Help & Docs items */}
          <div className="mt-auto border-t border-outline-variant pt-4 flex flex-col gap-1">
            <Link to="/hr/help" className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200 group ${isRouteActive('/hr/help') ? 'bg-primary-container text-primary border-l-2 border-primary font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
              <span className="material-symbols-outlined text-lg" data-icon="help">help</span>
              <span className="text-sm">Help</span>
            </Link>
            <Link to="/hr/docs" className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200 group ${isRouteActive('/hr/docs') ? 'bg-primary-container text-primary border-l-2 border-primary font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
              <span className="material-symbols-outlined text-lg" data-icon="description">description</span>
              <span className="text-sm">Docs</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 h-full relative">
        
        {/* TopNavBar */}
        <header className="bg-surface-container text-primary text-on-surface font-body antialiased docked full-width top-0 border-b border-outline-variant flex justify-between items-center w-full px-6 h-16 z-50 sticky shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-on-surface-variant hover:text-on-surface p-2 rounded hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined" data-icon="menu">menu</span>
            </button>
            <div className="md:hidden flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">robot_2</span>
              <span className="text-xl font-headline font-black tracking-tight text-on-surface">TalentMatch AI</span>
            </div>
            
            {/* Search Bar */}
            <div className="hidden md:flex items-center relative w-96">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-sm">search</span>
              <input className="w-full bg-surface-container-low border border-outline-variant rounded-md py-1.5 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder={location.pathname.includes('/compare') ? "Search candidates..." : "Search..."} type="text"/>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-on-surface-variant hover:text-on-surface p-2 rounded hover:bg-surface-container-highest transition-colors active:scale-[0.98] relative flex items-center justify-center">
              <span className="material-symbols-outlined text-xl" data-icon="notifications">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border border-surface-container"></span>
            </button>
            
            <button className="text-on-surface-variant hover:text-on-surface p-2 rounded hover:bg-surface-container-highest transition-colors active:scale-[0.98] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl" data-icon="history">history</span>
            </button>
            
            <div className="h-4 w-[1px] bg-outline-variant"></div>
            
            <a href="#support" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium">Support</a>
            
            <button className="border border-outline-variant text-on-surface hover:bg-surface-container-high px-4 py-1.5 rounded text-xs font-semibold transition-colors">
              Invite Team
            </button>

            <button 
              onClick={handleSignOut}
              className="border border-outline-variant text-on-surface hover:bg-surface-container-high px-4 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              Sign Out
            </button>
            
            {user && (
              <div className="flex items-center gap-2.5 pl-2 border-l border-outline-variant/60">
                <span className="text-xs font-semibold text-on-surface hidden sm:inline">
                  {user.displayName || user.email || 'Recruiter'}
                </span>
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-outline-variant overflow-hidden flex items-center justify-center text-primary font-bold text-xs shrink-0 select-none shadow-sm">
                  {user.photoURL ? (
                    <img alt={user.displayName || 'Profile'} className="w-full h-full object-cover" src={user.photoURL} referrerpolicy="no-referrer" />
                  ) : (
                    <span>{(user.displayName || user.email || 'R').charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Routes>
            <Route path="/" element={<HRDashboard />} />
            <Route path="/role/:id" element={<HRRoleDashboard />} />
            <Route path="/role/:id/setup" element={<HRPreferences />} />
            <Route path="/pools" element={<HRTalentPools />} />
            <Route path="/compare" element={<HRCompare />} />
            <Route path="/analytics" element={<div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined text-4xl mb-4 block animate-pulse">analytics</span><h2 className="text-xl font-headline font-bold text-on-surface mb-2">Analytics</h2><p>This module is coming soon in the next update.</p></div>} />
            <Route path="/settings" element={<div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined text-4xl mb-4 block animate-pulse">settings</span><h2 className="text-xl font-headline font-bold text-on-surface mb-2">Settings</h2><p>This module is coming soon in the next update.</p></div>} />
            <Route path="/help" element={<div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined text-4xl mb-4 block text-primary">help</span><h2 className="text-xl font-headline font-bold text-on-surface mb-2">Help Center</h2><p>Contact support or search our documentation.</p></div>} />
            <Route path="/docs" element={<div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined text-4xl mb-4 block text-primary">description</span><h2 className="text-xl font-headline font-bold text-on-surface mb-2">Developer Docs</h2><p>Learn about TalentMatch API and workflows.</p></div>} />
          </Routes>
        </main>
      </div>

      <DevBugReporter isDevMode={isDevMode} setIsDevMode={setIsDevMode} />
    </div>
  );
}
