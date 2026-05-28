import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, Info, X, ChevronDown, ChevronUp, Download, CheckCircle, List, Send, Loader2, Camera, Maximize2, Trash2 } from 'lucide-react';
import { reportBug, getBugs } from '../lib/api.js';

interface DevBugReporterProps {
  isDevMode: boolean;
  setIsDevMode: (val: boolean) => void;
}

export function DevBugReporter({ isDevMode, setIsDevMode }: DevBugReporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'logs'>('report');
  
  // Screen Override State
  const [targetScreenType, setTargetScreenType] = useState<string>('current');
  const [customScreenName, setCustomScreenName] = useState('');
  
  // Form State
  const [category, setCategory] = useState('UI Layout');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  
  // Screenshot State
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bug Logs State
  const [bugs, setBugs] = useState<any[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Lightbox & Expandable States
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Predefined screens mapping
  const screenOptions = [
    { value: 'current', label: `Current Page (${window.location.pathname})` },
    { value: 'HR Dashboard', label: 'HR Dashboard / Active Pipelines' },
    { value: 'Role Criteria Setup', label: 'Role JD & Criteria Setup' },
    { value: 'Role Dashboard', label: 'Role Detail Dashboard' },
    { value: 'Talent Pool Page', label: 'Talent Pool / Candidates list' },
    { value: 'Compare Screen', label: 'Candidate Compare Screen' },
    { value: 'Auth Overlay / Login', label: 'Auth / Login Overlay Screen' },
    { value: 'custom', label: 'Other / Custom Screen...' }
  ];

  // Keyboard shortcut listener: Alt + Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // e.code === 'KeyD' handles Mac where e.key becomes a special character when Alt/Option is pressed
      if (e.altKey && e.shiftKey && (e.key.toLowerCase() === 'd' || e.code === 'KeyD')) {
        e.preventDefault();
        const nextMode = !isDevMode;
        localStorage.setItem('developer_mode', nextMode ? 'true' : 'false');
        setIsDevMode(nextMode);
        
        const msg = nextMode ? 'Developer Mode Enabled!' : 'Developer Mode Disabled.';
        console.log(`[DEV MODE] ${msg}`);
        alert(msg);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDevMode, setIsDevMode]);

  // URL query parameter checker: ?dev=true or ?developer=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true' || params.get('developer') === 'true') {
      localStorage.setItem('developer_mode', 'true');
      setIsDevMode(true);
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [setIsDevMode]);

  // Load existing bug reports
  const fetchBugsList = async () => {
    setLoadingBugs(true);
    try {
      const data = await getBugs();
      setBugs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load reported UAT bugs:", err);
    } finally {
      setLoadingBugs(false);
    }
  };

  // Trigger load when switching tabs
  useEffect(() => {
    if (isOpen && activeTab === 'logs') {
      fetchBugsList();
    }
  }, [isOpen, activeTab]);

  // Handle image compression using Canvas
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Draw image onto canvas to compress
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.7 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setScreenshotBase64(compressedBase64);
        }
        setCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getResolvedScreen = () => {
    if (targetScreenType === 'current') return window.location.pathname;
    if (targetScreenType === 'custom') return customScreenName.trim() || 'Custom Screen';
    return targetScreenType;
  };

  const getDiagnostics = () => {
    return {
      route: window.location.pathname,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      localStorageKeys: Object.keys(localStorage),
      bypassActive: localStorage.getItem('uat_bypass_user') === 'true'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert("Please provide a description of the issue.");
      return;
    }

    setSubmitting(true);
    try {
      const resolvedScreen = getResolvedScreen();
      const bugData = {
        screenPath: resolvedScreen,
        category,
        severity,
        description,
        stepsToReproduce,
        browserInfo: {
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          platform: navigator.platform
        },
        stateSnapshot: {
          screenshot: screenshotBase64, // Inject Base64 string directly
          localStorage: {
            uat_bypass_user: localStorage.getItem('uat_bypass_user'),
            developer_mode: localStorage.getItem('developer_mode')
          }
        }
      };

      await reportBug(bugData);
      setSubmitSuccess(true);
      setDescription('');
      setStepsToReproduce('');
      setScreenshotBase64(null);
      setCustomScreenName('');
      setTargetScreenType('current');
      
      fetchBugsList();
    } catch (err: any) {
      console.error("Failed to submit UAT bug report:", err);
      alert(`Failed to save bug report: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bugs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `uat-bugs-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  if (!isDevMode) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setSubmitSuccess(false);
          setActiveTab('report');
        }}
        className="fixed bottom-6 right-6 z-[99] bg-surface-container border border-outline-variant hover:border-primary/50 text-primary hover:text-primary-fixed-dim px-4 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center gap-2 transition-all hover:scale-105 hover:shadow-primary/15 cursor-pointer backdrop-blur-md font-sans text-xs font-semibold tracking-wide uppercase"
      >
        <Bug className="h-4.5 w-4.5 animate-bounce" />
        Report Bug
      </button>

      {/* Main Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-high border border-outline-variant rounded-md shadow-[0_32px_128px_-32px_rgba(0,0,0,0.6)] w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-high sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-primary-container text-primary flex items-center justify-center border border-primary/20">
                    <Bug className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-headline font-bold text-on-surface leading-none">UAT Debug & Bug Reporter</h3>
                    <p className="text-[10px] text-on-surface-variant mt-1 font-mono tracking-tight">Active Room / Route: {window.location.pathname}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('developer_mode', 'false');
                      setIsDevMode(false);
                      setIsOpen(false);
                      alert("Developer Mode Disabled.");
                    }}
                    className="text-[10px] font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded border border-red-500/20 transition-all cursor-pointer mr-2 flex items-center gap-1 uppercase tracking-wider font-mono shrink-0"
                  >
                    <X className="h-3 w-3" /> Exit Dev Mode
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-container-highest transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-outline-variant px-6 bg-surface-container-low shrink-0">
                <button
                  onClick={() => { setActiveTab('report'); setSubmitSuccess(false); }}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'report' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Visual Bug Form
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                  <List className="h-3.5 w-3.5" />
                  UAT Bug Logs ({bugs.length})
                </button>
              </div>

              {/* Scrollable Form/Logs Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-container">
                {activeTab === 'report' ? (
                  submitSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center text-center py-10 space-y-6"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(167,139,250,0.15)]">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-headline font-bold text-on-surface">UAT Bug Logged Successfully!</h4>
                        <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                          Your visual report and state snapshot have been saved. You can view it under the **UAT Bug Logs** tab.
                        </p>
                      </div>
                      <button
                        onClick={() => setSubmitSuccess(false)}
                        className="bg-primary text-on-primary hover:opacity-90 px-6 py-2 rounded font-medium text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Log Another UAT Bug
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Target Screen Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-on-surface-variant">Target Screen / Section</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="relative">
                            <select
                              value={targetScreenType}
                              onChange={(e) => setTargetScreenType(e.target.value)}
                              className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer appearance-none"
                            >
                              {screenOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-base">expand_more</span>
                          </div>
                          
                          {targetScreenType === 'custom' && (
                            <input
                              type="text"
                              required
                              value={customScreenName}
                              onChange={(e) => setCustomScreenName(e.target.value)}
                              placeholder="Type screen name (e.g. Mobile Nav Menu)..."
                              className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Category selection */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-on-surface-variant">Issue Category</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                          >
                            <option value="UI Layout">UI Layout / Aesthetics</option>
                            <option value="AI Pipeline">AI Vetting Pipeline</option>
                            <option value="File Upload">File Upload & Zones</option>
                            <option value="Navigation">Navigation & Routing</option>
                            <option value="Performance">Performance / Lag</option>
                            <option value="Other">Other Functional Bug</option>
                          </select>
                        </div>

                        {/* Severity Selection */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-on-surface-variant">Severity</label>
                          <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                          >
                            <option value="Low">Low (Typo, small alignment tweak)</option>
                            <option value="Medium">Medium (Incorrect info/functional mismatch)</option>
                            <option value="High">High (Page broken/workflow block)</option>
                            <option value="Critical">Critical (System crash/blank overlay)</option>
                          </select>
                        </div>
                      </div>

                      {/* Brief Issue Description */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-on-surface-variant">Issue Summary / One-liner</label>
                        <input
                          type="text"
                          required
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g. Alignment shifted on Compare Match Score circular gauges..."
                          className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Optional Steps to Reproduce */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-on-surface-variant">Steps to Reproduce / Details (Optional)</label>
                        <textarea
                          rows={2}
                          value={stepsToReproduce}
                          onChange={(e) => setStepsToReproduce(e.target.value)}
                          placeholder="1. Open Candidate Compare&#10;2. Select Liam Davis and observe..."
                          className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        />
                      </div>

                      {/* Interactive Screenshot Attachment Zone */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-on-surface-variant">Attach Screenshot (Optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                        
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-surface-container-low hover:bg-surface-container-high border border-outline-variant rounded-md px-4 py-2.5 text-xs font-semibold text-on-surface flex items-center gap-2 transition-all cursor-pointer shrink-0"
                          >
                            <Camera className="h-4 w-4 text-primary" />
                            Choose Image
                          </button>
                          
                          {compressing && <span className="text-xs text-on-surface-variant animate-pulse font-mono">Compressing...</span>}
                          
                          {screenshotBase64 && (
                            <div className="relative w-14 h-14 rounded border border-outline-variant overflow-hidden shrink-0 group">
                              <img src={screenshotBase64} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setScreenshotBase64(null)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-150 cursor-pointer"
                                title="Remove screenshot"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Collapsible system diagnostics */}
                      <div className="border border-outline-variant rounded-md overflow-hidden bg-surface-container-low">
                        <button
                          type="button"
                          onClick={() => setDiagnosticsExpanded(!diagnosticsExpanded)}
                          className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-surface-container-high transition-colors cursor-pointer text-left font-sans"
                        >
                          <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-primary" />
                            Auto-Captured Diagnostics (Browser / Storage)
                          </span>
                          {diagnosticsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        
                        {diagnosticsExpanded && (
                          <div className="p-4 border-t border-outline-variant bg-surface-container-lowest font-mono text-[10px] text-on-surface-variant overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(getDiagnostics(), null, 2)}
                          </div>
                        )}
                      </div>

                      {/* Form Actions */}
                      <div className="flex justify-end gap-3 pt-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsOpen(false)}
                          className="border border-outline-variant text-on-surface hover:bg-surface-container-high px-4 py-2 rounded text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || compressing}
                          className="bg-primary text-on-primary hover:opacity-90 px-5 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Save UAT Report
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  /* Bugs Log List */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center shrink-0">
                      <span className="text-xs text-on-surface-variant">Logged UAT bugs (newest first)</span>
                      {bugs.length > 0 && (
                        <button
                          onClick={handleExportJSON}
                          className="border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          Export to JSON
                        </button>
                      )}
                    </div>

                    {loadingBugs ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-xs text-on-surface-variant font-mono">Fetching UAT logs...</span>
                      </div>
                    ) : bugs.length === 0 ? (
                      <div className="text-center py-20 border border-dashed border-outline-variant rounded-md bg-surface-container-low">
                        <Bug className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3" />
                        <h5 className="text-sm font-headline font-bold text-on-surface mb-1">No UAT Bugs Logged</h5>
                        <p className="text-xs text-on-surface-variant">Use the form to file reports directly inside your workspace.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bugs.map((bug) => {
                          const isExpanded = expandedBugId === bug.id;
                          const screenshot = bug.stateSnapshot?.screenshot;
                          
                          const severityColors: Record<string, string> = {
                            Low: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
                            Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                            High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                            Critical: 'bg-red-500/10 text-red-500 border-red-500/20'
                          };
                          
                          return (
                            <div
                              key={bug.id}
                              className="border border-outline-variant rounded-md overflow-hidden bg-surface-container-low transition-all duration-200"
                            >
                              {/* Header Trigger */}
                              <div
                                onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                                className="w-full flex justify-between items-start gap-4 px-4 py-3 hover:bg-surface-container-high transition-colors cursor-pointer text-left"
                              >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${severityColors[bug.severity] || severityColors.Medium}`}>
                                      {bug.severity}
                                    </span>
                                    <span className="bg-primary-container text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-semibold font-mono">
                                      {bug.category}
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant font-mono truncate max-w-[200px]" title={bug.screenPath}>
                                      Screen: {bug.screenPath}
                                    </span>
                                    {screenshot && (
                                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                                        <Camera className="h-3 w-3" /> Image attached
                                      </span>
                                    )}
                                  </div>
                                  <h6 className="text-xs font-semibold text-on-surface truncate pr-6">
                                    {bug.description}
                                  </h6>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                                  <span className="text-[10px] text-on-surface-variant font-mono">
                                    {new Date(bug.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-on-surface-variant" /> : <ChevronDown className="h-4 w-4 text-on-surface-variant" />}
                                </div>
                              </div>

                              {/* Expanded Panel */}
                              {isExpanded && (
                                <div className="border-t border-outline-variant p-4 bg-surface-container-lowest space-y-4">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-semibold text-on-surface-variant">Description / Review:</span>
                                    <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">{bug.description}</p>
                                  </div>

                                  {bug.stepsToReproduce && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-semibold text-on-surface-variant">Steps / Details:</span>
                                      <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">{bug.stepsToReproduce}</p>
                                    </div>
                                  )}

                                  {/* Attached Screenshot Visual Preview */}
                                  {screenshot && (
                                    <div className="space-y-1.5 pt-2">
                                      <span className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1.5">
                                        <Camera className="h-3.5 w-3.5 text-primary" /> Visual Screenshot
                                      </span>
                                      <div className="relative w-44 h-28 rounded-md border border-outline-variant overflow-hidden cursor-pointer hover:border-primary/50 transition-all group shadow-md" onClick={() => setLightboxImage(screenshot)}>
                                        <img src={screenshot} alt="Visual Screenshot" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                          <Maximize2 className="h-4 w-4 text-white" />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-[10px] border-t border-outline-variant bg-surface-container-low/30 p-2 rounded">
                                    <div className="space-y-1">
                                      <span className="font-semibold text-on-surface-variant">Reporter:</span>
                                      <div className="font-mono text-on-surface break-all">{bug.reporterEmail}</div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-semibold text-on-surface-variant">Logged At:</span>
                                      <div className="font-mono text-on-surface">{new Date(bug.createdAt).toLocaleString()}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Screenshot Lightbox Overlay */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          >
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={lightboxImage} 
              alt="UAT Expanded Screenshot" 
              className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
