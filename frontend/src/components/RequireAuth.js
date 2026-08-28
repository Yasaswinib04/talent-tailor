import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

/** Gate for every recruiter route. The API enforces this too — this only keeps
 *  the UI honest and avoids rendering a shell that will 401 on every call. */
export default function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  // Don't flash the login screen while the session check is still in flight.
  if (checking) {
    return <div className="min-h-screen bg-app flex items-center justify-center text-white/30 text-sm">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}
