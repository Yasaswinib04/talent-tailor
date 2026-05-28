import React from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, XCircle, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileUploadZoneProps {
  label: string;
  onFilesSelect: (files: File[]) => void;
  currentFiles: File[];
  onClear: (index?: number) => void;
  multiple?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({ 
  label, 
  onFilesSelect, 
  currentFiles, 
  onClear, 
  multiple = false 
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      const valid = acceptedFiles.filter(f => {
        const name = f.name.toLowerCase();
        const isImage = f.type?.startsWith('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp');
        if (isImage) {
          console.warn(`FileUploadZone: rejected image file "${f.name}" — only PDF/DOCX accepted`);
          return false;
        }
        return true;
      });
      if (valid.length === 0) return;
      if (multiple) {
        onFilesSelect([...currentFiles, ...valid]);
      } else {
        onFilesSelect([valid[0]]);
      }
    },
    multiple,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  } as any);

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[11px] font-bold text-slate-500 uppercase">{label}</label>}
      {currentFiles.length > 0 ? (
        <div className="space-y-2">
          {currentFiles.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-primary/10 border border-indigo-200 rounded-md">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-indigo-900 truncate">{file.name}</span>
              </div>
              <button onClick={() => onClear(idx)} className="text-primary hover:text-primary/80">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {multiple && (
            <div {...getRootProps()} className="p-2 border border-dashed border-slate-200 rounded-md text-center cursor-pointer hover:bg-slate-50">
              <input {...getInputProps()} />
              <span className="text-[10px] font-bold text-slate-400">+ ADD MORE FILES</span>
            </div>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "h-32 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
            isDragActive ? "border-primary/100 bg-primary/10" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-6 w-6 text-slate-400" />
          <p className="text-xs text-slate-500">Drop PDF, DOCX or Image</p>
        </div>
      )}
    </div>
  );
};
