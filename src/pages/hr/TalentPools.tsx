import React, { useState, useEffect } from 'react';
import { TalentPoolEmptyState } from '../../components/hr/TalentPoolEmptyState';
import { TalentPoolList } from '../../components/hr/TalentPoolList';
import { AddTalentModal } from '../../components/hr/AddTalentModal';
import { getSessions } from '../../lib/api.js';

interface PoolCandidate {
  id: string;
  name: string;
  role: string;
  skills: { name: string; color: string }[];
  source: string;
  date: string;
  status: string;
  statusColor: string;
}

const SKILL_COLORS = [
  'bg-primary/20 text-primary border-primary/30',
  'bg-secondary/20 text-secondary border-secondary/30',
  'bg-tertiary/20 text-tertiary border-tertiary/30',
  'bg-error/10 text-error border-error/20',
  'bg-secondary-container text-on-surface-variant border-outline-variant',
];

function extractCandidatesFromSessions(sessions: any[]): PoolCandidate[] {
  const pool: PoolCandidate[] = [];
  for (const session of sessions) {
    const candidates = Array.isArray(session.analysis_results?.candidates)
      ? session.analysis_results.candidates
      : Array.isArray(session.analysis_results)
        ? session.analysis_results
        : Array.isArray(session.analysisResults?.candidates)
          ? session.analysisResults.candidates
          : [];
    for (const c of candidates) {
      if (c.preFiltered) continue;
      const competencies = (c.competencies || []).slice(0, 3);
      pool.push({
        id: c.id || `pool-${pool.length}`,
        name: c.name || 'Unknown',
        role: c.roleType || c.role || 'Candidate',
        skills: competencies.map((comp: any, i: number) => ({
          name: comp.name || comp,
          color: SKILL_COLORS[i % SKILL_COLORS.length],
        })),
        source: 'Analysis',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: (c.score || 0) >= 7 ? 'Top Match' : 'Reviewing',
        statusColor: (c.score || 0) >= 7
          ? 'bg-tertiary/10 text-tertiary border-tertiary/20'
          : 'bg-error/10 text-error border-error/20',
      });
    }
  }
  return pool;
}

export function HRTalentPools() {
  const [hasTalent, setHasTalent] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const sessions = await getSessions();
        const pool = extractCandidatesFromSessions(sessions);
        setCandidates(pool);
        if (pool.length > 0) setHasTalent(true);
      } catch (err) {
        console.error('Failed to load candidates for talent pool:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCandidates();
  }, []);

  const handleAddTalentSuccess = () => {
    setHasTalent(true);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background relative overflow-hidden">
      {!hasTalent ? (
        <TalentPoolEmptyState onAddTalent={() => setIsModalOpen(true)} />
      ) : (
        <TalentPoolList onAddTalent={() => setIsModalOpen(true)} candidates={candidates} />
      )}

      <AddTalentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddSuccess={handleAddTalentSuccess}
      />
    </div>
  );
}
