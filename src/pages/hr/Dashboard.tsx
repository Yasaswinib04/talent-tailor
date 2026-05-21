import React from 'react';
import { motion } from 'motion/react';

export function HRDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto space-y-12"
    >
      <div>
        <h2 className="text-4xl font-black tracking-tighter uppercase italic">Dashboard</h2>
        <p className="text-muted-foreground mt-2 font-mono text-sm tracking-wide">Manage bulk screening and candidate evaluation.</p>
      </div>
      
      <div className="bg-card text-card-foreground p-8 rounded-2xl border border-border shadow-xl">
         <p className="text-muted-foreground">Connecting to new secure backend APIs...</p>
      </div>
    </motion.div>
  );
}
