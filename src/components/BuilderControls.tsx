import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, X, Bug, Target, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

export const BuilderControls: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bugs' | 'roadmap'>('bugs');
  const [bugText, setBugText] = useState('');

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-200 flex items-center justify-center hover:scale-105 transition-transform border-4 border-white"
        title="Builder Controls"
      >
        <Wrench className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col border-l border-slate-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 tracking-tight uppercase italic text-lg">Builder Mode</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Internal Tools & Backlog</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex px-6 pt-6 border-b border-slate-100 bg-white gap-6">
                <button
                  onClick={() => setActiveTab('bugs')}
                  className={cn(
                    "pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
                    activeTab === 'bugs' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Bug className="h-4 w-4" /> Bug Reports
                </button>
                <button
                  onClick={() => setActiveTab('roadmap')}
                  className={cn(
                    "pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
                    activeTab === 'roadmap' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Target className="h-4 w-4" /> Product Backlog
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                <AnimatePresence mode="wait">
                  {activeTab === 'bugs' && (
                    <motion.div
                      key="bugs"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Log a Bug</h3>
                          <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-[9px] font-bold uppercase">Internal</span>
                        </div>
                        <textarea
                          value={bugText}
                          onChange={(e) => setBugText(e.target.value)}
                          placeholder="Describe what's broken or needs fixing..."
                          className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none placeholder:text-slate-400"
                        />
                        <button 
                          onClick={() => { if(bugText) { setBugText(''); alert('Bug logged to local backlog!'); } }}
                          disabled={!bugText}
                          className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                          Save to Backlog
                        </button>
                      </div>
                      
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-indigo-600">
                          <MessageSquare className="h-5 w-5" />
                          <h3 className="text-[10px] font-black uppercase tracking-widest">Global Support Config</h3>
                        </div>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">
                          This is the contact number displayed to users when they need support.
                        </p>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">💬</span>
                            <span>+1 (555) 123-4567</span>
                          </div>
                          <button className="text-[10px] font-black uppercase tracking-widest text-emerald-800 hover:text-emerald-900 underline">Edit</button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'roadmap' && (
                    <motion.div
                      key="roadmap"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <p className="text-xs font-medium text-slate-500 leading-relaxed bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        This backlog is strictly for builders. Manage your technical debt and upcoming features here.
                      </p>
                      {[
                        { status: 'Current Sprint', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', items: ['Global Market Expansion Profiles', 'Fix UI overflow on mobile', 'Implement Builder Mode FAB'] },
                        { status: 'Next Up', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', items: ['Apply Autopilot Beta', 'Chrome Extension Integration', 'Direct Workday Push'] },
                        { status: 'Backlog', color: 'text-slate-600', bg: 'bg-white', border: 'border-slate-200', items: ['Interview Prep Agent', 'Compensation Negotiation AI', 'User Auth flows'] }
                      ].map((phase, i) => (
                        <div key={i} className={`p-6 rounded-3xl border ${phase.bg} ${phase.border} space-y-4`}>
                          <div className={`text-[10px] font-black uppercase tracking-widest ${phase.color}`}>
                            {phase.status}
                          </div>
                          <ul className="space-y-3">
                            {phase.items.map((item, j) => (
                              <li key={j} className="flex items-start gap-3">
                                <div className={`mt-1 h-1.5 w-1.5 rounded-full ${phase.color} opacity-50 shrink-0`} />
                                <span className="text-sm font-bold text-slate-700 leading-tight">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
