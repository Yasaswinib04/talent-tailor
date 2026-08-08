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
import AppShell from "./components/AppShell";
import SignInGate from "./components/SignInGate";

export default function App() {
  return (
    <div className="min-h-screen grain">
      <Routes>
        <Route path="/" element={<Report />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* Candidates applying via the share link are never gated — the gate is
            for identifying HRs trying the product, not applicants. */}
        <Route path="/apply/:slug" element={<PublicApply />} />
        <Route path="/themes" element={<Themes />} />
        <Route
          element={
            <SignInGate>
              <AppShell />
            </SignInGate>
          }
        >
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/jobs/new" element={<JobSetup />} />
          <Route path="/app/jobs/:jobId" element={<JobDetail />} />
          <Route path="/app/candidates/:cid" element={<CandidateProfile />} />
        </Route>
      </Routes>
    </div>
  );
}
