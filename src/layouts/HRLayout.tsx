import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Settings, LayoutDashboard } from 'lucide-react';
import { HRDashboard } from '../pages/hr/Dashboard';
import { HRPreferences } from '../pages/hr/Preferences';

export function HRLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground dark font-sans">
      {/* Obsidian Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shadow-2xl">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tighter text-primary uppercase italic">Intelligence</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">HR Command Center</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link to="/hr" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/hr' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
            <LayoutDashboard size={18} />
            <span className="text-xs font-bold tracking-widest uppercase">Dashboard</span>
          </Link>
          <Link to="/hr/preferences" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/hr/preferences' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
            <Settings size={18} />
            <span className="text-xs font-bold tracking-widest uppercase">Preferences</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Link to="/candidate" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
            <Briefcase size={18} />
            <span className="text-xs font-bold tracking-widest uppercase">Candidate Portal</span>
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background p-8">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HRDashboard />} />
            <Route path="/preferences" element={<HRPreferences />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}
