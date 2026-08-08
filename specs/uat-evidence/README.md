# UAT evidence — 2026-08-08

Screenshots captured from the production CRA build running against a live
backend, Chromium 1194. Referenced from `../uat-report-2026-08-08.md`.

**Read these with one caveat:** the test sandbox proxies outbound HTTPS and
blocks Google Fonts, Fontshare, Unsplash and Pexels. Custom typography falls
back to system fonts and avatars/hero images render empty. That is an artifact
of the environment, not a product defect — though it does illustrate the
third-party CDN dependency noted in the report.

| File | Finding |
|---|---|
| `05-criteria.png` | P1-5 — recommended filters report "0 of 20 candidates would pass" |
| `08-blank-apply.png` | P1-1 — application submitted with empty name and email |
| `12-backend-down.png` | P1-6 — API unreachable renders an empty shell, no error, no retry |
| `13-404.png` | P1-6 — unknown candidate id spins on "Loading…" indefinitely |
| `14-mobile.png` | P2-7 — 832 px of content in a 390 px viewport |
