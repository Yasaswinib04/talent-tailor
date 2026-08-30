import posthog from "posthog-js";

/**
 * Client analytics: pageviews, session replay, and the browser half of the
 * funnel. The backend sends the events that must not be lost to ad blockers
 * (see backend/analytics.py); this sends what only the browser can see.
 *
 * No key set → every function here is a no-op. That's the local-dev and CI
 * path, so nobody has to think about polluting the real project.
 *
 * PRIVACY: recruiters look at real candidate resumes in this app. Replay is on,
 * but every text input is masked and anything rendering candidate identity is
 * marked [data-private] and masked too. When you add a view that shows a
 * candidate's name, email, phone or resume text, put data-private on it.
 */

const KEY = process.env.REACT_APP_POSTHOG_KEY;
const HOST = process.env.REACT_APP_POSTHOG_HOST || "https://us.i.posthog.com";

let ready = false;

export function initAnalytics() {
  // The old Vite app shipped a "phc_mock_key_replace_me" placeholder; guard
  // against that class of value so a stale env var can't half-enable this.
  if (!KEY || KEY.startsWith("phc_mock") || ready) return;

  posthog.init(KEY, {
    api_host: HOST,
    // We send pageviews on route change instead — this is a SPA, so the
    // automatic one only ever fires on the first load.
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage",
    session_recording: {
      // Everything typed — passwords, candidate details on the apply form,
      // unlock codes — never reaches the recording.
      maskAllInputs: true,
      // Rendered candidate identity. Replay still shows layout and behaviour,
      // which is the part worth watching.
      maskTextSelector: "[data-private]",
    },
  });
  ready = true;
}

export function trackPageview(path) {
  if (!ready) return;
  posthog.capture("$pageview", { $current_url: window.location.origin + path });
}

export function track(event, properties = {}) {
  if (!ready) return;
  posthog.capture(event, properties);
}

/** Called after sign-in/sign-up so browser events stitch to the same person
 *  the backend reports on. Email deliberately omitted — the user id is enough
 *  to join, and it keeps PII out of the analytics project. */
export function identify(user) {
  if (!ready || !user?.id) return;
  posthog.identify(user.id, { company: user.company || null });
}

export function resetAnalytics() {
  if (!ready) return;
  posthog.reset(); // on sign-out, so the next user isn't merged into this one
}
