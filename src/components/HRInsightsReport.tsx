import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Target, 
  TrendingUp, 
  AlertCircle,
  Briefcase,
  Layers
} from 'lucide-react';
import { AnalysisResult } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HRInsightsReportProps {
  analysis: AnalysisResult;
}

export const HRInsightsReport: React.FC<HRInsightsReportProps> = ({ analysis }) => {
  const candidates = analysis.candidates || [];
  const avgScore = candidates.length > 0 
    ? candidates.reduce((acc, c) => acc + c.score, 0) / candidates.length 
    : 0;
  const highFitCount = candidates.filter(c => c.score >= 8).length;
  const riskCount = candidates.filter(c => c.meetsMandatoryCriteria === false).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-white shadow-lg">
          <TrendingUp className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Intelligence Insights</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="rounded-md border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Users className="h-3 w-3" /> Pipeline Health
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <div className="text-3xl font-black text-slate-900 tracking-tighter">{avgScore.toFixed(1)}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg Match Delta</div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-xl font-black text-primary tracking-tighter">{candidates.length}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nodes Processed</div>
              </div>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${avgScore * 10}%` }}
                className="h-full bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-emerald-50 rounded-md border border-emerald-100 space-y-2">
            <div className="text-emerald-700">
              <Target className="h-4 w-4" />
            </div>
            <div className="text-xl font-black text-emerald-900 leading-none">{highFitCount}</div>
            <div className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest">High-Fit Candidates</div>
          </div>
          <div className="p-5 bg-rose-50 rounded-md border border-rose-100 space-y-2">
            <div className="text-rose-700">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="text-xl font-black text-rose-900 leading-none">{riskCount}</div>
            <div className="text-[8px] font-black text-rose-600/60 uppercase tracking-widest">Hard Criteria Gaps</div>
          </div>
        </div>

        <Card className="rounded-md border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Briefcase className="h-3 w-3" /> Talent Track Distribution
            </div>
            <div className="space-y-3">
              {['IC', 'Manager'].map(track => {
                const count = candidates.filter(c => (c as any).track === track).length;
                const percentage = candidates.length > 0 ? (count / candidates.length) * 100 : 0;
                return (
                  <div key={track} className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold uppercase">
                      <span>{track === 'IC' ? 'Individual Contributor' : 'Leadership/Management'}</span>
                      <span className="text-slate-400">{count}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-slate-900"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="p-6 bg-indigo-900 rounded-md text-white space-y-4 shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Layers className="h-16 w-16" />
          </div>
          <div className="relative z-10">
            <div className="text-[8px] font-black uppercase tracking-widest text-indigo-300 mb-1">Intelligence Recommendation</div>
            <p className="text-xs font-bold leading-relaxed italic opacity-90">
              {avgScore >= 7 
                ? "The pipeline is strong. Focus on the Top 3 candidates for technical deep-dives." 
                : "Match quality is below threshold. Consider broadening the domain search parameters."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
