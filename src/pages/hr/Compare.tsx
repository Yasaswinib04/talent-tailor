import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions, generateScreeningQuestions } from '../../lib/api.js';
import { Check, X, ArrowLeft, Sliders, AlertTriangle, Layers, Award, ShieldAlert, Download, Sparkles, RefreshCw } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  location: string;
  score: number;
  meetsMandatoryCriteria: boolean;
  strengths: string[];
  weaknesses: string[];
  overallFeedback: string;
  discoveryQuestions: Array<{ question: string; answer: string }>;
}

interface RolePipeline {
  id: string;
  name: string;
  department: string;
  candidates: Candidate[];
}

export function HRCompare() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<RolePipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingQuestionsFor, setGeneratingQuestionsFor] = useState<string | null>(null);

  const handleGenerateQuestions = async (candidateId: string) => {
    if (!selectedPipelineId) return;
    try {
      setGeneratingQuestionsFor(candidateId);
      const res = await generateScreeningQuestions(selectedPipelineId, candidateId);
      if (res && res.discoveryQuestions) {
        setPipelines(prev => prev.map(p => {
          if (p.id === selectedPipelineId) {
            return {
              ...p,
              candidates: p.candidates.map(c => {
                if (c.id === candidateId) {
                  return {
                    ...c,
                    discoveryQuestions: res.discoveryQuestions
                  };
                }
                return c;
              })
            };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate screening call contents.");
    } finally {
      setGeneratingQuestionsFor(null);
    }
  };

  // Mock Demo Pipeline fallback for UAT review
  const demoPipeline: RolePipeline = {
    id: 'demo-role-123',
    name: 'Senior Frontend Architect (Demo)',
    department: 'Engineering',
    candidates: [
      {
        id: 'demo-c1',
        name: 'Marcus Chen',
        location: 'San Francisco, CA',
        score: 8.8,
        meetsMandatoryCriteria: true,
        strengths: ['React & TypeScript', 'LCP Optimization', 'Vite & State Management'],
        weaknesses: ['Limited backend database experience'],
        overallFeedback: 'Marcus is an outstanding frontend developer who demonstrated excellent problem solving. He is highly proficient with React, state management, and modern Web APIs.',
        discoveryQuestions: [
          {
            question: 'Explain how you optimized Largest Contentful Paint (LCP) in React.',
            answer: 'I lazy-loaded non-critical components, optimized hero images, and minimized render-blocking assets.'
          }
        ]
      },
      {
        id: 'demo-c2',
        name: 'Sophia Rodriguez',
        location: 'Austin, TX',
        score: 8.2,
        meetsMandatoryCriteria: true,
        strengths: ['UI Architecture', 'A11y/Accessibility standards', 'TailwindCSS'],
        weaknesses: ['Limited Node.js server knowledge'],
        overallFeedback: 'Sophia has a strong eye for visual design aesthetics, detail, and layout consistency. She builds clean component structures and maintains high accessibility standards.',
        discoveryQuestions: [
          {
            question: 'How do you handle responsive design and container queries?',
            answer: 'I use CSS container queries and flexbox layouts to ensure visual elements scale gracefully across viewport sizes.'
          }
        ]
      },
      {
        id: 'demo-c3',
        name: 'Liam Davis',
        location: 'New York, NY',
        score: 6.9,
        meetsMandatoryCriteria: false,
        strengths: ['Vanilla Javascript', 'Webpack configuration'],
        weaknesses: ['No React experience', 'Lacks TypeScript knowledge'],
        overallFeedback: 'Liam has solid experience in traditional frontend engineering but lacks hands-on experience with modern React/TypeScript frameworks required for this role.',
        discoveryQuestions: [
          {
            question: 'What are the benefits of migrating from Webpack to Vite?',
            answer: 'Vite uses ES modules in dev mode which makes hot module replacement (HMR) significantly faster.'
          }
        ]
      }
    ]
  };

  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        const sessionsData = await getSessions();
        const formatted: RolePipeline[] = [];
        for (const session of (sessionsData || [])) {
          const jp = session.job_profile || {};
          const candidates = Array.isArray(session.analysis_results?.candidates)
            ? session.analysis_results.candidates
            : Array.isArray(session.analysisResults?.candidates)
              ? session.analysisResults.candidates
              : Array.isArray(session.analysis_results)
                ? session.analysis_results
                : [];
          const mapped: Candidate[] = candidates
            .filter((c: any) => !c.preFiltered)
            .map((c: any) => ({
              id: c.id || Math.random().toString(),
              name: c.name || 'Unknown Candidate',
              location: c.location || '—',
              score: c.score || 0,
              meetsMandatoryCriteria: c.meetsMandatoryCriteria !== false,
              strengths: (c.strengths || []).map((s: any) => typeof s === 'string' ? s : s.text || s),
              weaknesses: (c.weaknesses || []).map((w: any) => typeof w === 'string' ? w : w.text || w),
              overallFeedback: c.overallFeedback || 'No feedback available.',
              discoveryQuestions: c.discoveryQuestions || []
            }));
          formatted.push({
            id: session.id,
            name: jp.name || 'Untitled Role',
            department: jp.department || 'General',
            candidates: mapped,
          });
        }

        const isDevMode = localStorage.getItem('developer_mode') === 'true';
        const hasRealData = formatted.some(p => p.candidates.length > 0);

        if (hasRealData) {
          setPipelines(formatted);
          setSelectedPipelineId(formatted[0].id);
        } else if (isDevMode) {
          setPipelines([demoPipeline]);
          setSelectedPipelineId(demoPipeline.id);
        } else {
          setPipelines(formatted.length > 0 ? formatted : []);
          setSelectedPipelineId(formatted.length > 0 ? formatted[0].id : '');
        }
      } catch (err) {
        console.error("Failed to load pipelines:", err);
        const isDevMode = localStorage.getItem('developer_mode') === 'true';
        if (isDevMode) {
          setPipelines([demoPipeline]);
          setSelectedPipelineId(demoPipeline.id);
        } else {
          setPipelines([]);
          setSelectedPipelineId('');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPipelines();
  }, []);

  const activePipeline = pipelines.find(p => p.id === selectedPipelineId);
  const activeCandidates = activePipeline ? activePipeline.candidates : [];

  const handleToggleCandidate = (id: string) => {
    setSelectedCandidateIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(cId => cId !== id);
      }
      if (prev.length >= 3) {
        alert("You can compare a maximum of 3 candidates side-by-side.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handlePipelineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPipelineId(e.target.value);
    setSelectedCandidateIds([]); // Clear selection when switching pipelines
  };

  const selectedCandidates = activeCandidates.filter(c => selectedCandidateIds.includes(c.id));

  const handleExportComparison = () => {
    if (selectedCandidates.length === 0) return;
    try {
      const exportData = {
        role: activePipeline?.name,
        comparedAt: new Date().toISOString(),
        candidates: selectedCandidates
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `candidate-comparison-${activePipeline?.name.replace(/\s+/g, '-').toLowerCase()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background text-on-surface-variant">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-[calc(100vh-4rem)] flex flex-col bg-background relative overflow-hidden">
      {/* Glow Backdrop */}
      <div className="absolute w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none top-1/4 right-0 z-0"></div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6 shrink-0 relative z-10">
        <div>
          <button 
            onClick={() => navigate('/hr')}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors mb-2 cursor-pointer font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </button>
          <h2 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-2">
            Compare Top Talent
            <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">Select candidates side-by-side to review technical capabilities, strengths, and AI discovery checks.</p>
        </div>

        {selectedCandidates.length > 1 && (
          <button
            onClick={handleExportComparison}
            className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-4 py-2 rounded-md font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export Comparison
          </button>
        )}
      </div>

      {/* Selectors Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6 relative z-10 shrink-0">
        {/* Role Select Dropdown */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col gap-3">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Hiring Pipeline</label>
          <div className="relative">
            <select
              value={selectedPipelineId}
              onChange={handlePipelineChange}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer appearance-none"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.department})</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-base">expand_more</span>
          </div>
        </div>

        {/* Candidate Checklist */}
        <div className="lg:col-span-3 bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col justify-center">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Select Candidates to Compare (Max 3)</span>
          {activeCandidates.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant italic py-1 bg-surface-container-low/50 px-3 rounded-md border border-outline-variant">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              No candidates have been analyzed in this pipeline yet. Go back to upload resumes first.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {activeCandidates.map(c => {
                const isSelected = selectedCandidateIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => handleToggleCandidate(c.id)}
                    className={`px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isSelected ? 'bg-primary-container border-primary text-primary shadow-[0_0_15px_rgba(167,139,250,0.1)]' : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface'}`}
                  >
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'}`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <p className="text-left font-medium leading-none mb-0.5">{c.name}</p>
                      <p className={`text-[10px] text-left font-mono font-bold leading-none ${c.score >= 8.0 ? 'text-primary' : c.score >= 6.0 ? 'text-tertiary' : 'text-error'}`}>Score: {Math.round(c.score * 10)}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Matrix Area */}
      <div className="flex-1 min-h-[400px] relative z-10 flex flex-col">
        {selectedCandidates.length < 2 ? (
          /* Empty Selector State */
          <div className="flex-1 border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-surface-container/20">
            <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center border border-primary/20 mb-4 shadow-[0_0_20px_rgba(167,139,250,0.1)]">
              <Sliders className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Side-by-Side Comparison Workspace</h3>
            <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">
              Please check checkboxes for 2 or 3 candidates above. The comparison board will immediately generate structured competency ratings, strengths, and interview check logs.
            </p>
          </div>
        ) : (
          /* Matrix Table Card */
          <div className="flex-1 bg-surface-container border border-outline-variant rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/60">
                    {/* Header: Left Label */}
                    <th className="p-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider w-1/4 align-top">Candidate Profile</th>
                    
                    {/* Header: Candidate Columns */}
                    {selectedCandidates.map(c => (
                      <th key={c.id} className="p-5 border-l border-outline-variant/40 w-1/4 align-top">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-secondary-container border border-outline-variant flex items-center justify-center text-on-surface font-headline font-bold text-xs uppercase shrink-0">
                              {c.name.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-on-surface truncate">{c.name}</h4>
                              <p className="text-[10px] text-on-surface-variant truncate">{c.location}</p>
                            </div>
                          </div>

                          {/* Gauge and Score */}
                          <div className="flex items-center gap-4 bg-surface-container-lowest/50 p-2.5 rounded-lg border border-outline-variant/40 w-fit pr-4">
                            <div className="relative w-9 h-9 shrink-0">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" stroke="#27272a" strokeWidth="3" />
                                <circle 
                                  cx="18" 
                                  cy="18" 
                                  r="16" 
                                  fill="none" 
                                  stroke="#a78bfa" 
                                  strokeWidth="3.2" 
                                  strokeDasharray={`${Math.round(c.score * 10)} 100`}
                                  strokeLinecap="round" 
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-on-surface font-mono">
                                {Math.round(c.score * 10)}
                              </div>
                            </div>
                            <div className="leading-tight">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Match Score</span>
                              <span className="text-[9px] text-on-surface-variant">AI Evaluation</span>
                            </div>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 text-xs">
                  {/* Row 1: Mandatory Checks */}
                  <tr>
                    <td className="p-5 font-bold text-on-surface-variant flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
                      Mandatory Criteria
                    </td>
                    {selectedCandidates.map(c => (
                      <td key={c.id} className="p-5 border-l border-outline-variant/40 font-medium align-middle">
                        {c.meetsMandatoryCriteria ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary-container text-primary font-bold border border-primary/20 text-[10px] tracking-wide uppercase">
                            <Check className="h-3.5 w-3.5" /> Meets Standard
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-error-container text-error font-bold border border-error/20 text-[10px] tracking-wide uppercase">
                            <X className="h-3.5 w-3.5" /> Fails Criteria
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Row 2: Strengths */}
                  <tr>
                    <td className="p-5 font-bold text-on-surface-variant flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary shrink-0" />
                      Key Strengths
                    </td>
                    {selectedCandidates.map(c => (
                      <td key={c.id} className="p-5 border-l border-outline-variant/40 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {c.strengths.map((str, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 rounded border border-outline-variant bg-surface-container-low text-[10px] text-on-surface-variant font-medium hover:border-primary/30 transition-colors"
                            >
                              {str}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Row 3: Weaknesses */}
                  <tr>
                    <td className="p-5 font-bold text-on-surface-variant flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
                      Skill Gaps & Risks
                    </td>
                    {selectedCandidates.map(c => (
                      <td key={c.id} className="p-5 border-l border-outline-variant/40 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {c.weaknesses.map((weak, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 rounded border border-error/25 bg-error-container/10 text-[10px] text-error font-medium"
                            >
                              {weak}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Row 4: Fit summary */}
                  <tr>
                    <td className="p-5 font-bold text-on-surface-variant flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary shrink-0" />
                      Fit Summary
                    </td>
                    {selectedCandidates.map(c => (
                      <td key={c.id} className="p-5 border-l border-outline-variant/40 align-top">
                        <p className="text-on-surface-variant text-xs leading-relaxed max-w-sm font-sans">{c.overallFeedback}</p>
                      </td>
                    ))}
                  </tr>

                  {/* Row 5: AI Questions */}
                  <tr>
                    <td className="p-5 font-bold text-on-surface-variant flex items-center gap-2 align-top">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      AI Discovery Check
                    </td>
                    {selectedCandidates.map(c => (
                      <td key={c.id} className="p-5 border-l border-outline-variant/40 align-top">
                        {c.discoveryQuestions && c.discoveryQuestions.length > 0 ? (
                          <div className="space-y-4 max-w-sm">
                            {c.discoveryQuestions.map((q, idx) => (
                              <div key={idx} className="space-y-1.5 bg-surface-container-low/40 p-3 rounded border border-outline-variant/30">
                                <div className="flex gap-2">
                                  <span className="font-bold text-primary">Q:</span>
                                  <span className="font-bold text-on-surface leading-tight text-[11px]">{q.question}</span>
                                </div>
                                {q.answer && (
                                  <div className="flex gap-2 text-on-surface-variant pl-4 text-[10px] leading-relaxed border-l border-outline-variant/50">
                                    <span className="italic">Candidate Answer: "{q.answer}"</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="text-on-surface-variant italic text-[11px] block mb-1">No interview questions generated yet.</span>
                            <button
                              onClick={() => handleGenerateQuestions(c.id)}
                              disabled={generatingQuestionsFor === c.id}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-bold text-[10px] uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer w-fit"
                            >
                              {generatingQuestionsFor === c.id ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                                  Generate screening call contents
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
