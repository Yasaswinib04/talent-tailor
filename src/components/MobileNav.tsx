import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  LayoutDashboard, 
  User, 
  Sliders, 
  Target, 
  RefreshCw, 
  HelpCircle, 
  ChevronRight, 
  History, 
  Globe 
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Persona, RoleType, ExperienceTier, AnalysisResult } from '../types';
import { TIER_CONFIG } from '../constants/roles';
import { cn } from '../lib/utils';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (t: any) => void;
  persona: Persona;
  setPersona: (p: Persona) => void;
  tier: ExperienceTier;
  setTier: (t: ExperienceTier) => void;
  history: AnalysisResult[];
  onSelectHistory: (item: AnalysisResult) => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  selectedFeatures: string[];
  setSelectedFeatures: (f: string[]) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  persona,
  setPersona,
  tier,
  setTier,
  history,
  onSelectHistory,
  user,
  onLogin,
  onLogout,
  selectedFeatures,
  setSelectedFeatures
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] lg:hidden"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white z-[90] lg:hidden shadow-2xl flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600 font-black text-xl italic tracking-tighter">
              <ShieldCheck className="h-6 w-6" /> T.E.P
            </div>
            <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* Persona Switcher */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Mode</div>
                <Tabs value={persona} onValueChange={(v) => setPersona(v as Persona)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 p-1 bg-slate-100">
                    <TabsTrigger value="candidate" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-none transition-all">
                      Candidate
                    </TabsTrigger>
                    <TabsTrigger value="hr" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-none transition-all">
                      HR Expert
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Tier Selection */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Experience</div>
                <Select value={tier} onValueChange={(v) => setTier(v as ExperienceTier)}>
                  <SelectTrigger className="w-full h-12 text-xs font-bold bg-white border-slate-200 rounded-2xl">
                    <SelectValue placeholder="Experience Bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(TIER_CONFIG).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs font-medium">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Main Nav */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navigation</div>
                <nav className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                    { id: 'portfolio', icon: User, label: 'Portfolio', show: persona === 'candidate' },
                    { id: 'preferences', icon: Sliders, label: 'Settings', show: persona === 'hr' },
                  ].filter(tab => tab.show !== false).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        onClose();
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                        activeTab === tab.id
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                          : "bg-white border-slate-100 text-slate-500"
                      )}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Analyses</div>
                  <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px]">{history.length}</Badge>
                </div>
                <div className="space-y-2">
                  {history.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectHistory(item);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                          {(item.candidates[0]?.score || 0).toFixed(1)}
                        </div>
                        <div className="truncate">
                          <p className="text-[10px] font-bold text-slate-900 truncate uppercase tracking-tight">{item.role}</p>
                          <p className="text-[9px] text-slate-400 truncate">{item.candidates[0]?.name}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-3 w-3 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 mt-auto border-t border-slate-100 bg-slate-50/50">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={user.photoURL || ''} alt="User" className="h-10 w-10 rounded-full border-2 border-white shadow-sm" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{user.displayName}</p>
                    <button onClick={onLogout} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Logout</button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="w-full h-12 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Globe className="h-4 w-4" /> Sign In
              </button>
            )}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
