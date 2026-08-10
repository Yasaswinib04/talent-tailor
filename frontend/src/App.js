import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Report from "./pages/Report";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import JobSetup from "./pages/JobSetup";
import JobDetail from "./pages/JobDetail";
import CandidateProfile from "./pages/CandidateProfile";
import PublicApply from "./pages/PublicApply";
import Auth from "./pages/Auth";
import Themes from "./pages/Themes";
import AppShell from "./components/AppShell";
import { getToken } from "./lib/api";

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen grain">
      <Routes>
        {/* The front door is the product, not the design case study. The report
            is good work for a different audience — it lives at /report. */}
        <Route path="/" element={<Landing />} />
        <Route path="/report" element={<Report />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/signup" element={<Auth mode="signup" />} />
        {/* Candidates applying via the share link are never gated — accounts are
            for recruiters, not applicants. */}
        <Route path="/apply/:slug" element={<PublicApply />} />
        <Route path="/themes" element={<Themes />} />
        {/* Workspaces are per-account now that real hiring data lives here, so
            the app itself sits behind sign-in. Discovery still comes before any
            payment: a new account can load sample data and run the whole flow free. */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
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
