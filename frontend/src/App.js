import React from "react";
import { Routes, Route } from "react-router-dom";
import Report from "./pages/Report";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import JobSetup from "./pages/JobSetup";
import JobDetail from "./pages/JobDetail";
import CandidateProfile from "./pages/CandidateProfile";
import PublicApply from "./pages/PublicApply";
import Themes from "./pages/Themes";
import NotFound from "./pages/NotFound";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./lib/auth";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen grain">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Report />} />
            <Route path="/login" element={<Login />} />
            <Route path="/apply/:slug" element={<PublicApply />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Recruiter console — candidate data lives behind here */}
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

            {/* Internal design explorations — not for customers */}
            <Route
              path="/themes"
              element={
                <RequireAuth>
                  <Themes />
                </RequireAuth>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
