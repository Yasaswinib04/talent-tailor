import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Globe } from 'lucide-react';

interface AuthOverlayProps {
  onLogin: () => void;
  onSkip: () => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLogin, onSkip }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col items-center p-12 text-center space-y-10 border border-white"
    >
      <div className="h-24 w-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center rotate-6 shadow-2xl shadow-indigo-100 relative group">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-transparent opacity-20 group-hover:opacity-40 transition-opacity" />
        <ShieldCheck className="h-10 w-10 text-white relative z-10" />
      </div>

      <div className="space-y-4">
        <h2 className="display-serif text-4xl font-normal text-slate-900 tracking-tight italic">The Future of Vetting.</h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto font-sans opacity-80">
          Access specialized role intelligence and precision matchmaking in your private workspace.
        </p>
      </div>

      <div className="w-full space-y-4 max-w-sm">
        <button
          onClick={onLogin}
          className="w-full h-16 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl text-xs"
        >
          <Globe className="h-5 w-5 opacity-40" /> Sign In with Google
        </button>
        <button
          onClick={onSkip}
          className="w-full h-16 bg-white border-2 border-slate-100 text-slate-400 font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all text-[10px]"
        >
          Continue as Guest
        </button>
      </div>

      <div className="flex items-center gap-4 py-2">
        <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="mono-label text-[9px] opacity-40">System Online</span>
      </div>
    </motion.div>
  </div>
);
