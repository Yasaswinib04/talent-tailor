import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initAnalytics } from "./lib/analytics";
import "./index.css";

// No-op unless REACT_APP_POSTHOG_KEY is set.
initAnalytics();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
