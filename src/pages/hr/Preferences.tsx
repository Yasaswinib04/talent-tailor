import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { updateSessionPreferences, getSession } from '../../lib/api.js';

export function HRPreferences() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Loading & Saving States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Role Metadata States
  const [roleName, setRoleName] = useState("Senior Frontend Engineer");
  const [roleType, setRoleType] = useState("Developer");
  const [experienceTier, setExperienceTier] = useState("Senior");
  const [department, setDepartment] = useState("Engineering Dept");
  const [location, setLocation] = useState("Remote (US)");
  
  // Job Description State
  const [jdContent, setJdContent] = useState(
    "We are seeking a highly skilled Senior Frontend Engineer with deep expertise in modern React ecosystems, performance optimization, and architectural design. The ideal candidate will have a proven track record of leading complex technical initiatives and mentoring junior engineers. Key responsibilities include: architecting scalable frontend solutions, optimizing Core Web Vitals (LCP/INP), collaborating with product teams, and writing clean, maintainable TypeScript code."
  );

  // Advanced Hiring Filters States
  const [minExp, setMinExp] = useState(5);
  const [tier1, setTier1] = useState(false);
  const [isMba, setIsMba] = useState(false);
  const [skills, setSkills] = useState("React, Node.js, System Design");
  const [companies, setCompanies] = useState("Google, Meta, Netflix");
  const [topN, setTopN] = useState(10);
  const [maxFailedCriteria, setMaxFailedCriteria] = useState(0);

  const roleTypeOptions = [
    'Product Manager', 'Consumer Product Manager', 'Product Designer', 'Designer',
    'Marketing', 'Growth Marketing', 'Brand Marketing', 'Sales', "Founder's Office",
    'Chief of Staff', 'Developer', 'QA', 'Analytics', 'Data Engineer', 'Finance', 'Other'
  ];

  const experienceTierOptions = [
    'Junior', 'Mid-Level', 'Senior', 'Lead', 'Director', 'Executive'
  ];

  // Fetch session details on load
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const session = await getSession(id);
        if (session) {
          const jp = session.job_profile || session.jobProfile || {};
          const pref = jp.preferences || {};
          
          setRoleName(jp.name || "Senior Frontend Engineer");
          setRoleType(jp.roleType || jp.role || "Developer");
          setExperienceTier(jp.experienceTier || "Senior");
          setDepartment(jp.department || "Engineering Dept");
          setLocation(jp.location || "Remote (US)");
          
          // Reconcile JD content from session root or profile
          setJdContent(session.jdContent || jp.jdContent || session.jd_content || "");
          
          setMinExp(pref.minExperienceYears ?? 5);
          setTier1(pref.isTierIMandatory ?? false);
          setIsMba(pref.isMBAMandatory ?? false);
          setSkills(pref.mandatorySkills?.join(", ") ?? "React, Node.js, System Design");
          setCompanies(pref.preferredCompanies?.join(", ") ?? "");
          setTopN(pref.topN ?? 10);
          setMaxFailedCriteria(pref.maxFailedCriteria ?? 0);
        }
      } catch (err) {
        console.error("Failed to load existing session preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      
      // Parse comma-separated text into arrays
      const mandatorySkills = skills
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
      const preferredCompanies = companies
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);

      await updateSessionPreferences(id, {
        name: roleName,
        role: roleType,
        roleType: roleType,
        experienceTier: experienceTier,
        department: department,
        location: location,
        jdContent: jdContent,
        preferences: {
          minExperienceYears: minExp,
          isTierIMandatory: tier1,
          isMBAMandatory: isMba,
          preferredCompanies,
          mandatorySkills,
          maxFailedCriteria: maxFailedCriteria,
          topN: Number(topN)
        }
      });
      navigate(`/hr/role/${id}`);
    } catch (err: any) {
      console.error("Failed to save criteria", err);
      alert(`Failed to save criteria: ${err.message || 'Database offline fallback error'}`);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-on-surface-variant bg-background h-screen w-screen">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 lg:p-12 h-full overflow-y-auto custom-scrollbar flex justify-center pb-32 bg-background text-on-surface">
      <div className="w-full max-w-4xl flex flex-col gap-8">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">JD & Criteria Setup</h2>
          <p className="text-on-surface-variant font-body">Configure the job description and vetting parameters for your active recruitment pipeline.</p>
        </div>

        {/* Section 1: Role Details */}
        <section className="bg-surface-container border border-outline-variant rounded-md p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">work</span>
            <h3 className="font-headline font-semibold text-on-surface text-lg">Role Details</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface-variant">Role / Position Title</label>
              <input 
                type="text" 
                value={roleName} 
                onChange={(e) => setRoleName(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded p-2.5 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                placeholder="e.g. Senior Frontend Engineer"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface-variant">Department</label>
              <input 
                type="text" 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded p-2.5 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                placeholder="e.g. Engineering Dept"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-on-surface-variant">Role Type</label>
                <select 
                  value={roleType} 
                  onChange={(e) => setRoleType(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded p-2.5 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer"
                >
                  {roleTypeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-on-surface-variant">Experience Tier</label>
                <select 
                  value={experienceTier} 
                  onChange={(e) => setExperienceTier(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded p-2.5 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer"
                >
                  {experienceTierOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface-variant">Location</label>
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded p-2.5 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                placeholder="e.g. Remote (US) or San Francisco, CA"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Editable Job Description */}
        <section className="bg-surface-container rounded-md border border-outline-variant overflow-hidden group">
          <details className="w-full" open>
            <summary className="flex items-center justify-between p-5 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">description</span>
                <h3 className="font-headline font-semibold text-on-surface text-lg">Job Description</h3>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-open:rotate-180 transition-transform duration-200">expand_more</span>
            </summary>
            <div className="px-5 pb-6 pt-2 border-t border-outline-variant text-sm font-body text-on-surface-variant leading-relaxed">
              <p className="mb-4 text-xs">Enter or paste the full Job Description. Our AI Agent extracts key criteria and maps competencies automatically.</p>
              <textarea
                value={jdContent}
                onChange={(e) => setJdContent(e.target.value)}
                rows={8}
                placeholder="Paste the Job Description (JD) here..."
                className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y transition-all font-sans leading-relaxed"
              />
            </div>
          </details>
        </section>

        {/* Section 3: Extended Hiring Filters */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">filter_alt</span>
            <h3 className="font-headline font-semibold text-on-surface text-lg">Vetting & Ranking Filters</h3>
          </div>
          <p className="text-xs text-on-surface-variant">Fine-tune the parameters utilized by the AI Vetting Agent to rank candidates.</p>
          
          <div className="bg-surface-container border border-outline-variant rounded-md p-6 flex flex-col gap-5">
            {/* Min Experience */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md hover:bg-surface-container-highest/30 transition-colors">
              <div>
                <p className="text-on-surface font-semibold text-sm">Minimum Experience (Years)</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Strict check. Candidates with fewer years are flagged as not meeting mandatory requirements.</p>
              </div>
              <input 
                type="number" 
                value={minExp} 
                min={0}
                onChange={(e) => setMinExp(Number(e.target.value))}
                className="w-24 bg-surface-container-low border border-outline-variant rounded p-2 text-on-surface text-center focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all" 
              />
            </div>
            
            {/* Tier 1 Degree */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-md hover:bg-surface-container-highest/30 transition-colors border-t border-outline-variant/65 pt-5">
              <div>
                <p className="text-on-surface font-semibold text-sm">Tier 1 University Degree</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Strict check. Requires degree from premium/Tier-1 universities.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={tier1}
                  onChange={(e) => setTier1(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface-variant after:border-outline after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-background"></div>
              </label>
            </div>

            {/* MBA Required */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-md hover:bg-surface-container-highest/30 transition-colors border-t border-outline-variant/65 pt-5">
              <div>
                <p className="text-on-surface font-semibold text-sm">MBA Degree Required</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Strict check. Flag candidates without a Master of Business Administration.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={isMba}
                  onChange={(e) => setIsMba(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface-variant after:border-outline after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-background"></div>
              </label>
            </div>

            {/* Mandatory Skills */}
            <div className="flex flex-col gap-2 border-t border-outline-variant/65 pt-5">
              <div>
                <p className="text-on-surface font-semibold text-sm">Mandatory Skills</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Enter skills required for this role (comma separated).</p>
              </div>
              <input 
                type="text" 
                value={skills} 
                onChange={(e) => setSkills(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded p-2.5 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                placeholder="e.g. React, TypeScript, Node.js"
              />
            </div>

            {/* Preferred Companies */}
            <div className="flex flex-col gap-2 border-t border-outline-variant/65 pt-5">
              <div>
                <p className="text-on-surface font-semibold text-sm">Preferred Past Companies</p>
                <p className="text-on-surface-variant text-xs mt-0.5">List premium companies you want to prioritize (comma separated).</p>
              </div>
              <input 
                type="text" 
                value={companies} 
                onChange={(e) => setCompanies(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded p-2.5 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                placeholder="e.g. Google, McKinsey, Stripe"
              />
            </div>

            {/* Top N Candidates */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant/65 pt-5">
              <div>
                <p className="text-on-surface font-semibold text-sm">Max Candidates to Vett (Top N)</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Limits the number of candidates analyzed in depth to save latency.</p>
              </div>
              <input 
                type="number" 
                value={topN} 
                min={1}
                max={100}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="w-24 bg-surface-container-low border border-outline-variant rounded p-2 text-on-surface text-center focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all" 
              />
            </div>
          </div>
        </section>

        {/* Section 4: Advanced Filters */}
        <section className="bg-surface-container rounded-md border border-outline-variant overflow-hidden group">
          <details className="w-full">
            <summary className="flex items-center justify-between p-5 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">tune</span>
                <h3 className="font-headline font-semibold text-on-surface text-lg">Advanced Filters</h3>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-open:rotate-180 transition-transform duration-200">expand_more</span>
            </summary>
            <div className="px-5 pb-6 pt-2 border-t border-outline-variant flex flex-col gap-4">
              <p className="text-xs text-on-surface-variant">Control how many mandatory criteria a candidate can fail before being excluded from analysis entirely — saving token costs.</p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md hover:bg-surface-container-highest/30 transition-colors">
                <div>
                  <p className="text-on-surface font-semibold text-sm">Max Failed Mandatory Criteria</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">Candidates exceeding this threshold are filtered out before any LLM calls. Set to 0 for strict enforcement.</p>
                </div>
                <input 
                  type="number" 
                  value={maxFailedCriteria} 
                  min={0}
                  max={10}
                  onChange={(e) => setMaxFailedCriteria(Number(e.target.value))}
                  className="w-24 bg-surface-container-low border border-outline-variant rounded p-2 text-on-surface text-center focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all" 
                />
              </div>
            </div>
          </details>
        </section>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
          <button 
            type="button"
            onClick={() => navigate('/hr')}
            className="px-5 py-2.5 rounded-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-md text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(167,139,250,0.1)]"
          >
            {saving ? "Saving..." : "Save Criteria"}
          </button>
        </div>
      </div>
    </div>
  );
}
