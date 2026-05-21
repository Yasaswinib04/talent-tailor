import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HiringPreferencesUI } from '../../components/HiringPreferencesUI';
import { JobProfile } from '../../types';

export function HRPreferences() {
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([
    {
      id: 'default',
      name: 'B2B Product Manager',
      role: 'Product Manager',
      jdContent: 'Seeking a Product Manager to lead SaaS initiatives...',
      preferences: { isTierIMandatory: false, isMBAMandatory: false, minExperienceYears: 3, preferredCompanies: [], mandatorySkills: ['Roadmap', 'Stakeholder Management'], topN: 20 }
    }
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto py-12 h-full"
    >
      <div className="mb-8">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-foreground">Preferences</h2>
        <p className="text-muted-foreground mt-2 font-mono text-sm tracking-wide">Configure protocols and rubrics for the intelligence engine.</p>
      </div>
      
      <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl">
        <HiringPreferencesUI
          profiles={jobProfiles}
          onUpdate={setJobProfiles}
        />
      </div>
    </motion.div>
  );
}
