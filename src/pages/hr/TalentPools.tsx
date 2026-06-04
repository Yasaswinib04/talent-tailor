import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TalentPoolList } from '../../components/hr/TalentPoolList';
import { getSessions } from '../../lib/api.js';

export interface EvaluationEntry {
  roleName: string;
  roleId: string;
  status: string;
  statusColor: string;
  score: number;
}

export interface PoolCandidate {
  id: string;
  name: string;
  skills: { name: string; color: string }[];
  evaluationHistory: EvaluationEntry[];
  globalStatus: string;
  globalStatusColor: string;
  isLegacy: boolean;
  date: string;
}

const SKILL_COLORS = [
  'bg-primary/20 text-primary border-primary/30',
  'bg-secondary/20 text-secondary border-secondary/30',
  'bg-tertiary/20 text-tertiary border-tertiary/30',
  'bg-error/10 text-error border-error/20',
  'bg-secondary-container text-on-surface-variant border-outline-variant',
];

function cleanFilename(fname: string): string {
  return fname
    .replace(/^[\w-]+-/, '')
    .replace(/\.(pdf|docx?)$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getStatusForScore(score: number): { status: string; color: string } {
  if (score >= 7) return { status: 'Top Match', color: 'bg-tertiary/10 text-tertiary border-tertiary/20' };
  if (score >= 5) return { status: 'Reviewing', color: 'bg-error/10 text-error border-error/20' };
  return { status: 'Low Match', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
}

function extractCandidatesFromSessions(sessions: any[]): PoolCandidate[] {
  const map = new Map<string, PoolCandidate>();

  for (const session of sessions) {
    const jp = session.job_profile || {};
    const roleName = jp.name || 'Untitled Role';
    const candidates = Array.isArray(session.analysis_results?.candidates)
      ? session.analysis_results.candidates
      : Array.isArray(session.analysis_results)
        ? session.analysis_results
        : Array.isArray(session.analysisResults?.candidates)
          ? session.analysisResults.candidates
          : [];

    for (const c of candidates) {
      if (c.preFiltered) continue;
      const key = c.name || c.email || 'unknown';
      const entry = getStatusForScore(c.score || 0);
      const evalEntry: EvaluationEntry = {
        roleName,
        roleId: session.id,
        status: entry.status,
        statusColor: entry.color,
        score: c.score || 0,
      };

      if (map.has(key)) {
        const existing = map.get(key)!;
        const exists = existing.evaluationHistory.some(e => e.roleId === session.id);
        if (!exists) existing.evaluationHistory.push(evalEntry);
      } else {
        const competencies = (c.competencies || []).slice(0, 6);
        map.set(key, {
          id: `cand-${key.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: c.name || 'Unknown',
          skills: competencies.map((comp: any, i: number) => ({
            name: comp.name || comp,
            color: SKILL_COLORS[i % SKILL_COLORS.length],
          })),
          evaluationHistory: [evalEntry],
          globalStatus: 'Active in Pipeline',
          globalStatusColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          isLegacy: false,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        });
      }
    }

    const uploadedFiles = session.uploadedFiles || session.uploaded_files || [];
    if (candidates.length === 0 && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const fname = file.fileName || file.name || '';
        if (!fname) continue;
        const key = cleanFilename(fname);
        const evalEntry: EvaluationEntry = {
          roleName,
          roleId: session.id,
          status: 'Pending Analysis',
          statusColor: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
          score: 0,
        };

        if (map.has(key)) {
          const existing = map.get(key)!;
          const exists = existing.evaluationHistory.some(e => e.roleId === session.id);
          if (!exists) existing.evaluationHistory.push(evalEntry);
        } else {
          map.set(key, {
            id: `legacy-${key.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: key,
            skills: [],
            evaluationHistory: [evalEntry],
            globalStatus: 'Available',
            globalStatusColor: 'bg-surface-container-low text-on-surface-variant border-outline-variant',
            isLegacy: true,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          });
        }
      }
    }
  }

  const result = Array.from(map.values());

  for (const c of result) {
    const hasActive = c.evaluationHistory.some(e => e.status === 'Top Match' || e.status === 'Reviewing');
    if (!hasActive) {
      c.globalStatus = 'Available';
      c.globalStatusColor = 'bg-surface-container-low text-on-surface-variant border-outline-variant';
    }
  }

  return result.sort((a, b) => {
    if (a.isLegacy && !b.isLegacy) return 1;
    if (!a.isLegacy && b.isLegacy) return -1;
    return b.evaluationHistory.length - a.evaluationHistory.length;
  });
}

export function HRTalentPools() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const loadCandidates = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data || []);
      const pool = extractCandidatesFromSessions(data || []);
      setCandidates(pool);
    } catch (err) {
      console.error('Failed to load candidates for talent pool:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background relative overflow-hidden">
      {candidates.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-background">
          <div className="w-16 h-16 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-2xl">group</span>
          </div>
          <h3 className="text-lg font-headline font-bold text-on-surface mb-2">No Candidates in Pool</h3>
          <p className="text-sm text-on-surface-variant max-w-md leading-relaxed">
            The talent pool shows candidates from completed role analyses. Upload and analyze resumes through a Role Dashboard to populate the pool.
          </p>
        </div>
      ) : (
        <TalentPoolList
          candidates={candidates}
          sessions={sessions}
          onRefresh={loadCandidates}
          onNavigateToRole={(roleId) => navigate(`/hr/role/${roleId}`)}
        />
      )}
    </div>
  );
}
