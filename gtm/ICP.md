# Talent Tailor — ICP Lock-In & GTM v1

*Status: working decision doc. Last updated 2026-08-28. Revisit after 20 discovery conversations or the first 5 paid unlocks, whichever comes first.*

---

## 0. Where you actually are

- **Stage:** pre-PMF, 0 paying customers. Everything below is a hypothesis to be tested, not a plan to be executed at scale.
- **Product today:** describe a role → LLM skill extraction → mandatory filters + weighted scoring → ranked shortlist. Top 3 free per role, ₹1,999 one-time unlock for the full list + CSV export. Candidates can come in two ways: recruiter bulk-uploads resumes (20/batch), or applicants apply through a shareable auto-apply link.
- **Demand channels available:** close network, friends & family, HR communities (TPF, AILC), and — critically — a list of real recruiter email contacts accumulated from applying to hundreds of jobs.

At this stage the only job of GTM is: **get 20 honest conversations and 5 paid unlocks from one narrow segment.** Not brand, not scale, not multiple segments.

---

## 1. Your most underweighted asset

You listed the recruiter-email list almost as an afterthought ("honestly, biggest leverage"). It's more than leverage — **it is a pre-qualified ICP sample.**

Think about who is on that list: recruiters who posted roles that attracted hundreds of applicants (you were one of them). Every person on that list has *personally lived* the exact problem Talent Tailor solves — a flooded inbox for a role they had to shortlist manually. You don't have to guess whether they have the problem; their job posting proved it.

That list should **define** your ICP, not just feed it. Look at the list and answer:

- What size companies are they at? (Likely: Indian startups and mid-size tech companies.)
- In-house TA or agency recruiters? What's the split?
- What roles were they hiring for? (High-volume roles = engineering, sales, ops?)

Whatever the modal profile of that list is → that's ICP v1. The rest of this doc assumes it's the profile below; verify against the list and adjust.

---

## 2. ICP v1 — locked (until evidence says otherwise)

**Primary: the in-house recruiter / TA person at an Indian startup or mid-size company (roughly 30–500 employees) running high-inbound roles.**

Specifically, someone who:

- Personally screens **100+ applicants per role** (your HR friend's 800 is the archetype)
- Is on a **1–5 person TA team** — no sourcing agency budget, no ops layer to delegate to
- Manages applicants in **email, Google Drive, spreadsheets, or a lightweight ATS** — *not* Workday/Greenhouse (see §5)
- Is **actively hiring multiple roles** (matters for repeat purchase — see §7)
- Can pay ₹1,999 **without procurement** — personal card, UPI, or a manager's one-line approval

**Secondary (test, don't chase): small recruitment agencies / staffing consultants in India.** They screen constantly, so per-role pricing compounds fast — but their margins are thin and they may want to white-label. Talk to 3–5 of them in your discovery sprint before deciding. Your "talk to consultants, not from a selling perspective" instinct is right — treat them as a discovery segment for now.

### Explicitly OUT for the next 90 days — and why

| Segment | Why not now |
|---|---|
| **Big companies** (the Workday/Greenhouse world) | Procurement cycles, security review, candidate-PII/data-processing agreements, and the very HRMS-export friction you're anxious about. This is where that anxiety is *real*. Park it. |
| **Outside India** | Sell where you can get on a call in the same timezone, where your network works, and where ₹1,999 + manual payment isn't weird. Zero evidence yet that the product retains even your home market. Revisit at 10 paying customers. |
| **Friends & family as "customers"** | Use them for intros and interview practice, not as validation. A friend saying "valuable" is signal; a stranger *paying* is validation. |

The point of an ICP at 0 customers isn't that it's correct — it's that it's **narrow enough that 20 conversations teach you something.** If you talk to agencies, startups, and enterprises simultaneously, 20 conversations teach you nothing about anyone.

---

## 3. Why they buy — what you actually know vs. assume

| Claim | Evidence | Strength |
|---|---|---|
| Shortlisting from a big pool is painful | HR friend, live interview; your own experience as an applicant to 100s of roles | **Validated (n=1 deep + lived)** |
| "Top N" framing is the right output | HR friend reacted specifically to "800 → top 50" | **Validated (n=1)** |
| Skills matching / finding skills is hard | Cousin (HR) | Directional (n=1, secondhand) |
| Download-from-HRMS friction kills the deal | Your anxiety only — the one user you asked said he'd happily drag-and-drop | **Counter-evidence exists** (see §5) |
| They'll pay ₹1,999 per role | Nobody yet | **Untested — this is the whole game** |
| They'll buy repeatedly | "HRs struggle with shortlisting" | Untested assumption |

Two honest observations:

1. **Your validated value prop is one sentence:** *"Give me your 800 resumes, I'll give you a defensible top 50 in minutes, with the skill-match reasons written down."* Time saved is the hook; the *reasons* (defensibility to the hiring manager) may be the deeper value — probe this in interviews.
2. **Drop the "HRs are dumb" framing, even privately.** It's not competence — screening 800 resumes well is genuinely impossible in the time they're given. This matters practically: founders who quietly disrespect their buyer write condescending copy and miss what the buyer is actually optimizing for (looking rigorous to the hiring manager, not just going fast). "Defensible shortlist, fast" sells; "you're bad at this" doesn't.

---

## 4. Strongest use case — pick one and say it everywhere

You said you're not sure. Based on the evidence table, it's already chosen for you:

> **High-inbound role triage: a role gets 100s of applicants → ranked top-N shortlist with per-dimension skill-match scores.**

That's the one use case with live validation, it matches the product's paywall moment (top 3 free → unlock the rest), and your email list is full of people who ran exactly this play.

The auto-apply link is the *second act*, not the pitch: "and for your next role, share this link and the pool arrives pre-parsed." Don't lead with it — nobody has felt that pain until they've felt the triage pain.

---

## 5. The HRMS anxiety, defused

Your worry: "downloading 100s of resumes from Greenhouse/Workday into this system is friction that kills deals."

Three reasons to stop losing sleep over it *for this ICP*:

1. **ICP v1 doesn't have an HRMS.** Their resumes are already in email attachments, a Drive folder, or a Naukri/LinkedIn export. The export problem belongs to the enterprise segment you just parked.
2. **Your one real data point said the opposite.** The HR friend with 800 profiles said he'd download and drag-and-drop the ones he wants. When your only user evidence contradicts your anxiety, the anxiety is about *you*, not the market.
3. **You can absorb the friction yourself while learning.** For the first 10 customers, run it concierge: "email me the resumes / share the Drive folder, I'll have your shortlist by tomorrow morning." You learn exactly where the real friction is, and white-glove service is a feature at this stage, not a cost.

Product follow-ups this implies (small, do when a real customer hits the wall — not before):

- Raise the 20-per-batch bulk-upload cap, or accept a `.zip` of resumes / a Drive folder link.
- The auto-apply link already sidesteps import entirely for *new* roles — that's your long-term answer, and it gets stronger with every role.

If, in discovery, three separate ICP-fit people say "everything lives in Greenhouse and I can't get it out" — *that's* when this becomes real, and the answer is probably an integration or a CSV importer, chosen then, with their workflow in front of you.

---

## 6. The 30-day motion

**Weeks 1–2: 20 discovery conversations.** Sources: your email list (warm-ish — you have a genuine reason to write: "I applied to your X role last year; I've since built something for the other side of that inbox — can I ask you 15 minutes about how you handled the volume?"), TPF, AILC, HR friends' intros, 3–5 agency consultants.

Run them Mom-Test style — past behavior, never hypotheticals:

1. "Walk me through the last role you closed. How many applied?"
2. "What did you actually do with the pile? How long did shortlisting take, start to finish?"
3. "Where do the resumes live right now?" *(this settles §5 empirically)*
4. "How did you decide who made the shortlist? Did anyone push back on it?"
5. "Have you ever paid for a tool with your own/team card? What was it?"
6. Only at the end, if it fits: "I built something for this — want to see it on your real pile?"

Question 5 is the qualifier: someone who has never spent ₹2k on a tool without procurement probably can't be your first customer regardless of pain.

**Weeks 2–4: 5 concierge pilots** from the best conversations. Real resumes, real role, you drive the upload. Free to see the top 3 (that's the product's own paywall). Then ask for the ₹1,999 — actually ask. The ask is the experiment.

---

## 7. Will they keep buying?

Per-role pricing means retention = **roles per account per quarter**. So repeat purchase is a property of *who you sell to*, not just product quality:

- A startup hiring 1 role/year → one-time revenue no matter how much they love it.
- A startup hiring 3–5 roles/quarter, or an agency → compounding.

Add to the ICP qualifier: **"actively hiring multiple roles."** And instrument it from day one: the single most important number in your first 90 days is **how many customers unlock a *second* role.** One customer paying twice unprompted is worth more than five paying once.

---

## 8. Metrics, north star, and what success looks like

### North star (pre-PMF): **paid role unlocks per month**

It's the one number that combines "reached the value moment" + "willing to pay." Resumes-screened or signups would flatter you; unlocks can't.

*(Post-PMF this likely evolves to something usage-shaped like "candidates shortlisted through Talent Tailor per week" — but not yet. Right now revenue events are your only honest signal.)*

### The funnel and its input metrics

| Stage | Metric | 90-day target |
|---|---|---|
| Learn | Discovery conversations / week | 5/wk → 20 total by week 4 |
| Try | Activated workspaces (≥1 role created + resumes in) | 10 |
| Value | Roles reaching a viewed shortlist (top-3 seen) | 10 |
| **Pay** | **Paid unlocks (north star)** | **5** |
| Retain | Accounts with a 2nd paid unlock | 2 |
| Refer | Unprompted intros/referrals | 1+ |

Also track qualitatively, per conversation: where their resumes live (settles §5), how long shortlisting took them, and their reaction at the payment ask (the exact words).

### Success / kill signals at day 90

- **Success:** 5 paid unlocks, ≥2 repeat buyers, and you can predict *before a demo* whether someone will pay. → Narrow further and repeat the motion at 2× volume.
- **Soft signal:** lots of activated workspaces, top-3 views, no payments → the value moment or the price is wrong; run 5 pricing conversations before touching the product.
- **Kill/pivot signal:** you can't even get 20 conversations from a warm list + communities → the pain isn't salient enough for this segment; revisit the agency segment or the use case.

---

## 9. Open questions this doc deliberately leaves for evidence

1. What's the modal profile on your email list? (Do §1 this week — it might move the ICP.)
2. In-house vs. agency: which converts to *paid* faster? (Decided by the pilots, not by reasoning.)
3. Is the buyer's deeper motive speed, or defensibility to the hiring manager? (Changes all your copy.)
4. Is ₹1,999/role the right unit? (Per-role vs. monthly comes up naturally the moment someone unlocks twice.)
