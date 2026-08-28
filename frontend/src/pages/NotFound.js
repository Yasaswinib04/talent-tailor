import React from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-app text-white flex items-center justify-center p-8">
      <div className="text-center" data-testid="not-found">
        <Compass size={24} className="text-brand mx-auto mb-4" />
        <div className="font-mono-label mb-3">error · 404</div>
        <h1 className="font-display text-3xl font-semibold mb-2">This page doesn't exist.</h1>
        <p className="text-white/50 text-sm mb-8">The link may be out of date, or the role may have been closed.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/app" className="bg-brand text-white px-5 py-2.5 text-sm hover:bg-brand/90 transition-colors linear-glow">
            Go to the dashboard
          </Link>
          <Link to="/" className="text-sm text-white/50 hover:text-white transition-colors px-3">
            Back to the report
          </Link>
        </div>
      </div>
    </div>
  );
}
