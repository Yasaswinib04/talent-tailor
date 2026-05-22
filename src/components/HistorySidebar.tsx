import React, { useState } from 'react';
import { ChevronRight, History, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AnalysisResult } from '../types';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistorySidebarProps {
  history: AnalysisResult[];
  onSelect: (item: AnalysisResult) => void;
  activeAnalysisId?: string;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  history,
  onSelect,
  activeAnalysisId
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Overlay for mobile/tablet when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) when Closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-8 right-8 h-16 w-16 bg-slate-900 rounded-full shadow-2xl shadow-slate-900/20 flex items-center justify-center text-white hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all z-40"
          >
            <History className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div 
        initial={false}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="fixed top-0 right-0 h-screen w-80 bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white pt-8 lg:pt-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Analyses</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-[9px]">{history.length}</Badge>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-4 bg-white border rounded-md transition-all group text-left",
                  activeAnalysisId === item.id 
                    ? "border-primary shadow-lg shadow-primary/20" 
                    : "border-slate-100 hover:border-indigo-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0",
                    activeAnalysisId === item.id ? "bg-primary text-white" : "bg-slate-50 text-primary"
                  )}>
                    {(item.candidates[0]?.score || 0).toFixed(1)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{item.role}</p>
                    <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">{item.candidates[0]?.name}</p>
                  </div>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-all shrink-0",
                  activeAnalysisId === item.id ? "text-primary translate-x-1" : "text-slate-200 group-hover:text-indigo-400"
                )} />
              </button>
            ))}
            {history.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <History className="h-10 w-10 text-slate-100 mx-auto" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                  No historical data<br/>found in node.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </>
  );
};
