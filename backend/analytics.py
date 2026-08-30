"""
Product analytics — PostHog capture, server-side and fire-and-forget.

Why the server and not just the browser: ad blockers eat a large share of
client-side events, and the moments that decide whether this sells (a resume
that actually parsed, a payment that actually verified) are backend
transitions anyway. The browser layer handles pageviews and session replay;
this handles the funnel.

Disabled unless POSTHOG_API_KEY is set, so local dev, tests and CI never write
into the real project.

PRIVACY — read before adding an event: candidate resumes are personal data
under DPDP, and these properties leave our infrastructure. Send counts,
durations, ids and enums only. Never a name, email, phone, or resume text.
"""
import asyncio
import os

import httpx

POSTHOG_API_KEY = os.environ.get("POSTHOG_API_KEY", "")
POSTHOG_HOST = os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com").rstrip("/")

# asyncio only holds a weak reference to a bare task, so a fire-and-forget
# capture can be garbage-collected mid-flight. Hold them until they finish.
_inflight = set()


def enabled() -> bool:
    return bool(POSTHOG_API_KEY)


async def _send(payload: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=5) as ph:
            await ph.post(f"{POSTHOG_HOST}/capture/", json=payload)
    except Exception:
        # Analytics is never worth a failed request. A dropped event is a
        # missing data point; a raised exception is a broken signup.
        pass


def capture(distinct_id: str, event: str, **properties) -> None:
    """Queue one event. Returns immediately — the POST runs on the event loop
    after the response has already gone out."""
    if not POSTHOG_API_KEY or not distinct_id:
        return
    payload = {
        "api_key": POSTHOG_API_KEY,
        "event": event,
        "distinct_id": distinct_id,
        "properties": {**properties, "$lib": "talent-tailor-backend"},
    }
    try:
        task = asyncio.get_running_loop().create_task(_send(payload))
    except RuntimeError:
        return  # no loop (sync context, e.g. a script) — drop it
    _inflight.add(task)
    task.add_done_callback(_inflight.discard)


def identify(distinct_id: str, **person_properties) -> None:
    """Attach durable properties to the person. Company name is a business
    entity, not personal data, so it's fine here — an email is not."""
    if not POSTHOG_API_KEY or not distinct_id:
        return
    capture(distinct_id, "$identify", **{"$set": person_properties})
