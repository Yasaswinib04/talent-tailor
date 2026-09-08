import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ConfigError from "./components/ConfigError";
import ErrorBoundary from "./components/ErrorBoundary";
import { initAnalytics } from "./lib/analytics";
import { CONFIG_ERROR } from "./lib/api";
import "./index.css";

// No-op unless REACT_APP_POSTHOG_KEY is set.
initAnalytics();

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  CONFIG_ERROR ? (
    <ConfigError message={CONFIG_ERROR} />
  ) : (
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  )
);
