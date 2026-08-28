import React from "react";
import { Routes, Route } from "react-router-dom";
import Report from "./pages/Report";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import JobSetup from "./pages/JobSetup";
import JobDetail from "./pages/JobDetail";
import CandidateProfile from "./pages/CandidateProfile";
import PublicApply from "./pages/PublicApply";
import Themes from "./pages/Themes";
import NotFound from "./pages/NotFound";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen grain">
        <Routes>
          <Route path="/" element={<Report />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/apply/:slug" element={<PublicApply />} />
          <Route path="/themes" element={<Themes />} />
          <Route element={<AppShell />}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/jobs/new" element={<JobSetup />} />
            <Route path="/app/jobs/:jobId" element={<JobDetail />} />
            <Route path="/app/candidates/:cid" element={<CandidateProfile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}
