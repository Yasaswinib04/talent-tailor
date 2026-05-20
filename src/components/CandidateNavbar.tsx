import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, User as UserIcon, LogOut } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { RoleType } from '../types';
import { ROLE_WEIGHTS } from '../constants/roles';

interface CandidateNavbarProps {
  role: RoleType;
  setRole: (r: RoleType) => void;
  targetMarket: string;
  setTargetMarket: (m: string) => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const CandidateNavbar: React.FC<CandidateNavbarProps> = ({
  role,
  setRole,
  targetMarket,
  setTargetMarket,
  user,
  onLogin,
  onLogout
}) => {
  const markets = ['India', 'United States', 'Europe', 'Singapore', 'Middle East', 'Australia', 'Canada', 'UK'];

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
          <ShieldCheck className="h-7 w-7 stroke-[2.5]" />
          <span className="font-black text-lg tracking-tighter italic hidden sm:inline">Talent Engine Pro</span>
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
        <select 
          value={role}
          onChange={(e) => setRole(e.target.value as RoleType)}
          className="h-9 px-4 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer hover:bg-slate-50 max-w-[180px]"
        >
          {Object.keys(ROLE_WEIGHTS).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        
        <div className="h-6 w-px bg-slate-200" />

        <select
          value={targetMarket}
          onChange={(e) => setTargetMarket(e.target.value)}
          className="h-9 px-4 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer hover:bg-slate-50 max-w-[140px]"
        >
          {markets.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="h-6 w-6 rounded-full" />
              ) : (
                <div className="h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-3 w-3 text-indigo-600" />
                </div>
              )}
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">{user.displayName || 'User'}</span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="px-5 py-2 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-black transition-colors shadow-md"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};
