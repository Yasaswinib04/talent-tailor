import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/** Shared failure panel — every data-loading screen shows this instead of an
 *  empty shell when its fetch fails. */
export default function ErrorState({ message, onRetry, action, testid = "error-state" }) {
  return (
    <div className="border border-danger/50 bg-danger/10 p-8 text-center" data-testid={testid}>
      <AlertTriangle size={20} className="text-danger mx-auto mb-3" />
      <div className="text-sm mb-4 text-white/80">{message}</div>
      <div className="flex items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            data-testid={`${testid}-retry`}
            className="border hairline hover:border-white text-xs px-4 py-2 inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={11} /> Retry
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
