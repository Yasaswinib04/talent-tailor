import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, Info, X, ChevronDown, ChevronUp, Download, AlertOctagon, CheckCircle, List, Send, Loader2 } from 'lucide-react';
import { reportBug, getBugs } from '../lib/api.js';

interface DevBugReporterProps {
  isDevMode: boolean;
  setIsDevMode: (val: boolean) => void;
}

export function DevBugReporter({ isDevMode, setIsDevMode }: DevBugReporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'logs'>('report');
  
  // Form State
  const [category, setCategory] = useState('UI Layout');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  
  // Bug Logs State
  const [bugs, setBugs] = useState<any[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Expandable States
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);

  // Keyboard shortcut listener: Alt + Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const nextMode = !isDevMode;
        localStorage.setItem('developer_mode', nextMode ? 'true' : 'false');
        setIsDevMode(nextMode);
        
        // Show indicator message
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
      
      // Clean query params from URL without reloading
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      console.log('[DEV MODE] Activated via URL parameter.');
    }
  }, [setIsDevMode]);

  // Load existing bug reports
  const fetchBugsList = async () => {
    setLoadingBugs(true);
    try {
      const data = await getBugs();
      setBugs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load reported bugs:", err);
    } finally {
      setLoadingBugs(false);
    }
  };

  // Trigger load when switching to logs tab
  useEffect(() => {
    if (isOpen && activeTab === 'logs') {
      fetchBugsList();
    }
  }, [isOpen, activeTab]);

  // Diagnostics Info
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
      const bugData = {
        screenPath: window.location.pathname,
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
          localStorage: {
            uat_bypass_user: localStorage.getItem('uat_bypass_user'),
            developer_mode: localStorage.getItem('developer_mode')
          },
          sessionStorage: {}
        }
      };

      await reportBug(bugData);
      setSubmitSuccess(true);
      setDescription('');
      setStepsToReproduce('');
      
      // Refresh bugs list in background
      fetchBugsList();
    } catch (err: any) {
      console.error("Failed to submit bug report:", err);
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

      {/* Modal Drawer */}
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
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-high sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-primary-container text-primary flex items-center justify-center border border-primary/20">
                    <Bug className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-headline font-bold text-on-surface leading-none">UAT Debug & Bug Reporter</h3>
                    <p className="text-[10px] text-on-surface-variant mt-1 font-mono tracking-tight">{window.location.pathname}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-outline-variant px-6 bg-surface-container-low shrink-0">
                <button
                  onClick={() => { setActiveTab('report'); setSubmitSuccess(false); }}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'report' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                  <Send className="h-3.5 w-3.5" />
                  Log New Bug
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                  <List className="h-3.5 w-3.5" />
                  UAT Bug Logs ({bugs.length})
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-container">
                {activeTab === 'report' ? (
                  submitSuccess ? (
                    /* Success Card */
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center text-center py-10 space-y-6"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(167,139,250,0.15)]">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-headline font-bold text-on-surface">Bug Report Submitted!</h4>
                        <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                          Your report was successfully stored in the PostgreSQL database and written to the <code className="bg-surface-container-high px-1.5 py-0.5 rounded text-[10px] border border-outline-variant text-primary">specs/uat-bugs.json</code> log file.
                        </p>
                      </div>
                      <button
                        onClick={() => setSubmitSuccess(false)}
                        className="bg-primary text-on-primary hover:opacity-90 px-6 py-2 rounded font-medium text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Report Another Issue
                      </button>
                    </motion.div>
                  ) : (
                    /* Bug Logging Form */
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Category Selection */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-on-surface-variant">Issue Category</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                          >
                            <option value="UI Layout">UI Layout / Aesthetics</option>
                            <option value="AI Pipeline">AI Screening Pipeline</option>
                            <option value="File Upload">File Upload & Zones</option>
                            <option value="Navigation">Navigation & Routing</option>
                            <option value="Performance">Performance / Loading</option>
                            <option value="Other">Other Functional Bug</option>
                          </select>
                        </div>

                        {/* Severity Selection */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-on-surface-variant">UAT Severity</label>
                          <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                          >
                            <option value="Low">Low (Tweak, text alignment)</option>
                            <option value="Medium">Medium (Incorrect state/details)</option>
                            <option value="High">High (Page broken/blocked workflow)</option>
                            <option value="Critical">Critical (System crash, data loss)</option>
                          </select>
                        </div>
                      </div>

                      {/* Description input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-on-surface-variant">Bug Description</label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe the issue you noticed (e.g. alignment mismatch, empty dashboard state showing blank layout)..."
                          className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        />
                      </div>

                      {/* Steps to Reproduce */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-on-surface-variant">Steps to Reproduce (Optional)</label>
                        <textarea
                          rows={2}
                          value={stepsToReproduce}
                          onChange={(e) => setStepsToReproduce(e.target.value)}
                          placeholder="1. Click 'New Request'&#10;2. Select setup preference&#10;3. Click Save and observe..."
                          className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        />
                      </div>

                      {/* Automated Diagnostic section */}
                      <div className="border border-outline-variant rounded-md overflow-hidden bg-surface-container-low">
                        <button
                          type="button"
                          onClick={() => setDiagnosticsExpanded(!diagnosticsExpanded)}
                          className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-surface-container-high transition-colors cursor-pointer text-left"
                        >
                          <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-primary" />
                            Auto-Captured System Diagnostics
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
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsOpen(false)}
                          className="border border-outline-variant text-on-surface hover:bg-surface-container-high px-4 py-2 rounded text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="bg-primary text-on-primary hover:opacity-90 px-5 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Logging...
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Submit Report
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  /* Bugs Log List */
                  <div className="space-y-4">
                    {/* Header Controls */}
                    <div className="flex justify-between items-center shrink-0">
                      <span className="text-xs text-on-surface-variant">Logged UAT issues (newest first)</span>
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
                        <h5 className="text-sm font-headline font-bold text-on-surface mb-1">No Bugs Reported Yet</h5>
                        <p className="text-xs text-on-surface-variant">All screen issues noticed during UAT will appear here once logged.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bugs.map((bug) => {
                          const isExpanded = expandedBugId === bug.id;
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
                                    <span className="text-[10px] text-on-surface-variant font-mono truncate max-w-[180px] sm:max-w-[280px]">
                                      {bug.screenPath}
                                    </span>
                                  </div>
                                  <h6 className="text-xs font-semibold text-on-surface truncate pr-6">
                                    {bug.description}
                                  </h6>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                                  <span className="text-[10px] text-on-surface-variant font-mono">
                                    {new Date(bug.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-on-surface-variant" /> : <ChevronDown className="h-4 w-4 text-on-surface-variant" />}
                                </div>
                              </div>

                              {/* Expanded Panel */}
                              {isExpanded && (
                                <div className="border-t border-outline-variant p-4 bg-surface-container-lowest space-y-4">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-semibold text-on-surface-variant">Description:</span>
                                    <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">{bug.description}</p>
                                  </div>

                                  {bug.stepsToReproduce && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-semibold text-on-surface-variant">Steps to Reproduce:</span>
                                      <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap font-sans">{bug.stepsToReproduce}</p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-[10px] border-t border-outline-variant bg-surface-container-low/30 p-2 rounded">
                                    <div className="space-y-1">
                                      <span className="font-semibold text-on-surface-variant">Reporter Email:</span>
                                      <div className="font-mono text-on-surface break-all">{bug.reporterEmail}</div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-semibold text-on-surface-variant">Created Time:</span>
                                      <div className="font-mono text-on-surface">{new Date(bug.createdAt).toLocaleString()}</div>
                                    </div>
                                  </div>

                                  {bug.browserInfo && (
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1">
                                        <Info className="h-3 w-3 text-primary" /> Browser & OS Info
                                      </span>
                                      <div className="font-mono text-[9px] text-on-surface-variant bg-surface-container-lowest/80 p-2 rounded border border-outline-variant overflow-x-auto whitespace-pre-wrap leading-tight">
                                        {JSON.stringify(bug.browserInfo, null, 2)}
                                      </div>
                                    </div>
                                  )}
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
    </>
  );
}
