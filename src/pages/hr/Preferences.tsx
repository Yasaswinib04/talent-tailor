import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { updateSessionPreferences, getSession } from '../../lib/api.js';
import { ROLE_WEIGHTS, getEffectiveWeights } from '../../constants/roles.js';
import type { RoleType, ExperienceTier } from '../../types.js';

interface ScoreDimension {
  key: string;
  label: string;
  weight: number;
  custom?: boolean;
}

export function HRPreferences() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleType, setRoleType] = useState<RoleType>('Developer');
  const [experienceTier, setExperienceTier] = useState<ExperienceTier>('Senior');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [jdContent, setJdContent] = useState('');
  const [minExp, setMinExp] = useState(5);
  const [tier1, setTier1] = useState(false);
  const [isMba, setIsMba] = useState(false);
  const [topN, setTopN] = useState(10);
  const [maxFailedCriteria, setMaxFailedCriteria] = useState(0);

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
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

  const roleTypeOptions: RoleType[] = [
    'Product Manager', 'Consumer Product Manager', 'Product Designer', 'Designer',
    'Marketing', 'Growth Marketing', 'Brand Marketing', 'Sales', "Founder's Office",
    'Chief of Staff', 'Developer', 'QA', 'Analytics', 'Data Engineer', 'Finance', 'Other'
  ];

  const experienceTierOptions: ExperienceTier[] = [
    'Junior', 'Mid-Level', 'Senior', 'Lead', 'Director', 'Executive'
  ];

  const recommendedSkills = ROLE_WEIGHTS[roleType]?.competencies || [];
  const recommendedWeights = getEffectiveWeights(roleType, experienceTier);

  const applyRecommendedWeights = () => {
    setDimensions([
      { key: 'technical', label: 'Technical Skills', weight: recommendedWeights.technical },
      { key: 'experience', label: 'Experience', weight: recommendedWeights.experience },
      { key: 'domain', label: 'Domain Knowledge', weight: recommendedWeights.domain },
      { key: 'education', label: 'Education', weight: recommendedWeights.education },
      { key: 'softSkills', label: 'Soft Skills', weight: recommendedWeights.softSkills },
    ]);
  };

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
          setRoleType(jp.roleType || jp.role || 'Developer');
          setExperienceTier(jp.experienceTier || 'Senior');
          setDepartment(jp.department || '');
          setLocation(jp.location || '');
          setJdContent(session.jdContent || jp.jdContent || session.jd_content || '');
          setMinExp(pref.minExperienceYears ?? 5);
          setTier1(pref.isTierIMandatory ?? false);
          setIsMba(pref.isMBAMandatory ?? false);
          setTopN(pref.topN ?? 10);
          setMaxFailedCriteria(pref.maxFailedCriteria ?? 0);
          setSelectedSkills(pref.mandatorySkills || []);
          setCompanyChips(pref.preferredCompanies || []);
          if (pref.scoringWeights) {
            const { technical, experience, domain, education, softSkills, custom } = pref.scoringWeights;
            const base: ScoreDimension[] = [
              { key: 'technical', label: 'Technical Skills', weight: technical },
              { key: 'experience', label: 'Experience', weight: experience },
              { key: 'domain', label: 'Domain Knowledge', weight: domain },
              { key: 'education', label: 'Education', weight: education },
              { key: 'softSkills', label: 'Soft Skills', weight: softSkills },
            ];
            if (custom) {
              for (const [k, v] of Object.entries(custom as Record<string, number>)) {
                base.push({ key: k, label: k, weight: v, custom: true });
              }
            }
            setDimensions(base);
          } else {
            applyRecommendedWeights();
          }
        }
      } catch (err) {
        console.error('Failed to load session preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [id]);

  const adjustWeight = (index: number, delta: number) => {
    setDimensions(prev => {
      const next = [...prev];
      const newWeight = Math.max(0, Math.min(100, next[index].weight + delta));
      next[index] = { ...next[index], weight: newWeight };
      return normalizeWeights(next, index);
    });
  };

  const normalizeWeights = (dims: ScoreDimension[], changedIndex: number): ScoreDimension[] => {
    const totalOthers = dims.reduce((sum, d, i) => i === changedIndex ? sum : sum + d.weight, 0);
    const targetTotal = 100 - dims[changedIndex].weight;
    if (totalOthers === 0) return dims;
    return dims.map((d, i) => {
      if (i === changedIndex) return d;
      return { ...d, weight: Math.round((d.weight / totalOthers) * targetTotal) };
    });
  };

  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);

  const addCustomDimension = () => {
    const name = prompt('Name for the new scoring criterion:');
    if (!name?.trim()) return;
    setDimensions(prev => [
      ...prev,
      { key: name.trim(), label: name.trim(), weight: 5, custom: true },
    ]);
  };

  const removeCustomDimension = (index: number) => {
    setDimensions(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const s = skillInput.trim();
    if (s && !selectedSkills.includes(s)) {
      setSelectedSkills(prev => [...prev, s]);
    }
    setSkillInput('');
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomSkill();
    }
  };

  const addCompanyChip = () => {
    const c = companyInput.trim();
    if (c && !companyChips.includes(c)) {
      setCompanyChips(prev => [...prev, c]);
    }
    setCompanyInput('');
  };

  const removeCompanyChip = (company: string) => {
    setCompanyChips(prev => prev.filter(c => c !== company));
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      const weightEntries = dimensions.filter(d => !d.custom).reduce((acc, d) => {
        (acc as any)[d.key] = d.weight;
        return acc;
      }, {} as Record<string, number>);
      const customWeights: Record<string, number> = {};
      for (const d of dimensions) {
        if (d.custom) customWeights[d.key] = d.weight;
      }

      await updateSessionPreferences(id, {
        name: roleName,
        role: roleType,
        roleType: roleType,
        experienceTier,
        department,
        location,
        jdContent,
        preferences: {
          minExperienceYears: minExp,
          isTierIMandatory: tier1,
          isMBAMandatory: isMba,
          preferredCompanies: companyChips,
          mandatorySkills: selectedSkills,
          maxFailedCriteria,
          topN: Number(topN),
          scoringWeights: {
            ...weightEntries,
            ...(Object.keys(customWeights).length > 0 ? { custom: customWeights } : {}),
          },
        },
      });
      navigate(`/hr/role/${id}`);
    } catch (err: any) {
      console.error('Failed to save criteria', err);
      alert(`Failed to save criteria: ${err.message || 'Database offline fallback error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background h-screen w-screen">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 h-full overflow-y-auto custom-scrollbar pb-32 bg-background text-on-surface">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight">JD & Criteria Setup</h2>
            <p className="text-on-surface-variant text-sm mt-0.5">Configure the job description and AI vetting parameters.</p>
          </div>
          <button
            onClick={applyRecommendedWeights}
            className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
            Reset to AI recommended weights
          </button>
        </div>

        {/* Role Details — Compact 4-column */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Role Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InputField label="Role Title" value={roleName} onChange={setRoleName} placeholder="e.g. Senior Engineer" />
            <InputField label="Department" value={department} onChange={setDepartment} placeholder="e.g. Engineering" />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase">Role Type</label>
              <select value={roleType} onChange={(e) => setRoleType(e.target.value as RoleType)}
                className="bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                {roleTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase">Experience Tier</label>
              <select value={experienceTier} onChange={(e) => setExperienceTier(e.target.value as ExperienceTier)}
                className="bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                {experienceTierOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <InputField label="Location" value={location} onChange={setLocation} placeholder="e.g. Remote (US)" />
          </div>
        </section>

        {/* Job Description */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Job Description</h3>
            <span className="text-[10px] text-on-surface-variant">{jdContent.length} chars</span>
          </div>
          <textarea
            value={jdContent}
            onChange={(e) => setJdContent(e.target.value)}
            rows={6}
            placeholder="Paste the full job description here..."
            className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none resize-y transition-all font-sans leading-relaxed"
          />
        </section>

        {/* Mandatory Skills — Chip recommendations */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Mandatory Skills</h3>
          <p className="text-[10px] text-on-surface-variant mb-3">
            Recommended for {roleType} · {experienceTier}. Click to select. Type your own below.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {recommendedSkills.map(skill => {
              const selected = selectedSkills.includes(skill);
              return (
                <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    selected
                      ? 'bg-primary/15 text-primary border-primary/40'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-primary/30'
                  }`}>
                  {selected && <span className="mr-1">✓</span>}{skill}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              placeholder="Type custom skill + Enter"
              className="flex-1 bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" />
            <button onClick={addCustomSkill}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-3 py-2 rounded text-xs font-semibold transition-colors cursor-pointer">
              + Add
            </button>
          </div>
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-outline-variant/50">
              <span className="text-[10px] font-semibold text-on-surface-variant self-center mr-1">Selected ({selectedSkills.length}):</span>
              {selectedSkills.map(skill => (
                <span key={skill}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  {skill}
                  <button onClick={() => toggleSkill(skill)} className="hover:text-error cursor-pointer ml-0.5">&times;</button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Scoring Rubric */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Scoring Rubric</h3>
            <span className={`text-xs font-mono font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
              Total: {totalWeight}%
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant mb-4">
            AI default weights based on {roleType} · {experienceTier}. Adjust sliders; total must sum to 100%.
          </p>
          <div className="space-y-3">
            {dimensions.map((dim, i) => (
              <div key={dim.key} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium text-on-surface shrink-0 truncate">
                  {dim.label}
                  {dim.custom && <span className="text-[9px] text-primary ml-1">custom</span>}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={dim.weight}
                  onChange={(e) => {
                    setDimensions(prev => {
                      const next = [...prev];
                      next[i] = { ...next[i], weight: Number(e.target.value) };
                      return normalizeWeights(next, i);
                    });
                  }}
                  className="flex-1 h-1.5 accent-primary cursor-pointer"
                />
                <span className="w-10 text-right text-xs font-mono font-bold text-on-surface">{dim.weight}%</span>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => adjustWeight(i, -1)}
                    className="w-5 h-5 rounded text-[10px] bg-surface-container-low border border-outline-variant hover:bg-surface-container-highest flex items-center justify-center cursor-pointer">−</button>
                  <button onClick={() => adjustWeight(i, 1)}
                    className="w-5 h-5 rounded text-[10px] bg-surface-container-low border border-outline-variant hover:bg-surface-container-highest flex items-center justify-center cursor-pointer">+</button>
                  {dim.custom && (
                    <button onClick={() => removeCustomDimension(i)}
                      className="w-5 h-5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center cursor-pointer ml-1">&times;</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={addCustomDimension}
            className="mt-3 text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span>
            Add custom scoring criterion
          </button>
        </section>

        {/* Vetting Filters — Compact */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-5">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Vetting Filters</h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-on-surface-variant">Min Experience</label>
              <input type="number" value={minExp} min={0} onChange={(e) => setMinExp(Number(e.target.value))}
                className="w-16 bg-surface-container-low border border-outline-variant rounded p-1.5 text-center text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" />
              <span className="text-xs text-on-surface-variant">yrs</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={tier1} onChange={(e) => setTier1(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" />
                <span className="text-xs text-on-surface-variant">Tier-1 University</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={isMba} onChange={(e) => setIsMba(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" />
                <span className="text-xs text-on-surface-variant">MBA Required</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-on-surface-variant">Top N</label>
              <input type="number" value={topN} min={1} max={100} onChange={(e) => setTopN(Number(e.target.value))}
                className="w-16 bg-surface-container-low border border-outline-variant rounded p-1.5 text-center text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-on-surface-variant">Max Failed Criteria</label>
              <input type="number" value={maxFailedCriteria} min={0} max={10} onChange={(e) => setMaxFailedCriteria(Number(e.target.value))}
                className="w-16 bg-surface-container-low border border-outline-variant rounded p-1.5 text-center text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>

          {/* Preferred Companies — Chip input */}
          <div className="mt-4 pt-4 border-t border-outline-variant/50">
            <label className="text-xs font-medium text-on-surface-variant mb-2 block">Preferred Past Companies</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {companyChips.map(c => (
                <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {c}
                  <button onClick={() => removeCompanyChip(c)} className="hover:text-red-400 cursor-pointer ml-0.5">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={companyInput} onChange={(e) => setCompanyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCompanyChip(); } }}
                placeholder="Type company name + Enter to add"
                className="flex-1 bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" />
              <button onClick={addCompanyChip}
                className="text-xs text-primary hover:underline cursor-pointer">Add</button>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => navigate('/hr')}
            className="px-5 py-2.5 rounded-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-md text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(167,139,250,0.1)]">
            {saving ? 'Saving...' : 'Save Criteria'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-on-surface-variant uppercase">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none transition-all" />
    </div>
  );
}
