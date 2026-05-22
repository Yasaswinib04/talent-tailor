import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  Target, 
  BrainCircuit, 
  Zap,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';

const steps = [
  {
    icon: FileUp,
    title: "Drop & Extract",
    description: "Upload your resume; our agents extract deep STAR evidence automatically.",
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    icon: Target,
    title: "Job Vetting",
    description: "Paste a JD to run a neural alignment audit against global hiring standards.",
    color: "text-emerald-600",
    bg: "bg-emerald-50"
  },
  {
    icon: BrainCircuit,
    title: "Gap Analysis",
    description: "AI identifies strategic missing keywords and experience vectors.",
    color: "text-amber-600",
    bg: "bg-amber-50"
  },
  {
    icon: Zap,
    title: "Autopilot Tailoring",
    description: "One-click generate a high-performance, tailored resume.",
    color: "text-rose-600",
    bg: "bg-rose-50"
  }
];

export const WorkflowCarousel: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [index]); // Reset timer when index changes manually

  const nextSlide = () => setIndex((prev) => (prev + 1) % steps.length);
  const prevSlide = () => setIndex((prev) => (prev - 1 + steps.length) % steps.length);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-md p-6 lg:p-10 shadow-sm overflow-hidden relative group">
      <div className="flex items-center gap-6 lg:gap-16 px-4">
        
        {/* Left Nav Button */}
        <button 
          onClick={prevSlide}
          className="h-10 w-10 shrink-0 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-primary hover:border-indigo-200 transition-all z-10 hidden md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-8"
            >
              <div className={cn("p-6 rounded-md shrink-0", steps[index].bg)}>
                {React.createElement(steps[index].icon, { className: cn("h-10 w-10", steps[index].color) })}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Protocol Step {index + 1}</span>
                  <div className="h-px w-12 bg-slate-200" />
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{steps[index].title}</h3>
                </div>
                <p className="text-base text-slate-500 font-medium leading-relaxed max-w-2xl">
                  {steps[index].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Nav Button & Dots Container */}
        <div className="flex items-center gap-8 shrink-0">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 transition-all duration-500 rounded-full",
                  index === i ? "w-10 bg-primary" : "w-2 bg-slate-200"
                )}
              />
            ))}
          </div>

          <button 
            onClick={nextSlide}
            className="h-10 w-10 shrink-0 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-primary hover:border-indigo-200 transition-all z-10 hidden md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
