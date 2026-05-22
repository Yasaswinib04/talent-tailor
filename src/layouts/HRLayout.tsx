import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { HRDashboard } from '../pages/hr/Dashboard.js';
import { HRPreferences } from '../pages/hr/Preferences.js';
import { HRRoleDashboard } from '../pages/hr/RoleDashboard.js';
import { HRTalentPools } from '../pages/hr/TalentPools.js';
import { auth, signInWithGoogle } from '../lib/firebase.js';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { AuthOverlay } from '../components/AuthOverlay.js';
import { AnimatePresence } from 'motion/react';

export function HRLayout() {
  const location = useLocation();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isRouteActive = (path: string) => {
    if (path === '/hr' && location.pathname === '/hr') return true;
    if (path !== '/hr' && location.pathname.startsWith(path)) return true;
    return false;
  };

  if (authLoading) return <div className="bg-background h-screen w-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;

  return (
    <div className="bg-background text-on-surface font-body antialiased flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      
      <AnimatePresence>
        {!user && (
          <AuthOverlay
            onLogin={async () => {
              await signInWithGoogle();
            }}
            onSkip={() => {}} // Remove skip capability for HR
          />
        )}
      </AnimatePresence>
      
      {/* SideNavBar */}
      <nav className="hidden md:flex bg-surface-container-low text-primary text-on-surface docked fixed left-0 top-0 h-screen w-64 border-r border-outline-variant flex-col py-6 px-4 gap-2 z-40">
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary-container/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined" data-icon="hub">hub</span>
          </div>
          <div>
            <h1 className="text-lg font-headline font-bold text-on-surface tracking-tight">TalentMatch AI</h1>
            <p className="text-xs text-on-surface-variant">Strategic Recruitment</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <Link to="/hr/pools" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group ${isRouteActive('/hr/pools') ? 'bg-secondary-container text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'}`}>
            <span className="material-symbols-outlined" data-icon="group">group</span>
            <span className="font-medium text-sm">Talent Pools</span>
          </Link>
          <Link to="/hr" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group ${isRouteActive('/hr') && !isRouteActive('/hr/pools') && !isRouteActive('/hr/analytics') && !isRouteActive('/hr/settings') ? 'bg-secondary-container text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'}`}>
            <span className="material-symbols-outlined" data-icon="work" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
            <span className="font-medium text-sm">Active Roles</span>
          </Link>
          <Link to="/hr/analytics" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group ${isRouteActive('/hr/analytics') ? 'bg-secondary-container text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'}`}>
            <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
            <span className="font-medium text-sm">Analytics</span>
          </Link>
          <Link to="/hr/settings" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group mt-auto ${isRouteActive('/hr/settings') ? 'bg-secondary-container text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'}`}>
            <span className="material-symbols-outlined" data-icon="settings">settings</span>
            <span className="font-medium text-sm">Settings</span>
          </Link>
        </div>

        {/* User Profile */}
        <div className="mt-4 pt-4 border-t border-outline-variant px-4 flex items-center gap-3 cursor-pointer hover:bg-surface-container-highest p-2 rounded-md transition-colors">
          <img alt="Company Logo" className="w-8 h-8 rounded-full border border-outline-variant object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxPoLHFzLGjlRteLnPBczYw3pG-fjUf2nncz8zYeWiK1hlhXoiEOdkr1oonTYnk_UbdsKy6a8bCPN5dU_xv-3n9qR8rbjLuTK1pvUUqnRFC-NsGFqgCZeivBmgN7qWM0u_ROEWpdghFDqK5weGBdm1QsGa11xTw-TiAyZlNjBUKe4gWYQcppTWjAZa2lpIOOHvUT9y7zjNTSbX8xVY6N16DinuXLw-aiai8dvZpbxpM0Rq8tc6NO6Fa2t42FbYV308G9hoM9UAMcbb" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">Jane Doe</p>
            <p className="text-xs text-on-surface-variant truncate">Recruitment Lead</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-sm">unfold_more</span>
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
              <input className="w-full bg-surface-container-low border border-outline-variant rounded py-1.5 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="Search candidates, skills, or roles (Cmd+K)" type="text"/>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="text-on-surface-variant hover:text-on-surface p-2 rounded hover:bg-surface-container-highest transition-colors active:scale-[0.98] relative">
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-surface-container"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-secondary-container border border-outline-variant overflow-hidden">
              <img alt="Recruiter Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCG4imHjCae9n9cYEVrEkgR35KdYFLBkBaAPM8LBbkAJKfhh_9_hKWXxsbOeIiiJzS3mleOYhpw64z_8YrIEUJguq2qxLiXJGl-jBGoOvVgDsc2nxBAcwz3ViLxGX7sZ9jCgSfjOowrCN-qKjvBeD_vrJH-0laScJ2OBAy7puEx8TibIVSiEvOOBIRSUpJaUbxGW-a8A5Hvvy8NAjvDbZynbk8DI040sezZPUQV8pngJ3WHj7x3HPJNx5WtR5CV3LsqEx2cQtujCaX-" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Routes location={location}>
            <Route path="/" element={<HRDashboard />} />
            <Route path="/role/:id" element={<HRRoleDashboard />} />
            <Route path="/role/:id/setup" element={<HRPreferences />} />
            <Route path="/pools" element={<HRTalentPools />} />
            <Route path="/analytics" element={<div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined text-4xl mb-4 block">analytics</span><h2 className="text-xl font-headline font-bold text-on-surface mb-2">Analytics</h2><p>This module is coming soon in the next update.</p></div>} />
            <Route path="/settings" element={<div className="p-12 text-center text-on-surface-variant"><span className="material-symbols-outlined text-4xl mb-4 block">settings</span><h2 className="text-xl font-headline font-bold text-on-surface mb-2">Settings</h2><p>This module is coming soon in the next update.</p></div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
