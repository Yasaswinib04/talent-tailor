import React from 'react';
import { 
  ShieldCheck, 
  User, 
  Users, 
  Sliders, 
  Globe, 
  Menu, 
  X,
  Target
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  Persona, 
  RoleType, 
  ExperienceTier 
} from '../types';
import { ROLE_WEIGHTS, TIER_CONFIG } from '../constants/roles';
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface HeaderProps {
  persona: Persona;
  setPersona: (p: Persona) => void;
  role: RoleType;
  setRole: (r: RoleType) => void;
  tier: ExperienceTier;
  setTier: (t: ExperienceTier) => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (o: boolean) => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  persona,
  setPersona,
  role,
  setRole,
  tier,
  setTier,
  user,
  onLogin,
  onLogout,
  onTabChange,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  historyCount
}) => (
  <header className="h-16 lg:h-20 border-b border-slate-200 bg-white px-4 lg:px-8 flex items-center justify-between shrink-0 z-50 sticky top-0">
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-indigo-600 font-black text-lg lg:text-xl tracking-tighter">
        <ShieldCheck className="h-6 w-6 lg:h-7 lg:w-7 stroke-[2.5]" />
        <span className="hidden sm:inline italic">TALENT ENGINE PRO</span>
        <span className="sm:hidden italic">T.E.P</span>
      </div>
      <Badge className="hidden md:flex bg-indigo-600 text-white border-none text-[8px] font-black rounded-lg px-2 py-0.5 uppercase tracking-tighter shrink-0">
        V2.6 • {persona}
      </Badge>
    </div>

    <div className="hidden lg:flex items-center gap-8">
      <Tabs value={persona} onValueChange={(v) => setPersona(v as Persona)} className="w-[300px]">
        <TabsList className="grid w-full grid-cols-2 rounded-full h-10 p-1 bg-slate-100">
          <TabsTrigger value="candidate" className="rounded-full text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg transition-all duration-300">
            <User className="h-3.5 w-3.5 mr-2" /> Candidate
          </TabsTrigger>
          <TabsTrigger value="hr" className="rounded-full text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg transition-all duration-300">
            <Users className="h-3.5 w-3.5 mr-2" /> HR Expert
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {persona === 'hr' && (
        <button
          onClick={() => onTabChange('preferences')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
        >
          <Sliders className="h-3.5 w-3.5" /> JD & Role Settings
        </button>
      )}
    </div>

    <div className="flex items-center gap-2 lg:gap-4">
      {/* Role Selector */}
      <div className="hidden sm:block">
        <Select value={role} onValueChange={(v) => setRole(v as RoleType)}>
          <SelectTrigger className="w-[140px] lg:w-[180px] h-9 text-xs font-bold bg-white border-slate-200 rounded-xl">
            <SelectValue placeholder="Select Role" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(ROLE_WEIGHTS).map((r) => (
              <SelectItem key={r} value={r} className="text-xs font-medium">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Experience Tier Selector */}
      <div className="hidden sm:block">
        <Select value={tier} onValueChange={(v) => setTier(v as ExperienceTier)}>
          <SelectTrigger className="w-[120px] lg:w-[150px] h-9 text-xs font-bold bg-indigo-50 border-indigo-100 text-indigo-700 rounded-xl">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3" />
              <SelectValue placeholder="Experience" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.keys(TIER_CONFIG).map((t) => (
              <SelectItem key={t} value={t} className="text-xs font-medium">
                {t} ({TIER_CONFIG[t as keyof typeof TIER_CONFIG].minExp}-{TIER_CONFIG[t as keyof typeof TIER_CONFIG].maxExp}y)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {user ? (
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{user.displayName?.split(' ')[0]}</span>
            <button onClick={onLogout} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 transition-all uppercase tracking-widest leading-none mt-1">Logout</button>
          </div>
          <div className="h-10 w-10 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm relative group">
            <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors" />
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} referrerPolicy="no-referrer" alt="Avatar" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : (
        <button
          onClick={onLogin}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Globe className="h-3.5 w-3.5" /> Login
        </button>
      )}

      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all relative"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        {!isMobileMenuOpen && historyCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {historyCount}
          </span>
        )}
      </button>
    </div>
  </header>
);
