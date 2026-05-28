import React, { useState, useRef, useEffect } from 'react';
import { Upload, Cloud, Link2, FileText, CheckCircle2 } from 'lucide-react';
import { getSessions, uploadFiles, associateFilesWithSession, createSession } from '../../lib/api.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddSuccess?: () => void;
}

interface SessionOption {
  id: string;
  name: string;
  department: string;
  candidatesCount: number;
}

export function AddTalentModal({ isOpen, onClose, onAddSuccess }: Props) {
  const [activeSourceTab, setActiveSourceTab] = useState<'upload' | 'cloud' | 'link'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [newJdName, setNewJdName] = useState<string>('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setUploadComplete(false);
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      const opts: SessionOption[] = (data || []).map((s: any) => {
        const jp = s.job_profile || {};
        const candidates = Array.isArray(s.analysis_results?.candidates)
          ? s.analysis_results.candidates
          : [];
        return {
          id: s.id,
          name: jp.name || 'Untitled Role',
          department: jp.department || 'General',
          candidatesCount: candidates.length,
        };
      });
      setSessions(opts);
      if (opts.length > 0 && !selectedSessionId) {
        setSelectedSessionId(opts[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions for talent modal:', err);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
      setUploadComplete(false);
      setError(null);
    }
  };

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateAndUpload = async () => {
    if (!newJdName.trim()) {
      setError('Please enter a name for the new role.');
      return;
    }
    setCreatingSession(true);
    setError(null);
    try {
      const res = await createSession({ name: newJdName.trim(), roleType: 'General', experienceTier: 'Mid-Level' });
      await uploadAndAssociate(res.sessionId);
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    } finally {
      setCreatingSession(false);
    }
  };

  const uploadAndAssociate = async (sessionId: string) => {
    setIsUploading(true);
    setError(null);
    try {
      const uploadRes = await uploadFiles(sessionId, selectedFiles);
      if (uploadRes?.files?.length > 0) {
        await associateFilesWithSession(sessionId, uploadRes.files);
      }
      setUploadComplete(true);
      setTimeout(() => {
        if (onAddSuccess) onAddSuccess();
        setSelectedFiles([]);
        setUploadComplete(false);
        setNewJdName('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTalentUpload = () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one resume to upload.');
      return;
    }
    if (!selectedSessionId) {
      setError('Please select or create a JD/session to associate this talent with.');
      return;
    }
    uploadAndAssociate(selectedSessionId);
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-background/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface-container rounded-xl border border-outline-variant w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/50 shrink-0">
          <div>
            <h2 className="text-xl font-headline font-bold text-on-surface">Add Talent Workspace</h2>
            <p className="text-xs text-on-surface-variant mt-1">Select a source to parse candidates into your screening dashboard.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex border-b border-outline-variant/40 px-6 bg-surface-container-low shrink-0">
          {([
            ['upload', Upload, 'Upload Files'],
            ['cloud', Cloud, 'Cloud Drives'],
            ['link', Link2, 'Import via Link'],
          ] as const).map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveSourceTab(tab)}
              className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeSourceTab === tab ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-surface-container">
          {activeSourceTab === 'upload' && (
            <div className="space-y-4">
              <input type="file" multiple accept=".pdf,.docx" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              
              <div 
                onClick={triggerFilePicker}
                className="border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center text-center bg-surface-container-low/40 hover:bg-surface-container-low hover:border-primary/50 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20 group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-on-surface font-semibold text-sm mb-1">Drag and drop resumes or CVs here</p>
                <p className="text-xs text-on-surface-variant mb-4">Supports PDF and DOCX up to 10MB</p>
                <span className="bg-primary text-on-primary hover:opacity-90 px-4 py-2 rounded font-medium text-xs tracking-wider uppercase transition-all shadow-md shadow-primary/10">
                  Browse Files
                </span>
              </div>

              {selectedFiles.length > 0 && (
                <div className="border border-outline-variant rounded-lg bg-surface-container-low/60 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Selected Files ({selectedFiles.length})</h4>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30 pr-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0 pr-4">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-on-surface font-medium truncate">{file.name}</span>
                          <span className="text-[10px] text-on-surface-variant font-mono">({Math.round(file.size / 1024)} KB)</span>
                        </div>
                        <button onClick={() => handleRemoveFile(idx)} className="text-on-surface-variant hover:text-error transition-colors p-1 cursor-pointer">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSourceTab === 'cloud' && (
            <div className="space-y-6">
              <p className="text-sm text-on-surface-variant">Cloud integration coming soon. Use Upload Files tab for now.</p>
            </div>
          )}

          {activeSourceTab === 'link' && (
            <div className="space-y-5">
              <p className="text-sm text-on-surface-variant">Link import coming soon. Use Upload Files tab for now.</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">LinkedIn Profile URL</label>
                <input 
                  type="text" 
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username" 
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2.5 px-4 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Portfolio or Website Link</label>
                <input 
                  type="text" 
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourwebsite.com" 
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2.5 px-4 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                />
              </div>
            </div>
          )}

          {/* JD/Session Selector */}
          <div className="mt-6 pt-4 border-t border-outline-variant">
            <h3 className="text-sm font-semibold text-on-surface mb-3">Associate with JD / Role</h3>
            
            {sessions.length > 0 && (
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-3 appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M6 8L1 3h10z' fill='%23666'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '2rem' }}
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.department}) — {s.candidatesCount} candidates
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-outline-variant/50"></div>
              <span className="text-[10px] text-on-surface-variant font-medium">or</span>
              <div className="flex-1 h-px bg-outline-variant/50"></div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={newJdName}
                onChange={(e) => setNewJdName(e.target.value)}
                placeholder="Create new role (e.g. Senior Backend Engineer)"
                className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <button
                onClick={handleCreateAndUpload}
                disabled={creatingSession || !newJdName.trim() || selectedFiles.length === 0}
                className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-4 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                {creatingSession ? 'Creating...' : 'Create + Upload'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>
          )}
        </div>

        <div className="p-4 border-t border-outline-variant/50 shrink-0 bg-surface-container-low flex justify-between items-center">
          <button 
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface px-4 py-2 text-xs font-semibold transition-colors rounded-md hover:bg-surface-container-highest cursor-pointer"
          >
            Cancel
          </button>
          
          <button 
            onClick={handleAddTalentUpload}
            disabled={isUploading || uploadComplete || selectedFiles.length === 0 || !selectedSessionId}
            className="bg-primary text-on-primary hover:opacity-90 px-6 py-2 rounded-md text-xs font-bold transition-all shadow-md shadow-primary/10 cursor-pointer flex items-center gap-2 disabled:opacity-75"
          >
            {isUploading ? (
              <>
                <span className="animate-spin text-xs">⏳</span> Ingesting...
              </>
            ) : uploadComplete ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Parsed!
              </>
            ) : (
              `Upload ${selectedFiles.length} Resume${selectedFiles.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
