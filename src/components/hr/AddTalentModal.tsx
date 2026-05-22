import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddSuccess?: () => void;
}

export function AddTalentModal({ isOpen, onClose, onAddSuccess }: Props) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAddTalent = () => {
    if (onAddSuccess) onAddSuccess();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface-container rounded-xl border border-outline-variant w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/50 shrink-0">
          <div>
            <h2 className="text-xl font-headline font-bold text-on-surface">Add Talent Workflow</h2>
            <p className="text-sm text-on-surface-variant mt-1">Choose how you want to add candidates to your pipeline.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          
          {/* Section: Upload Files */}
          <section>
            <h3 className="text-sm font-semibold text-on-surface mb-3">Upload Files</h3>
            <div className="border border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center bg-surface-container-low/50 hover:bg-surface-container-low transition-colors cursor-pointer group">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 group-hover:text-primary transition-colors">cloud_upload</span>
              <p className="text-on-surface font-medium mb-1">Drag and drop resumes or CVs here</p>
              <p className="text-xs text-on-surface-variant mb-4">Supports PDF, DOCX, RTF, TXT up to 10MB</p>
              <button className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-5 py-2 rounded-md font-medium text-sm transition-colors">
                Browse Files
              </button>
            </div>
          </section>

          {/* Section: Connect Cloud */}
          <section>
            <div>
              <h3 className="text-sm font-semibold text-on-surface mb-1">Connect Cloud</h3>
              <p className="text-xs text-on-surface-variant mb-4">Import directly from your cloud storage</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center gap-3 p-4 border border-outline-variant/50 rounded-lg bg-surface-container-low/30 hover:bg-surface-container-highest transition-colors">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png" alt="Google Drive" className="w-8 h-8 object-contain" />
                <span className="text-sm font-medium text-on-surface">Google Drive</span>
                <button className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-4 py-1.5 rounded-md font-medium text-xs transition-colors w-full">
                  Connect
                </button>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 p-4 border border-outline-variant/50 rounded-lg bg-surface-container-low/30 hover:bg-surface-container-highest transition-colors">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Dropbox_Icon.svg" alt="Dropbox" className="w-8 h-8 object-contain" />
                <span className="text-sm font-medium text-on-surface">Dropbox</span>
                <button className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-4 py-1.5 rounded-md font-medium text-xs transition-colors w-full">
                  Connect
                </button>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 p-4 border border-outline-variant/50 rounded-lg bg-surface-container-low/30 hover:bg-surface-container-highest transition-colors">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_OneDrive_%282018%E2%80%93present%29.svg" alt="OneDrive" className="w-8 h-8 object-contain" />
                <span className="text-sm font-medium text-on-surface">OneDrive</span>
                <button className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-4 py-1.5 rounded-md font-medium text-xs transition-colors w-full">
                  Connect
                </button>
              </div>
            </div>
          </section>

          {/* Section: Import via Link */}
          <section>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-on-surface mb-1">Import via Link</h3>
              <p className="text-xs text-on-surface-variant">Add candidates using public profiles</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">LinkedIn Profile URL</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-[#0a66c2] font-bold text-sm bg-white rounded-[2px] w-4 h-4 flex items-center justify-center leading-none">in</div>
                  <input type="text" placeholder="https://linkedin.com/in/username" className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2.5 pl-10 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Portfolio / Personal Website URL</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg">language</span>
                  <input type="text" placeholder="https://yourwebsite.com" className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2.5 pl-10 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>
              </div>
              
              <button className="w-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 py-2.5 rounded-md font-medium text-sm transition-colors mt-2">
                Import
              </button>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/50 shrink-0 bg-surface-container-low flex justify-between items-center">
          <button 
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface px-4 py-2 text-sm font-medium transition-colors rounded-md hover:bg-surface-container-highest border border-transparent hover:border-outline-variant"
          >
            Cancel
          </button>
          <button 
            onClick={handleAddTalent}
            className="bg-primary text-on-primary hover:bg-primary-fixed px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-lg shadow-primary/20"
          >
            Add Talent
          </button>
        </div>
      </div>
    </div>
  );
}
