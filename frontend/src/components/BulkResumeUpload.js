import React, { useRef, useState } from "react";
import { api, cx } from "../lib/api";
import { Upload, X, FileText, Loader2, Check, AlertTriangle, Users, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const MAX_BULK_FILES = 10;
const MAX_FILE_MB = 5;
const ACCEPTED = [".pdf", ".docx", ".txt", ".md"];

const extOf = (name) => (name.slice(name.lastIndexOf(".")) || "").toLowerCase();
const fmtSize = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);

/**
 * Recruiter-side bulk resume intake for one role.
 * Hard-capped at MAX_BULK_FILES per batch — mirrored server-side, this is only
 * the friendly half of that limit.
 */
export default function BulkResumeUpload({ jobId, jobTitle, onComplete }) {
  const [files, setFiles] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (incoming) => {
    setError("");
    setSummary(null);
    const notes = [];
    const room = MAX_BULK_FILES - files.length;

    const valid = [];
    for (const f of Array.from(incoming)) {
      if (!ACCEPTED.includes(extOf(f.name))) {
        notes.push({ name: f.name, reason: `Unsupported type — accepts ${ACCEPTED.join(", ")}` });
      } else if (f.size > MAX_FILE_MB * 1024 * 1024) {
        notes.push({ name: f.name, reason: `Larger than ${MAX_FILE_MB} MB` });
      } else if (files.some((x) => x.name === f.name && x.size === f.size)) {
        notes.push({ name: f.name, reason: "Already in this batch" });
      } else {
        valid.push(f);
      }
    }

    if (valid.length > room) {
      valid.slice(room).forEach((f) =>
        notes.push({ name: f.name, reason: `Over the ${MAX_BULK_FILES}-resume limit for one upload` })
      );
    }
    setFiles((prev) => [...prev, ...valid.slice(0, Math.max(0, room))]);
    setRejected(notes);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeAt = (i) => setFiles((prev) => prev.filter((_, j) => j !== i));

  const reset = () => {
    setFiles([]);
    setRejected([]);
    setSummary(null);
    setError("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = async () => {
    if (!files.length || uploading) return;
    setUploading(true);
    setError("");
    setProgress(0);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f, f.name));
      const res = await api.post(`/jobs/${jobId}/bulk-upload`, fd, {
        // Let the browser set multipart boundaries; the shared instance
        // otherwise forces application/json.
        headers: { "Content-Type": undefined },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setSummary(res.data);
      setFiles([]);
      setRejected([]);
      if (inputRef.current) inputRef.current.value = "";
      onComplete?.();
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 413) {
        setError(detail || `You can upload ${MAX_BULK_FILES} resumes at a time.`);
      } else if (status === 429) {
        setError(detail || "You're uploading too quickly. Give it a minute and try again.");
      } else if (status === 404) {
        setError("This role no longer exists.");
      } else if (detail) {
        setError(typeof detail === "string" ? detail : "That upload was rejected.");
      } else {
        setError("Upload failed — check your connection and try again. Nothing was saved.");
      }
    } finally {
      setUploading(false);
    }
  };

  const atLimit = files.length >= MAX_BULK_FILES;

  return (
    <div className="border hairline bg-surface" data-testid="bulk-upload-panel">
      <div className="flex items-center justify-between px-5 py-4 border-b hairline">
        <div className="flex items-center gap-2">
          <Users size={12} className="text-brand" />
          <span className="font-mono-label">bulk resume upload</span>
        </div>
        <span
          className={cx("text-[10px] font-mono px-1.5 py-0.5 border", atLimit
            ? "text-amber-400 border-amber-400/40 bg-amber-400/5"
            : "text-white/50 border-white/15")}
          data-testid="bulk-counter"
        >
          {files.length} / {MAX_BULK_FILES}
        </span>
      </div>

      <div className="p-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          data-testid="bulk-dropzone"
          className={cx(
            "border-2 border-dashed p-6 text-center transition-colors",
            atLimit ? "border-white/10 opacity-50" : dragging ? "border-brand bg-brand/5" : "hairline hover:border-brand/50"
          )}
        >
          <Upload size={20} className="text-brand mx-auto mb-3" />
          <div className="text-sm font-medium mb-1">
            Drop up to {MAX_BULK_FILES} resumes for {jobTitle || "this role"}
          </div>
          <div className="text-[11px] text-white/40 mb-4">
            PDF, DOCX or TXT · max {MAX_FILE_MB} MB each · we read each one and score it against this role
          </div>
          <label className={cx("inline-block", atLimit ? "cursor-not-allowed" : "cursor-pointer")}>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED.join(",")}
              disabled={atLimit || uploading}
              onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
              className="hidden"
              data-testid="bulk-file-input"
            />
            <span className={cx(
              "inline-flex items-center gap-2 px-5 py-2.5 text-sm transition-colors",
              atLimit ? "bg-white/10 text-white/40" : "bg-white text-black hover:bg-gray-200"
            )}>
              <Upload size={13} /> {atLimit ? "Batch is full" : "Choose resumes"}
            </span>
          </label>
          {atLimit && (
            <div className="mt-3 text-[11px] text-amber-400" data-testid="bulk-limit-note">
              {MAX_BULK_FILES}-resume limit reached. Upload this batch, then start the next one.
            </div>
          )}
        </div>

        {/* Files skipped at selection time */}
        {rejected.length > 0 && (
          <div className="mt-4 border border-amber-400/30 bg-amber-400/5 p-3" data-testid="bulk-rejected">
            <div className="flex items-center gap-2 text-[11px] text-amber-400 mb-2">
              <AlertTriangle size={11} /> {rejected.length} file{rejected.length > 1 ? "s" : ""} not added
            </div>
            <div className="space-y-1">
              {rejected.map((r, i) => (
                <div key={r.name + i} className="flex justify-between gap-3 text-[11px] text-white/60">
                  <span className="truncate">{r.name}</span>
                  <span className="text-white/40 shrink-0">{r.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staged files */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-1.5">
              {files.map((f, i) => (
                <div
                  key={f.name + f.size + i}
                  className="flex items-center gap-3 border hairline bg-app px-3 py-2"
                  data-testid={`bulk-file-${i}`}
                >
                  <FileText size={12} className="text-brand shrink-0" />
                  <span className="text-xs flex-1 truncate">{f.name}</span>
                  <span className="font-mono text-[10px] text-white/40 shrink-0">{fmtSize(f.size)}</span>
                  <button
                    onClick={() => removeAt(i)}
                    disabled={uploading}
                    className="text-white/30 hover:text-danger transition-colors disabled:opacity-30"
                    data-testid={`bulk-remove-${i}`}
                    aria-label={`Remove ${f.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-4 border border-danger/50 bg-danger/10 px-3 py-2 flex items-start gap-2" data-testid="bulk-error">
            <AlertTriangle size={12} className="text-danger mt-0.5 shrink-0" />
            <span className="text-[11px] text-white/80">{error}</span>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={upload}
              disabled={uploading}
              data-testid="bulk-upload-btn"
              className="bg-brand text-white px-5 py-2.5 text-sm hover:bg-brand/90 transition-colors disabled:opacity-40 inline-flex items-center gap-2 linear-glow"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? `Reading ${files.length}…` : `Upload ${files.length} resume${files.length > 1 ? "s" : ""}`}
            </button>
            <button
              onClick={reset}
              disabled={uploading}
              data-testid="bulk-clear-btn"
              className="text-xs text-white/50 hover:text-white transition-colors disabled:opacity-30"
            >
              Clear
            </button>
            {uploading && (
              <div className="flex-1 h-0.5 bg-white/10 overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Per-file results */}
        {summary && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 border hairline bg-app" data-testid="bulk-summary">
            <div className="flex items-center justify-between px-4 py-3 border-b hairline">
              <div className="font-mono-label">upload results</div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-success">{summary.created} added</span>
                {summary.duplicates > 0 && <span className="text-white/50">{summary.duplicates} duplicate</span>}
                {summary.failed > 0 && <span className="text-amber-400">{summary.failed} skipped</span>}
              </div>
            </div>
            <div className="divide-y divide-white/5 max-h-72 overflow-auto">
              {summary.results.map((r, i) => (
                <div key={r.filename + i} className="flex items-start gap-3 px-4 py-2.5" data-testid={`bulk-result-${i}`}>
                  <span className="mt-0.5 shrink-0">
                    {r.status === "created" ? <Check size={12} className="text-success" />
                      : r.status === "duplicate" ? <Users size={12} className="text-white/40" />
                      : <AlertTriangle size={12} className="text-amber-400" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">
                      {r.name || r.filename}
                      {r.email && <span className="text-white/40 ml-2">{r.email}</span>}
                    </div>
                    <div className="text-[10px] text-white/40 truncate">
                      {r.reason || r.filename}
                      {r.skills?.length > 0 && ` · ${r.skills.slice(0, 4).join(", ")}`}
                    </div>
                  </div>
                  {typeof r.match_score === "number" && (
                    <span className={cx("font-display text-base font-semibold tabular-nums shrink-0",
                      r.match_score >= 90 ? "text-brand" : "text-white/80")}>
                      {r.match_score}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t hairline">
              <button onClick={reset} data-testid="bulk-another-btn"
                className="text-[11px] font-mono text-white/50 hover:text-brand inline-flex items-center gap-1.5 transition-colors">
                <RotateCcw size={10} /> upload another batch
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
