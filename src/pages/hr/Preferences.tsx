import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { updateSessionPreferences, getSession, extractJDSkills } from '../../lib/api.js';
import { ROLE_WEIGHTS, getEffectiveWeights } from '../../constants/roles.js';
import type { RoleType, ExperienceTier, IndustryType, SkillCategory, RoleSkill } from '../../types.js';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  technical: 'Technical',
  analytics: 'Analytics',
  softSkills: 'Soft Skills',
  tools: 'Tools & Platforms',
};

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  technical: 'bg-primary/10 text-primary border-primary/20',
  analytics: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  softSkills: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tools: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

interface SkillState { mandatory: string[]; preferred: string[]; }

interface ScoreDimension { key: string; label: string; weight: number; custom?: boolean; }

export function HRPreferences() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleType, setRoleType] = useState<RoleType>('Frontend Developer');
  const [experienceTier, setExperienceTier] = useState<ExperienceTier>('Senior');
  const [industry, setIndustry] = useState<IndustryType>('Technology / SaaS');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [jdContent, setJdContent] = useState('');
  const [minExp, setMinExp] = useState(5);
  const [tier1, setTier1] = useState(false);
  const [isMba, setIsMba] = useState(false);
  const [topN, setTopN] = useState(10);
  const [maxFailedCriteria, setMaxFailedCriteria] = useState(0);
  const [skills, setSkills] = useState<SkillState>({ mandatory: [], preferred: [] });
  const [skillInput, setSkillInput] = useState('');
  const [companyChips, setCompanyChips] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [dimensions, setDimensions] = useState<ScoreDimension[]>([
    { key: 'technical', label: 'Technical Skills', weight: 50 },
    { key: 'experience', label: 'Experience', weight: 20 },
    { key: 'domain', label: 'Domain Knowledge', weight: 10 },
    { key: 'education', label: 'Education', weight: 5 },
    { key: 'softSkills', label: 'Soft Skills', weight: 15 },
  ]);
  const [extractingSkills, setExtractingSkills] = useState(false);
  const [rubricModified, setRubricModified] = useState(false);
  const [rubricRecalculatedAt, setRubricRecalculatedAt] = useState<number>(0);

  const roleTypeOptions: RoleType[] = [
    'Product Manager', 'Consumer Product Manager', 'Product Designer', 'Designer',
    'Marketing', 'Growth Marketing', 'Brand Marketing', 'Sales', "Founder's Office",
    'Chief of Staff', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'QA', 'Analytics', 'Data Scientist', 'AI / ML Engineer', 'Data Engineer', 'Finance', 'Other',
  ];

  const experienceTierOptions: ExperienceTier[] = ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Director', 'Executive'];

  const industryOptions: IndustryType[] = [
    'Technology / SaaS', 'FinTech', 'Healthcare', 'E-Commerce', 'EdTech', 'Enterprise', 'Consulting', 'Other',
  ];

  const weightData = useMemo(
    () => getEffectiveWeights(roleType, experienceTier, industry),
    [roleType, experienceTier, industry]
  );

  const allRoleSkills = useMemo(() => {
    const base = weightData.roleSkills || ROLE_WEIGHTS[roleType]?.roleSkills || [];
    const industrySkills = weightData.industrySkills || [];
    const seen = new Set(base.map(s => s.name));
    const uniqueIndustry = industrySkills.filter(s => !seen.has(s.name));
    return [...base, ...uniqueIndustry];
  }, [weightData, roleType]);

  const skillsByCategory = useMemo(() => {
    const map: Record<SkillCategory, RoleSkill[]> = { technical: [], analytics: [], softSkills: [], tools: [] };
    for (const s of allRoleSkills) {
      map[s.category].push(s);
    }
    return map;
  }, [allRoleSkills]);

  const toggleSkill = (skillName: string) => {
    setSkills(prev => {
      const inMandatory = prev.mandatory.includes(skillName);
      const inPreferred = prev.preferred.includes(skillName);
      if (inMandatory) {
        return { mandatory: prev.mandatory.filter(s => s !== skillName), preferred: [...prev.preferred, skillName] };
      }
      if (inPreferred) {
        return { mandatory: prev.mandatory, preferred: prev.preferred.filter(s => s !== skillName) };
      }
      return { mandatory: [...prev.mandatory, skillName], preferred: prev.preferred };
    });
  };

  const addCustomSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    setSkills(prev => ({
      ...prev,
      mandatory: prev.mandatory.includes(s) ? prev.mandatory : [...prev.mandatory, s],
    }));
    setSkillInput('');
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); }
  };

  const addCompanyChip = () => {
    const c = companyInput.trim();
    if (c && !companyChips.includes(c)) setCompanyChips(prev => [...prev, c]);
    setCompanyInput('');
  };

  const removeCompanyChip = (c: string) => setCompanyChips(prev => prev.filter(x => x !== c));

  const applyRecommendedWeights = () => {
    const w = getEffectiveWeights(roleType, experienceTier, industry);
    setDimensions([
      { key: 'technical', label: 'Technical Skills', weight: w.technical },
      { key: 'experience', label: 'Experience', weight: w.experience },
      { key: 'domain', label: 'Domain Knowledge', weight: w.domain },
      { key: 'education', label: 'Education', weight: w.education },
      { key: 'softSkills', label: 'Soft Skills', weight: w.softSkills },
    ]);
    setRubricModified(false);
    setRubricRecalculatedAt(Date.now());
  };

  const normalizeWeights = (dims: ScoreDimension[], idx: number): ScoreDimension[] => {
    const others = dims.reduce((s, d, i) => i === idx ? s : s + d.weight, 0);
    if (others === 0) return dims;
    const target = 100 - dims[idx].weight;
    return dims.map((d, i) => i === idx ? d : { ...d, weight: Math.round((d.weight / others) * target) });
  };

  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);

  useEffect(() => {
    applyRecommendedWeights();
  }, [roleType, experienceTier, industry]);

  useEffect(() => {
    const fetchSessionData = async () => {
      if (!id) { setLoading(false); return; }
      try {
        setLoading(true);
        const session = await getSession(id);
        if (session) {
          const jp = session.job_profile || session.jobProfile || {};
          const pref = jp.preferences || {};
          setRoleName(jp.name || '');
          setRoleType(jp.roleType || jp.role || 'Frontend Developer');
          setExperienceTier(jp.experienceTier || 'Senior');
          setIndustry(jp.industry || pref.industry || 'Technology / SaaS');
          setDepartment(jp.department || '');
          setLocation(jp.location || '');
          setJdContent(session.jdContent || jp.jdContent || session.jd_content || '');
          setMinExp(pref.minExperienceYears ?? 5);
          setTier1(pref.isTierIMandatory ?? false);
          setIsMba(pref.isMBAMandatory ?? false);
          setTopN(pref.topN ?? 10);
          setMaxFailedCriteria(pref.maxFailedCriteria ?? 0);
          setSkills({
            mandatory: pref.mandatorySkills || [],
            preferred: pref.preferredSkills || [],
          });
          setCompanyChips(pref.preferredCompanies || []);
          if (pref.scoringWeights) {
            const { technical, experience, domain, education, softSkills, custom: cw } = pref.scoringWeights;
            const base: ScoreDimension[] = [
              { key: 'technical', label: 'Technical Skills', weight: technical },
              { key: 'experience', label: 'Experience', weight: experience },
              { key: 'domain', label: 'Domain Knowledge', weight: domain },
              { key: 'education', label: 'Education', weight: education },
              { key: 'softSkills', label: 'Soft Skills', weight: softSkills },
            ];
            if (cw) for (const [k, v] of Object.entries(cw as Record<string, number>)) base.push({ key: k, label: k, weight: v, custom: true });
            setDimensions(base);
            setRubricModified(true);
          } else {
            applyRecommendedWeights();
          }
        }
      } catch (err) { console.error('Failed to load session preferences:', err); }
      finally { setLoading(false); }
    };
    fetchSessionData();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      const w = dimensions.filter(d => !d.custom).reduce((acc, d) => { (acc as any)[d.key] = d.weight; return acc; }, {} as Record<string, number>);
      const cw: Record<string, number> = {};
      for (const d of dimensions) if (d.custom) cw[d.key] = d.weight;
      await updateSessionPreferences(id, {
        name: roleName, role: roleType, roleType, experienceTier, industry,
        department, location, jdContent,
        preferences: {
          minExperienceYears: minExp, isTierIMandatory: tier1, isMBAMandatory: isMba,
          preferredCompanies: companyChips,
          mandatorySkills: skills.mandatory,
          preferredSkills: skills.preferred,
          maxFailedCriteria, topN: Number(topN),
          scoringWeights: { ...w, ...(Object.keys(cw).length ? { custom: cw } : {}) },
        },
      });
      navigate(`/hr/role/${id}`);
    } catch (err: any) {
      alert(`Failed to save: ${err.message || 'Database error'}`);
    } finally { setSaving(false); }
  };

  const handleExtractSkills = async () => {
    if (!jdContent || jdContent.trim().length < 50) {
      alert('Please paste a full job description first.');
      return;
    }
    setExtractingSkills(true);
    try {
      const result = await extractJDSkills(jdContent, roleType, experienceTier);
      if (result.mandatory?.length || result.preferred?.length) {
        const allGeneric = allRoleSkills.map(s => s.name.toLowerCase());
        const newMandatory: string[] = [...skills.mandatory];
        const newPreferred: string[] = [...skills.preferred];

        for (const skill of (result.mandatory || [])) {
          const sl = skill.trim();
          const match = allRoleSkills.find(gs => gs.name.toLowerCase() === sl.toLowerCase());
          if (match) {
            if (!newMandatory.includes(match.name) && !newPreferred.includes(match.name)) {
              newMandatory.push(match.name);
            }
          } else if (!newMandatory.includes(sl)) {
            newMandatory.push(sl);
          }
        }

        for (const skill of (result.preferred || [])) {
          const sl = skill.trim();
          if (newMandatory.some(m => m.toLowerCase() === sl.toLowerCase())) continue;
          const match = allRoleSkills.find(gs => gs.name.toLowerCase() === sl.toLowerCase());
          if (match) {
            if (!newPreferred.includes(match.name) && !newMandatory.includes(match.name)) {
              newPreferred.push(match.name);
            }
          } else if (!newPreferred.includes(sl)) {
            newPreferred.push(sl);
          }
        }

        setSkills({ mandatory: newMandatory, preferred: newPreferred });
      }
    } catch (err: any) {
      console.error('Skill extraction failed:', err);
    } finally {
      setExtractingSkills(false);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-background h-screen w-screen"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;

  const skillStateIcon = (name: string) => {
    if (skills.mandatory.includes(name)) return '✓';
    if (skills.preferred.includes(name)) return '◉';
    return null;
  };

  const skillStateClass = (name: string) => {
    if (skills.mandatory.includes(name)) return 'bg-primary/15 text-primary border-primary/40';
    if (skills.preferred.includes(name)) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    return 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-primary/30';
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 h-full overflow-y-auto custom-scrollbar pb-32 bg-background text-on-surface">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight">JD & Criteria Setup</h2>
            <p className="text-on-surface-variant text-sm mt-0.5">Configure the job description and AI vetting parameters.</p>
          </div>
          <button onClick={applyRecommendedWeights} className={`text-xs hover:underline cursor-pointer flex items-center gap-1 ${rubricModified ? 'text-amber-400' : 'text-primary'}`}>
            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
            {rubricModified ? 'Reset to AI recommended weights' : 'AI recommended weights'}
          </button>
        </div>

        {/* Role Details */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Role Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <InputField label="Role Title" value={roleName} onChange={setRoleName} placeholder="e.g. Senior Frontend Engineer" />
            <InputField label="Department" value={department} onChange={setDepartment} placeholder="e.g. Engineering" />
            <InputField label="Location" value={location} onChange={setLocation} placeholder="e.g. Remote (US)" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={roleType} onChange={(e) => setRoleType(e.target.value as RoleType)}
              className="bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer">
              {roleTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={experienceTier} onChange={(e) => setExperienceTier(e.target.value as ExperienceTier)}
              className="bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer">
              {experienceTierOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={industry} onChange={(e) => setIndustry(e.target.value as IndustryType)}
              className="bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer">
              {industryOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <span className="text-[9px] text-on-surface-variant">Role Type</span>
            <span className="text-[9px] text-on-surface-variant">Experience Tier</span>
            <span className="text-[9px] text-on-surface-variant">Industry</span>
          </div>
        </section>

        {/* JD */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Job Description</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleExtractSkills} disabled={extractingSkills || jdContent.length < 50}
                className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-2.5 py-1 rounded transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1">
                {extractingSkills ? (
                  <><span className="animate-spin">⏳</span> Extracting...</>
                ) : (
                  <><span className="material-symbols-outlined text-[14px]">auto_fix_high</span> Extract Skills from JD</>
                )}
              </button>
              <span className="text-[10px] text-on-surface-variant">{jdContent.length} chars</span>
            </div>
          </div>
          <textarea value={jdContent} onChange={(e) => setJdContent(e.target.value)} rows={6}
            placeholder="Paste the full job description here..."
            className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none resize-y transition-all font-sans leading-relaxed" />
        </section>

        {/* Skills — Categorized */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Skills</h3>
          <p className="text-[10px] text-on-surface-variant mb-4">
            Click once for <span className="text-primary font-semibold">Mandatory</span> (required), twice for <span className="text-blue-400 font-semibold">Preferred</span> (bonus), again to clear. Based on {roleType} · {experienceTier} · {industry}.
          </p>
          {(Object.keys(skillsByCategory) as SkillCategory[]).map(cat => {
            const entries = skillsByCategory[cat];
            if (entries.length === 0) return null;
            return (
              <div key={cat} className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[cat]}`}>{CATEGORY_LABELS[cat]}</span>
                  <span className="text-[10px] text-on-surface-variant">{entries.length} skills</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entries.map(skill => {
                    const icon = skillStateIcon(skill.name);
                    const cls = skillStateClass(skill.name);
                    return (
                      <button key={skill.name} type="button" onClick={() => toggleSkill(skill.name)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 ${cls}`}>
                        {icon && <span className="text-[10px] font-bold">{icon}</span>}
                        {skill.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 mt-2 pt-3 border-t border-outline-variant/50">
            <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={handleSkillKeyDown}
              placeholder="Add custom skill + Enter"
              className="flex-1 bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" />
            <button onClick={addCustomSkill} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-3 py-2 rounded text-xs font-semibold transition-colors cursor-pointer">+ Add</button>
          </div>
          {(skills.mandatory.length > 0 || skills.preferred.length > 0) && (
            <div className="mt-3 pt-3 border-t border-outline-variant/50 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-semibold text-on-surface-variant">Selected:</span>
              {skills.mandatory.map(s => (
                <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span> {s}
                </span>
              ))}
              {skills.preferred.map(s => (
                <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <span className="material-symbols-outlined text-[12px]">star</span> {s}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Scoring Rubric */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Scoring Rubric</h3>
            <div className="flex items-center gap-3">
              {rubricModified ? (
                <span className="text-[10px] text-amber-400 font-medium">Custom weights saved</span>
              ) : rubricRecalculatedAt > 0 ? (
                <span className="text-[10px] text-emerald-400 font-medium animate-pulse">AI recalculated</span>
              ) : null}
              <span className={`text-xs font-mono font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-red-400'}`}>Total: {totalWeight}%</span>
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant mb-4">AI weights based on {roleType} · {experienceTier} · {industry}. Adjust sliders; must sum to 100%.</p>
          <div className="space-y-3">
            {dimensions.map((dim, i) => (
              <div key={dim.key} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium text-on-surface shrink-0 truncate">{dim.label}{dim.custom && <span className="text-[9px] text-primary ml-1">custom</span>}</span>
                <input type="range" min={0} max={100} value={dim.weight}
                  onChange={(e) => { setRubricModified(true); setDimensions(prev => { const next = [...prev]; next[i] = { ...next[i], weight: Number(e.target.value) }; return normalizeWeights(next, i); }); }}
                  className="flex-1 h-1.5 accent-primary cursor-pointer" />
                <span className="w-10 text-right text-xs font-mono font-bold text-on-surface">{dim.weight}%</span>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => { setRubricModified(true); setDimensions(prev => { const next = [...prev]; next[i] = { ...next[i], weight: Math.max(0, next[i].weight - 1) }; return normalizeWeights(next, i); }); }}
                    className="w-5 h-5 rounded text-[10px] bg-surface-container-low border border-outline-variant hover:bg-surface-container-highest flex items-center justify-center cursor-pointer">−</button>
                  <button onClick={() => { setRubricModified(true); setDimensions(prev => { const next = [...prev]; next[i] = { ...next[i], weight: Math.min(100, next[i].weight + 1) }; return normalizeWeights(next, i); }); }}
                    className="w-5 h-5 rounded text-[10px] bg-surface-container-low border border-outline-variant hover:bg-surface-container-highest flex items-center justify-center cursor-pointer">+</button>
                  {dim.custom && <button onClick={() => { setRubricModified(true); setDimensions(prev => prev.filter((_, j) => j !== i)); }} className="w-5 h-5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center cursor-pointer ml-1">&times;</button>}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { const name = prompt('Custom criterion name:'); if (name?.trim()) { setRubricModified(true); setDimensions(prev => [...prev, { key: name.trim(), label: name.trim(), weight: 5, custom: true }]); } }}
            className="mt-3 text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span> Add custom scoring criterion
          </button>
        </section>

        {/* Vetting Filters */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Vetting Filters</h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2"><label className="text-xs font-medium text-on-surface-variant">Min Exp</label><input type="number" value={minExp} min={0} onChange={(e) => setMinExp(Number(e.target.value))} className="w-14 bg-surface-container-low border border-outline-variant rounded p-1.5 text-center text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" /><span className="text-xs text-on-surface-variant">yrs</span></div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none"><input type="checkbox" checked={tier1} onChange={(e) => setTier1(e.target.checked)} className="w-3.5 h-3.5 rounded border-outline-variant text-primary cursor-pointer" /><span className="text-xs text-on-surface-variant">Tier-1 Uni</span></label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none"><input type="checkbox" checked={isMba} onChange={(e) => setIsMba(e.target.checked)} className="w-3.5 h-3.5 rounded border-outline-variant text-primary cursor-pointer" /><span className="text-xs text-on-surface-variant">MBA Required</span></label>
            <div className="flex items-center gap-2"><label className="text-xs font-medium text-on-surface-variant">Top N</label><input type="number" value={topN} min={1} max={100} onChange={(e) => setTopN(Number(e.target.value))} className="w-16 bg-surface-container-low border border-outline-variant rounded p-1.5 text-center text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" /></div>
            <div className="flex items-center gap-2"><label className="text-xs font-medium text-on-surface-variant">Max Failed</label><input type="number" value={maxFailedCriteria} min={0} max={10} onChange={(e) => setMaxFailedCriteria(Number(e.target.value))} className="w-16 bg-surface-container-low border border-outline-variant rounded p-1.5 text-center text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" /></div>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/50">
            <label className="text-xs font-medium text-on-surface-variant mb-2 block">Preferred Past Companies</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {companyChips.map(c => <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">{c}<button onClick={() => removeCompanyChip(c)} className="hover:text-red-400 cursor-pointer ml-0.5">&times;</button></span>)}
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={companyInput} onChange={(e) => setCompanyInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCompanyChip(); } }} placeholder="Company + Enter" className="flex-1 bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" />
              <button onClick={addCompanyChip} className="text-xs text-primary hover:underline cursor-pointer">Add</button>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => navigate('/hr')} className="px-5 py-2.5 rounded-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-primary text-on-primary px-6 py-2.5 rounded-md text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(167,139,250,0.1)]">{saving ? 'Saving...' : 'Save Criteria'}</button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-on-surface-variant uppercase">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none transition-all" />
    </div>
  );
}
