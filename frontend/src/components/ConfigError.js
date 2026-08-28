import React from "react";

/** Shown when the bundle was built without REACT_APP_BACKEND_URL. Nothing in
 *  the app can work in that state, so say so plainly rather than rendering a
 *  shell that fails every request. */
export default function ConfigError({ message }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#fff", display: "flex",
                  alignItems: "center", justifyContent: "center", padding: 32,
                  fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 560 }} data-testid="config-error">
        <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em",
                      textTransform: "uppercase", color: "#8B0000", marginBottom: 12 }}>
          configuration error
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 12px" }}>
          This build can't reach its backend.
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
          {message} It is read at build time and baked into the bundle, so restarting
          the server won't help — it needs to be set and then rebuilt.
        </p>
        <pre style={{ background: "#141414", border: "1px solid #262626", padding: 16,
                      fontSize: 12, overflowX: "auto", color: "rgba(255,255,255,0.8)" }}>
{`# frontend/.env.production
REACT_APP_BACKEND_URL=https://api.example.com

npm run build`}
        </pre>
      </div>
    </div>
  );
}
