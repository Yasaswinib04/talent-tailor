import React, { useState, useRef } from 'react';
import { Upload, Cloud, Link2, X, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddSuccess?: () => void;
}

export function AddTalentModal({ isOpen, onClose, onAddSuccess }: Props) {
  const [activeSourceTab, setActiveSourceTab] = useState<'upload' | 'cloud' | 'link'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link Form State
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      setUploadComplete(false);
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddTalent = () => {
    if (activeSourceTab === 'upload') {
      if (selectedFiles.length === 0) {
        alert("Please select at least one resume to upload.");
        return;
      }
      setIsUploading(true);
      // Simulate file upload progress
      setTimeout(() => {
        setIsUploading(false);
        setUploadComplete(true);
        setTimeout(() => {
          if (onAddSuccess) onAddSuccess();
          setSelectedFiles([]);
          setUploadComplete(false);
          onClose();
        }, 1200);
      }, 1500);
    } else if (activeSourceTab === 'link') {
      if (!linkedinUrl.trim() && !portfolioUrl.trim()) {
        alert("Please enter a LinkedIn profile or portfolio link.");
        return;
      }
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        if (onAddSuccess) onAddSuccess();
        setLinkedinUrl('');
        setPortfolioUrl('');
        onClose();
      }, 1000);
    } else {
      // Cloud connection
      alert("Mock Cloud Connection setup initiated. Successfully connected account!");
      if (onAddSuccess) onAddSuccess();
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-background/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface-container rounded-xl border border-outline-variant w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
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

        {/* Source Tabs */}
        <div className="flex border-b border-outline-variant/40 px-6 bg-surface-container-low shrink-0">
          <button
            onClick={() => setActiveSourceTab('upload')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeSourceTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Files
          </button>
          <button
            onClick={() => setActiveSourceTab('cloud')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeSourceTab === 'cloud' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            <Cloud className="h-3.5 w-3.5" />
            Cloud Drives
          </button>
          <button
            onClick={() => setActiveSourceTab('link')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeSourceTab === 'link' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Import via Link
          </button>
        </div>

        {/* Dynamic Content Panel */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-surface-container">
          {activeSourceTab === 'upload' && (
            <div className="space-y-4">
              <input 
                type="file" 
                multiple 
                accept=".pdf,.docx,.txt,.rtf" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              
              <div 
                onClick={triggerFilePicker}
                className="border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center text-center bg-surface-container-low/40 hover:bg-surface-container-low hover:border-primary/50 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20 group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-on-surface font-semibold text-sm mb-1">Drag and drop resumes or CVs here</p>
                <p className="text-xs text-on-surface-variant mb-4">Supports PDF, DOCX, TXT, or RTF up to 10MB</p>
                <span className="bg-primary text-on-primary hover:opacity-90 px-4 py-2 rounded font-medium text-xs tracking-wider uppercase transition-all shadow-md shadow-primary/10">
                  Browse Files
                </span>
              </div>

              {/* Selected Files List */}
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
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          className="text-on-surface-variant hover:text-error transition-colors p-1"
                        >
                          <X className="h-3.5 w-3.5" />
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
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Connect Cloud Account</h3>
                <p className="text-xs text-on-surface-variant mt-1">Directly sync and ingest talent profiles from cloud drives.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { name: 'Google Drive', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png' },
                  { name: 'Dropbox', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Dropbox_Icon.svg' },
                  { name: 'OneDrive', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_OneDrive_%282018%E2%80%93present%29.svg' }
                ].map((drive) => (
                  <div 
                    key={drive.name} 
                    className="flex flex-col items-center justify-between p-5 border border-outline-variant/60 rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low hover:border-primary/30 transition-all text-center gap-4 group"
                  >
                    <div className="w-12 h-12 flex items-center justify-center bg-white p-2 rounded-lg border border-outline-variant/50 group-hover:scale-105 transition-transform">
                      <img src={drive.logo} alt={drive.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xs font-bold text-on-surface">{drive.name}</span>
                    <button 
                      onClick={handleAddTalent}
                      className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 py-1.5 rounded-md font-bold text-[10px] tracking-wide uppercase transition-colors w-full cursor-pointer"
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSourceTab === 'link' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Import via Public Link</h3>
                <p className="text-xs text-on-surface-variant mt-1">Import candidate resumes or professional summaries by linking their profiles.</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">LinkedIn Profile URL</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-[#0a66c2] font-bold text-xs bg-white rounded-[2px] w-4.5 h-4.5 flex items-center justify-center leading-none">in</div>
                    <input 
                      type="text" 
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username" 
                      className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2.5 pl-11 pr-4 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant/50" 
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Portfolio or Website Link</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-base">language</span>
                    <input 
                      type="text" 
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://yourwebsite.com" 
                      className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2.5 pl-11 pr-4 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant/50" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/50 shrink-0 bg-surface-container-low flex justify-between items-center">
          <button 
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface px-4 py-2 text-xs font-semibold transition-colors rounded-md hover:bg-surface-container-highest border border-transparent hover:border-outline-variant cursor-pointer"
          >
            Cancel
          </button>
          
          <button 
            onClick={handleAddTalent}
            disabled={isUploading || uploadComplete}
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
            ) : activeSourceTab === 'upload' ? (
              `Ingest ${selectedFiles.length} Resumes`
            ) : (
              'Add Candidate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
