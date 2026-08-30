"""
Talent Tailor - Backend API
Candidate shortlisting: LLM-parsed resumes, deterministic scoring, per-account
workspaces, and a per-role paywall (top-3 free preview, unlock for the rest).
"""
import asyncio
import csv
import hashlib
import hmac
import io
import os
import re
import uuid
import zlib

import httpx
from datetime import datetime, timezone
from typing import List, Optional

import certifi
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator

import analytics
import llm
import security

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Paywall: every job shows its top FREE_REVEAL candidates in full; the rest are
# ranked but identity-redacted until the job is unlocked. UNLOCK_CODE is the
# manual-payment bridge — buyer pays (UPI/invoice), operator shares the code,
# job unlocks. Swap for a Razorpay webhook without touching the data model.
FREE_REVEAL = int(os.environ.get("FREE_REVEAL", "3"))
UNLOCK_CODE = os.environ.get("UNLOCK_CODE", "")
UNLOCK_PRICE_INR = int(os.environ.get("UNLOCK_PRICE_INR", "1999"))

# Payment rails, in order of preference at runtime:
#   1. Razorpay checkout (both keys set) — verified server-side, auto-unlocks.
#   2. Direct UPI (UPI_VPA set) — buyer pays the VPA, operator sends UNLOCK_CODE.
#   3. Neither — the modal shows contact-the-team copy with code entry only.
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
UPI_VPA = os.environ.get("UPI_VPA", "")
UPI_PAYEE_NAME = os.environ.get("UPI_PAYEE_NAME", "Talent Tailor")


def _razorpay_enabled() -> bool:
    return bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)

# Fictional demo dataset only seeds when explicitly asked for (local dev,
# hosted demo). A paying customer's empty database must stay empty.
SEED_DEMO_DATA = os.environ.get("SEED_DEMO_DATA", "0") == "1"

# Operator-only endpoints (lead list). Disabled unless the key is set.
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")

# For Atlas (mongodb+srv) pin the CA bundle explicitly. Without it, hosts whose
# system trust store isn't wired up for Python throw CERTIFICATE_VERIFY_FAILED;
# certifi ships a known-good bundle so TLS verifies everywhere. Harmless for a
# plain local mongodb:// connection (tlsCAFile is ignored when TLS is off).
_client_opts = {"tlsCAFile": certifi.where()} if "mongodb+srv" in MONGO_URL else {}
client = AsyncIOMotorClient(MONGO_URL, **_client_opts)
db = client[DB_NAME]

app = FastAPI(title="Talent Tailor API")

# Bearer tokens, not cookies, so credentials-mode CORS is unnecessary — and
# "*" origins with credentials enabled is spec-invalid anyway. Set
# CORS_ORIGINS to the deployed frontend origin(s), comma-separated.
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$"


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    company: str = ""
    password_hash: str = ""
    created_at: str = Field(default_factory=now_iso)


class SignupRequest(BaseModel):
    name: str
    email: str
    company: Optional[str] = ""
    password: str

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str):
        if not (v or "").strip():
            raise ValueError("name is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str):
        if not re.match(EMAIL_RE, (v or "").strip()):
            raise ValueError("a valid email address is required")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_strong_enough(cls, v: str):
        if len(v or "") < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class UnlockRequest(BaseModel):
    code: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str = ""
    title: str
    department: str
    location: str
    employment_type: str = "Full-time"
    seniority: str = "Mid"
    salary_min: int = 1200000
    salary_max: int = 2400000
    jd: str = ""
    skills: List[dict] = []  # [{name, weight}]
    screening_questions: List[str] = []
    filters: dict = Field(default_factory=dict)  # {min_experience, education, notice_period, must_have_skills, preferred_companies, locations}
    scoring_weights: dict = Field(default_factory=dict)  # {skills, experience, education, notice, cultural_fit} summing ~100
    status: str = "open"
    created_at: str = Field(default_factory=now_iso)
    candidates_count: int = 0
    share_slug: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    unlocked: bool = False
    unlocked_at: Optional[str] = None


class JobCreate(BaseModel):
    title: str
    department: str
    location: str
    employment_type: Optional[str] = "Full-time"
    seniority: Optional[str] = "Mid"
    salary_min: Optional[int] = 1200000
    salary_max: Optional[int] = 2400000
    jd: Optional[str] = ""
    skills: Optional[List[dict]] = []
    screening_questions: Optional[List[str]] = []
    filters: Optional[dict] = None
    scoring_weights: Optional[dict] = None


# The client owns these; everything else (owner_id, unlocked, share_slug…) is
# server-controlled and must not be reachable through a PATCH body.
JOB_PATCHABLE_FIELDS = {
    "title", "department", "location", "employment_type", "seniority",
    "salary_min", "salary_max", "jd", "skills", "screening_questions",
    "filters", "scoring_weights", "status",
}


class ExtractSkillsRequest(BaseModel):
    jd: str


class FilterPreviewRequest(BaseModel):
    filters: dict
    skills: Optional[List[dict]] = []


class Candidate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str = ""
    name: str
    email: str
    phone: str
    current_title: str
    current_company: str
    location: str
    experience_years: float
    expected_ctc: int
    notice_period: str
    skills: List[str] = []
    education: str
    resume_summary: str
    avatar: str = ""
    match_score: int = 0
    stage: str = "New"  # New, Shortlisted, Interview, Offer, Rejected
    role_ids: List[str] = []  # multiple roles!
    tags: List[str] = []
    rating: int = 0
    notes: str = ""
    applied_at: str = Field(default_factory=now_iso)
    auto_applied: bool = False


class CandidateApply(BaseModel):
    name: str
    email: str
    phone: str
    current_title: str
    current_company: str
    experience_years: float
    expected_ctc: int
    resume_text: Optional[str] = ""
    # Skills parsed by the LLM on the parse step ride through the form submit,
    # so the ranked profile reflects the actual resume, not a keyword scan.
    skills: Optional[List[str]] = []
    # Captured at apply time so auto-applied candidates are filterable on the
    # same fields the mandatory criteria screen on.
    location: Optional[str] = ""
    education: Optional[str] = ""
    notice_period: Optional[str] = ""

    @field_validator("name", "current_title", "current_company")
    @classmethod
    def not_blank(cls, v: str, info):
        if not (v or "").strip():
            raise ValueError(f"{info.field_name.replace('_', ' ')} is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def valid_email(cls, v: str):
        if not re.match(EMAIL_RE, (v or "").strip()):
            raise ValueError("a valid email address is required")
        return v.strip().lower()

    @field_validator("experience_years")
    @classmethod
    def sane_experience(cls, v: float):
        if v < 0 or v > 60:
            raise ValueError("experience must be between 0 and 60 years")
        return v


class Visitor(BaseModel):
    """Someone who left their details after reaching a result.

    Identification, not authentication — no password, no session. Captured at
    the activation moment (they have a shortlist on screen), never as a gate in
    front of the product. `source` records which moment converted them, so it's
    possible to tell what actually earns an email.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    company: Optional[str] = ""
    source: Optional[str] = "unknown"
    first_seen: str = Field(default_factory=now_iso)
    last_seen: str = Field(default_factory=now_iso)
    visits: int = 1

    @field_validator("name")
    @classmethod
    def visitor_name_not_blank(cls, v: str):
        if not (v or "").strip():
            raise ValueError("name is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def visitor_valid_email(cls, v: str):
        if not re.match(EMAIL_RE, (v or "").strip()):
            raise ValueError("a valid email address is required")
        return v.strip().lower()


class RoleAssignment(BaseModel):
    role_ids: List[str]


class StageUpdate(BaseModel):
    stage: str


# ---------- Auth ----------
def _public_user(u: dict) -> dict:
    return {k: u.get(k) for k in ("id", "name", "email", "company", "created_at")}


async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Not signed in")
    uid = security.read_token(authorization.split(" ", 1)[1].strip())
    if not uid:
        raise HTTPException(401, "Session expired — please sign in again")
    user = await db.users.find_one({"id": uid})
    if not user:
        raise HTTPException(401, "Account not found")
    return user


@app.post("/api/auth/signup")
async def signup(payload: SignupRequest):
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(409, "An account with this email already exists — sign in instead")
    user = User(
        name=payload.name,
        email=payload.email,
        company=(payload.company or "").strip(),
        password_hash=security.hash_password(payload.password),
    )
    await db.users.insert_one(user.model_dump())
    analytics.identify(user.id, company=user.company or None, signup_date=user.created_at)
    analytics.capture(user.id, "signed_up", has_company=bool(user.company))
    return {"token": security.make_token(user.id), "user": _public_user(user.model_dump())}


@app.post("/api/auth/login")
async def login(payload: LoginRequest):
    user = await db.users.find_one({"email": (payload.email or "").strip().lower()})
    if not user or not security.verify_password(payload.password or "", user.get("password_hash", "")):
        raise HTTPException(401, "Wrong email or password")
    return {"token": security.make_token(user["id"]), "user": _public_user(user)}


@app.get("/api/auth/me")
async def me(user: dict = Depends(current_user)):
    return _public_user(user)


# ---------- Sample Data ----------
SEED_JOBS = [
    {
        "title": "Senior Frontend Engineer",
        "department": "Engineering",
        "location": "Bengaluru",
        "seniority": "Senior",
        "salary_min": 3500000,
        "salary_max": 6500000,
        "jd": "We are looking for a Senior Frontend Engineer with deep expertise in React, TypeScript, and modern web performance. You will lead the UI architecture of our flagship consumer product used by millions in India.",
        "skills": [
            {"name": "React", "weight": 5},
            {"name": "TypeScript", "weight": 5},
            {"name": "Next.js", "weight": 4},
            {"name": "Performance Optimization", "weight": 4},
            {"name": "Design Systems", "weight": 3},
        ],
        "screening_questions": [
            "How many years of production React experience do you have?",
            "Have you led design system work? Briefly describe.",
        ],
    },
    {
        "title": "Product Manager - Payments",
        "department": "Product",
        "location": "Bengaluru",
        "seniority": "Senior",
        "salary_min": 4000000,
        "salary_max": 7500000,
        "jd": "Own the roadmap for our UPI & credit card payments experience. Deep collaboration with Engineering, Design, Risk, and Growth. Prior fintech experience is a strong plus.",
        "skills": [
            {"name": "Product Strategy", "weight": 5},
            {"name": "Fintech", "weight": 5},
            {"name": "UPI / Payments", "weight": 4},
            {"name": "SQL", "weight": 3},
            {"name": "A/B Testing", "weight": 3},
        ],
        "screening_questions": [
            "Describe a 0-1 fintech product you shipped.",
        ],
    },
    {
        "title": "Backend Engineer - Platform",
        "department": "Engineering",
        "location": "Bengaluru / Remote",
        "seniority": "Mid",
        "salary_min": 2500000,
        "salary_max": 4500000,
        "jd": "Build the platform APIs & event-driven services that power our product. Golang, PostgreSQL, Kafka, AWS.",
        "skills": [
            {"name": "Golang", "weight": 5},
            {"name": "PostgreSQL", "weight": 4},
            {"name": "Kafka", "weight": 4},
            {"name": "AWS", "weight": 3},
            {"name": "Distributed Systems", "weight": 4},
        ],
        "screening_questions": [],
    },
    {
        "title": "UX Researcher",
        "department": "Design",
        "location": "Bengaluru",
        "seniority": "Mid",
        "salary_min": 2200000,
        "salary_max": 3800000,
        "jd": "Lead qualitative & quantitative research studies for our consumer experiences. Craft insight narratives that drive product decisions.",
        "skills": [
            {"name": "Qualitative Research", "weight": 5},
            {"name": "Usability Testing", "weight": 5},
            {"name": "Survey Design", "weight": 3},
            {"name": "Figma", "weight": 3},
        ],
        "screening_questions": [],
    },
]

SEED_CANDIDATES_TEMPLATE = [
    ("Rohan Sharma", "rohan.sharma@email.in", "Sr. Frontend Engineer", "Razorpay", "Bengaluru", 6.5, 4200000, "30 days", ["React", "TypeScript", "Next.js", "GraphQL", "Design Systems"], "B.Tech, IIT Bombay", 92, "Shortlisted"),
    ("Priya Desai", "priya.desai@email.in", "Product Manager", "Swiggy", "Bengaluru", 5.0, 5500000, "60 days", ["Product Strategy", "Fintech", "UPI / Payments", "SQL"], "MBA, IIM Ahmedabad", 88, "Interview"),
    ("Anand Iyer", "anand.iyer@email.in", "Backend Lead", "Flipkart", "Bengaluru", 8.0, 5200000, "90 days", ["Golang", "PostgreSQL", "Kafka", "AWS", "Distributed Systems"], "M.Tech, IIT Madras", 95, "Interview"),
    ("Kavita Rangan", "kavita.r@email.in", "UX Researcher", "Zomato", "Bengaluru", 4.0, 3000000, "30 days", ["Qualitative Research", "Usability Testing", "Figma"], "M.Des, IDC IIT Bombay", 85, "Shortlisted"),
    ("Arjun Mehta", "arjun.mehta@email.in", "Frontend Engineer", "PhonePe", "Bengaluru", 4.5, 3200000, "60 days", ["React", "TypeScript", "Redux", "Performance Optimization"], "B.E., BITS Pilani", 81, "New"),
    ("Sneha Iyer", "sneha.iyer@email.in", "Product Manager", "CRED", "Bengaluru", 3.5, 3800000, "Immediate", ["Product Strategy", "A/B Testing", "SQL", "UPI / Payments"], "B.Tech, NIT Trichy", 79, "New"),
    ("Vikram Rao", "vikram.rao@email.in", "Backend Engineer", "Cred", "Remote", 5.5, 3600000, "30 days", ["Golang", "PostgreSQL", "AWS", "Kafka"], "B.Tech, VIT Vellore", 87, "Shortlisted"),
    ("Neha Kapoor", "neha.kapoor@email.in", "Senior Frontend", "Meesho", "Bengaluru", 7.0, 4800000, "60 days", ["React", "TypeScript", "Next.js", "Design Systems"], "B.Tech, IIT Delhi", 90, "Interview"),
    ("Karthik Subramanian", "karthik.s@email.in", "Backend Engineer", "Ola", "Bengaluru", 3.0, 2400000, "Immediate", ["Golang", "PostgreSQL", "Distributed Systems"], "B.Tech, IIT Kanpur", 76, "New"),
    ("Ananya Reddy", "ananya.reddy@email.in", "UX Researcher", "Freshworks", "Bengaluru", 5.5, 3400000, "30 days", ["Qualitative Research", "Usability Testing", "Survey Design"], "M.Sc., Srishti Institute", 89, "Shortlisted"),
    ("Rahul Nair", "rahul.nair@email.in", "Frontend Engineer", "Groww", "Remote", 2.5, 1800000, "Immediate", ["React", "TypeScript", "Redux"], "B.E., PES University", 68, "New"),
    ("Meera Krishnan", "meera.k@email.in", "Product Manager", "Zerodha", "Bengaluru", 6.0, 5000000, "60 days", ["Product Strategy", "Fintech", "SQL", "A/B Testing"], "MBA, ISB Hyderabad", 91, "Offer"),
    ("Aditya Bhatia", "aditya.b@email.in", "Backend Lead", "Paytm", "Noida", 9.0, 5800000, "90 days", ["Golang", "Kafka", "AWS", "Distributed Systems", "PostgreSQL"], "M.Tech, IIT Roorkee", 93, "Offer"),
    ("Divya Menon", "divya.menon@email.in", "Product Designer", "Postman", "Bengaluru", 4.0, 2800000, "30 days", ["Figma", "Design Systems", "Usability Testing"], "B.Des, NID Ahmedabad", 82, "Shortlisted"),
    ("Siddharth Jain", "siddharth.j@email.in", "Senior Frontend", "InMobi", "Bengaluru", 6.5, 4500000, "60 days", ["React", "TypeScript", "Performance Optimization", "GraphQL"], "B.Tech, DTU Delhi", 86, "Interview"),
    ("Pooja Agarwal", "pooja.a@email.in", "UX Researcher", "MakeMyTrip", "Gurgaon", 3.5, 2600000, "Immediate", ["Qualitative Research", "Survey Design"], "M.Des, IIT Guwahati", 74, "New"),
    ("Nikhil Verma", "nikhil.v@email.in", "Product Manager", "Meesho", "Bengaluru", 4.5, 4200000, "30 days", ["Product Strategy", "SQL", "A/B Testing", "Fintech"], "MBA, IIM Bangalore", 83, "Shortlisted"),
    ("Isha Patel", "isha.patel@email.in", "Frontend Engineer", "Rippling", "Remote", 3.0, 2600000, "60 days", ["React", "TypeScript", "Next.js"], "B.Tech, IIIT Hyderabad", 78, "New"),
    ("Rajesh Kumar", "rajesh.k@email.in", "Backend Engineer", "Zerodha", "Bengaluru", 5.0, 3400000, "30 days", ["Golang", "PostgreSQL", "AWS"], "B.Tech, NIT Warangal", 84, "Shortlisted"),
    ("Tanvi Shah", "tanvi.shah@email.in", "Product Designer", "Dunzo", "Bengaluru", 4.5, 3000000, "60 days", ["Figma", "Design Systems", "Usability Testing"], "B.Des, IIT Bombay", 87, "Interview"),
]

AVATAR_POOL = [
    "https://images.unsplash.com/photo-1542190891-2093d38760f2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1722061666207-b75ca92f8d0f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1589386417686-0d34b5903d23?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop",
]


async def _insert_sample_data(owner_id: str) -> dict:
    """Fictional jobs + candidates into one workspace. Fresh ids each call."""
    job_docs = []
    for j in SEED_JOBS:
        job = Job(**j, owner_id=owner_id)
        job_docs.append(job.model_dump())
    await db.jobs.insert_many(job_docs)
    cand_docs = []
    for idx, tup in enumerate(SEED_CANDIDATES_TEMPLATE):
        name, email, title, company, loc, exp, ctc, notice, skills, edu, score, stage = tup
        # assign to matching jobs (by skill overlap)
        assigned = []
        for jd in job_docs:
            job_skill_names = [s["name"] for s in jd["skills"]]
            overlap = len(set(skills) & set(job_skill_names))
            if overlap >= 2:
                assigned.append(jd["id"])
        if not assigned:
            assigned = [job_docs[idx % len(job_docs)]["id"]]
        c = Candidate(
            owner_id=owner_id,
            name=name,
            email=email,
            phone=f"+91 9{80000000 + idx * 137:08d}"[:14],
            current_title=title,
            current_company=company,
            location=loc,
            experience_years=exp,
            expected_ctc=ctc,
            notice_period=notice,
            skills=skills,
            education=edu,
            resume_summary=f"{exp} years of experience at {company} working as {title}. Strong background in {', '.join(skills[:3])}.",
            avatar=AVATAR_POOL[idx % len(AVATAR_POOL)],
            match_score=score,
            stage=stage,
            role_ids=assigned,
            tags=["sample"],
            rating=(score // 20),
        )
        cand_docs.append(c.model_dump())
    await db.candidates.insert_many(cand_docs)
    for jd in job_docs:
        count = sum(1 for c in cand_docs if jd["id"] in c["role_ids"])
        await db.jobs.update_one({"id": jd["id"]}, {"$set": {"candidates_count": count}})
    return {"jobs": len(job_docs), "candidates": len(cand_docs)}


@app.post("/api/sample-data")
async def load_sample_data(user: dict = Depends(current_user)):
    """Fill an empty workspace with fictional data so a new account has
    something to explore before wiring up a real role."""
    existing = await db.jobs.count_documents({"owner_id": user["id"]})
    if existing > 0:
        raise HTTPException(409, "This workspace already has roles — sample data only loads into an empty one")
    return await _insert_sample_data(user["id"])


@app.on_event("startup")
async def seed():
    await db.users.create_index("email")
    await db.jobs.create_index("owner_id")
    await db.jobs.create_index("share_slug")
    await db.candidates.create_index("owner_id")
    await db.candidates.create_index("role_ids")
    if SEED_DEMO_DATA and await db.jobs.count_documents({}) == 0:
        await _insert_sample_data("demo")


def strip_mongo(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc


# ---------- Routes ----------
@app.get("/api/health")
async def health():
    return {"status": "ok", "time": now_iso(), "llm": llm.enabled()}


@app.get("/api/jobs")
async def list_jobs(user: dict = Depends(current_user)):
    jobs = await db.jobs.find({"owner_id": user["id"]}).to_list(1000)
    return [strip_mongo(j) for j in jobs]


@app.post("/api/jobs")
async def create_job(payload: JobCreate, user: dict = Depends(current_user)):
    # Drop unset optionals so Job's own defaults apply — filters and scoring_weights
    # arrive as None when omitted, which its dict fields reject.
    job = Job(**{k: v for k, v in payload.model_dump().items() if v is not None}, owner_id=user["id"])
    doc = job.model_dump()
    await db.jobs.insert_one(doc)  # mutates doc, adding a non-serialisable _id
    # Publishing a role runs its filters over the pool and attaches everyone who
    # clears them, so the "N will pass" preview is the shortlist the recruiter gets.
    matched = await _attach_matching_candidates(doc)
    # jobs_total tells us whether this is their first role or their tenth —
    # the difference between activation and habit.
    analytics.capture(
        user["id"],
        "job_created",
        job_id=job.id,
        matched_candidates=matched,
        has_filters=bool(payload.filters),
        jobs_total=await db.jobs.count_documents({"owner_id": user["id"]}),
    )
    out = job.model_dump()
    out["candidates_count"] = matched
    return out


async def _attach_matching_candidates(job: dict) -> int:
    """Attach every candidate in this workspace passing the role's filters."""
    cands = await db.candidates.find({"owner_id": job.get("owner_id", "")}).to_list(1000)
    matched_ids = [c["id"] for c in cands if not _filter_failures(c, job.get("filters") or {})]
    if matched_ids:
        await db.candidates.update_many(
            {"id": {"$in": matched_ids}}, {"$addToSet": {"role_ids": job["id"]}}
        )
    # Count actual membership, not just filter matches — a recruiter may have
    # assigned someone by hand who the filters would not have picked up.
    count = await db.candidates.count_documents({"role_ids": job["id"]})
    await db.jobs.update_one({"id": job["id"]}, {"$set": {"candidates_count": count}})
    return count


async def _owned_job(job_id: str, user: dict) -> dict:
    job = await db.jobs.find_one({"id": job_id, "owner_id": user["id"]})
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str, user: dict = Depends(current_user)):
    return strip_mongo(await _owned_job(job_id, user))


@app.get("/api/jobs/share/{slug}")
async def get_job_by_slug(slug: str):
    job = await db.jobs.find_one({"share_slug": slug})
    if not job:
        raise HTTPException(404, "Job not found")
    job = strip_mongo(job)
    # Public page: the applicant needs the role, not the recruiter's rubric
    # or workspace internals.
    for k in ("owner_id", "unlocked", "unlocked_at", "filters", "scoring_weights", "candidates_count"):
        job.pop(k, None)
    return job


@app.patch("/api/jobs/{job_id}")
async def update_job(job_id: str, payload: dict, user: dict = Depends(current_user)):
    await _owned_job(job_id, user)
    changes = {k: v for k, v in payload.items() if k in JOB_PATCHABLE_FIELDS}
    if not changes:
        raise HTTPException(422, "No editable fields in payload")
    await db.jobs.update_one({"id": job_id}, {"$set": changes})
    job = await db.jobs.find_one({"id": job_id})
    if "filters" in changes:
        # Loosening the criteria should pull newly-qualifying people in.
        await _attach_matching_candidates(job)
        job = await db.jobs.find_one({"id": job_id})
    return strip_mongo(job)


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(current_user)):
    await _owned_job(job_id, user)
    await db.jobs.delete_one({"id": job_id})
    return {"ok": True}


# ---------- Paywall ----------
@app.post("/api/jobs/{job_id}/unlock")
async def unlock_job(job_id: str, payload: UnlockRequest, user: dict = Depends(current_user)):
    """Manual-payment bridge: operator shares the unlock code once paid.
    Replace the code check with a Razorpay webhook to go fully self-serve."""
    job = await _owned_job(job_id, user)
    if job.get("unlocked"):
        return {"ok": True, "already": True}
    if not UNLOCK_CODE:
        raise HTTPException(503, "Unlocking isn't live yet — contact the Talent Tailor team")
    if (payload.code or "").strip() != UNLOCK_CODE:
        raise HTTPException(403, "That unlock code isn't valid")
    await db.jobs.update_one({"id": job_id}, {"$set": {"unlocked": True, "unlocked_at": now_iso()}})
    analytics.capture(user["id"], "shortlist_unlocked", job_id=job_id, rail="code", amount_inr=UNLOCK_PRICE_INR)
    return {"ok": True}


@app.get("/api/billing/config")
async def billing_config(user: dict = Depends(current_user)):
    """What payment rails the frontend should offer, without leaking secrets."""
    return {
        "price_inr": UNLOCK_PRICE_INR,
        "razorpay": _razorpay_enabled(),
        "razorpay_key_id": RAZORPAY_KEY_ID if _razorpay_enabled() else None,
        "upi_vpa": UPI_VPA or None,
        "upi_payee": UPI_PAYEE_NAME,
        "unlock_code_enabled": bool(UNLOCK_CODE),
    }


@app.post("/api/jobs/{job_id}/create-order")
async def create_payment_order(job_id: str, user: dict = Depends(current_user)):
    """Create a Razorpay order for unlocking this job's shortlist."""
    job = await _owned_job(job_id, user)
    if job.get("unlocked"):
        raise HTTPException(409, "This shortlist is already unlocked")
    if not _razorpay_enabled():
        raise HTTPException(503, "Online payment isn't configured — use the UPI/code option")
    try:
        async with httpx.AsyncClient(timeout=20, auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) as rp:
            resp = await rp.post(
                "https://api.razorpay.com/v1/orders",
                json={
                    "amount": UNLOCK_PRICE_INR * 100,  # paise
                    "currency": "INR",
                    "receipt": job_id[:40],
                    "notes": {"job_id": job_id, "owner_id": user["id"], "product": "shortlist-unlock"},
                },
            )
            resp.raise_for_status()
            order = resp.json()
    except httpx.HTTPError:
        raise HTTPException(502, "Couldn't reach the payment gateway — try again in a moment")
    await db.payments.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order["id"],
        "job_id": job_id,
        "owner_id": user["id"],
        "amount_inr": UNLOCK_PRICE_INR,
        "status": "created",
        "created_at": now_iso(),
    })
    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key_id": RAZORPAY_KEY_ID,
        "name": "Talent Tailor",
        "description": f"Full shortlist unlock — {job.get('title', 'role')}",
        "prefill": {"name": user.get("name", ""), "email": user.get("email", "")},
    }


@app.post("/api/jobs/{job_id}/verify-payment")
async def verify_payment(job_id: str, payload: VerifyPaymentRequest, user: dict = Depends(current_user)):
    """Razorpay checkout handed the client a signature; verify it server-side
    and unlock. The signature is HMAC-SHA256(order_id|payment_id, key_secret),
    so a client can't forge an unlock without the secret."""
    await _owned_job(job_id, user)
    if not _razorpay_enabled():
        raise HTTPException(503, "Online payment isn't configured")
    record = await db.payments.find_one({"order_id": payload.razorpay_order_id, "job_id": job_id})
    if not record:
        raise HTTPException(404, "No payment order found for this job")
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(403, "Payment verification failed")
    await db.payments.update_one(
        {"order_id": payload.razorpay_order_id},
        {"$set": {"status": "paid", "payment_id": payload.razorpay_payment_id, "paid_at": now_iso()}},
    )
    await db.jobs.update_one({"id": job_id}, {"$set": {"unlocked": True, "unlocked_at": now_iso()}})
    # Revenue. Verified server-side, so unlike the client-side payment_started
    # this one cannot be faked or blocked.
    analytics.capture(user["id"], "shortlist_unlocked", job_id=job_id, rail="razorpay", amount_inr=UNLOCK_PRICE_INR)
    return {"ok": True, "unlocked": True}


def _redact(c: dict, rank: int) -> dict:
    """Identity-redacted candidate: ranking quality stays visible (scores,
    skills, experience), identity and contact don't. Redaction happens server-
    side — a blurred <div> is not a paywall."""
    c = dict(c)
    c["name"] = f"Candidate #{rank}"
    c["email"] = ""
    c["phone"] = ""
    c["avatar"] = ""
    c["current_company"] = "Hidden until unlock"
    c["resume_summary"] = ""
    c["notes"] = ""
    c["locked"] = True
    return c


async def _revealed_ids(owner_id: str) -> set:
    """Candidate ids visible in full: everyone on unlocked jobs, plus the
    top-FREE_REVEAL of every locked job."""
    jobs = await db.jobs.find({"owner_id": owner_id}).to_list(1000)
    revealed = set()
    for job in jobs:
        cands = await db.candidates.find({"role_ids": job["id"]}).to_list(1000)
        if job.get("unlocked"):
            revealed.update(c["id"] for c in cands)
        else:
            ranked = sorted(cands, key=lambda c: _score_candidate(c, job), reverse=True)
            revealed.update(c["id"] for c in ranked[:FREE_REVEAL])
    return revealed


# --------- Skill Extraction: LLM with keyword-dictionary fallback ---------
SKILL_DICTIONARY = {
    "react": "React", "typescript": "TypeScript", "next.js": "Next.js", "nextjs": "Next.js",
    "javascript": "JavaScript", "graphql": "GraphQL", "redux": "Redux", "vue": "Vue.js",
    "angular": "Angular", "node": "Node.js", "python": "Python", "django": "Django",
    "flask": "Flask", "fastapi": "FastAPI", "golang": "Golang", "go": "Golang",
    "java": "Java", "spring": "Spring Boot", "kotlin": "Kotlin", "swift": "Swift",
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
    "redis": "Redis", "kafka": "Kafka", "rabbitmq": "RabbitMQ", "aws": "AWS", "gcp": "GCP",
    "azure": "Azure", "docker": "Docker", "kubernetes": "Kubernetes", "terraform": "Terraform",
    "figma": "Figma", "sketch": "Sketch", "design system": "Design Systems", "design systems": "Design Systems",
    "usability": "Usability Testing", "user research": "Qualitative Research", "qualitative": "Qualitative Research",
    "survey": "Survey Design", "a/b test": "A/B Testing", "a/b testing": "A/B Testing",
    "sql": "SQL", "product strategy": "Product Strategy", "roadmap": "Product Strategy",
    "fintech": "Fintech", "upi": "UPI / Payments", "payments": "UPI / Payments",
    "performance": "Performance Optimization", "distributed": "Distributed Systems",
    "machine learning": "Machine Learning", "ml": "Machine Learning", "ai": "AI/ML",
    "data science": "Data Science", "analytics": "Analytics",
}


def _dictionary_skills(text: str) -> List[str]:
    text = (text or "").lower()
    return sorted({v for k, v in SKILL_DICTIONARY.items() if k in text})


def _extract_skills_heuristic(text: str) -> dict:
    """Keyword-dictionary JD extraction — the pre-LLM behavior, kept as the
    fallback so an OpenRouter outage degrades quality, not availability."""
    text = (text or "").lower()
    found = {}
    for k, v in SKILL_DICTIONARY.items():
        if k in text:
            found[v] = found.get(v, 0) + 1
    skills = []
    for name, count in sorted(found.items(), key=lambda x: -x[1]):
        weight = min(5, max(2, 2 + count))
        skills.append({"name": name, "weight": weight})
    if not skills:
        skills = [
            {"name": "Communication", "weight": 4},
            {"name": "Problem Solving", "weight": 4},
            {"name": "Collaboration", "weight": 3},
        ]
    salary_min = 1500000
    salary_max = 3000000
    if any(k in text for k in ["senior", "lead", "principal", "staff"]):
        salary_min, salary_max = 3500000, 6500000
    elif any(k in text for k in ["junior", "entry", "intern"]):
        salary_min, salary_max = 600000, 1500000

    suggested_questions = []
    if "react" in text or "frontend" in text:
        suggested_questions.append("How many years of production React experience do you have?")
    if "backend" in text or "distributed" in text:
        suggested_questions.append("Describe the largest distributed system you have built.")
    if "product" in text and ("manager" in text or "management" in text):
        suggested_questions.append("Describe a 0→1 product you shipped end-to-end.")
    if not suggested_questions:
        suggested_questions = ["Why are you excited about this role?"]

    is_senior = any(k in text for k in ["senior", "lead", "principal", "staff"])
    is_junior = any(k in text for k in ["junior", "entry", "intern"])
    min_exp = 5 if is_senior else (0 if is_junior else 2)

    # Must-have skills default to empty on purpose: they are a strict AND, so
    # pre-filling the top 3 quietly disqualified almost the whole pool. The
    # extracted skills still drive the match score — the recruiter opts in to
    # making any of them a hard requirement.
    recommended_filters = {
        "min_experience_years": min_exp,
        "education_preference": "Bachelor's degree or equivalent",
        "notice_period_max_days": 90,
        "must_have_skills": [],
        "preferred_companies": [],
        "locations": ["Bengaluru", "Remote"],
    }

    if is_senior:
        recommended_weights = {"skills": 45, "experience": 30, "education": 5, "notice": 10, "cultural_fit": 10}
    elif is_junior:
        recommended_weights = {"skills": 35, "experience": 15, "education": 25, "notice": 10, "cultural_fit": 15}
    else:
        recommended_weights = {"skills": 40, "experience": 25, "education": 15, "notice": 10, "cultural_fit": 10}

    return {
        "skills": skills,
        "salary_suggestion": {"min": salary_min, "max": salary_max},
        "screening_questions": suggested_questions,
        "recommended_filters": recommended_filters,
        "recommended_weights": recommended_weights,
    }


@app.post("/api/extract-skills")
async def extract_skills(payload: ExtractSkillsRequest, user: dict = Depends(current_user)):
    result = await llm.extract_jd(payload.jd or "")
    if result:
        result["source"] = "llm"
        return result
    result = _extract_skills_heuristic(payload.jd)
    result["source"] = "heuristic"
    return result


# --------- Filter Preview: "how many candidates will pass?" ---------
def _parse_notice_days(s: str) -> int:
    if not s or (s or "").strip().lower() in {"", "—", "-", "n/a", "na", "unknown"}:
        return 0  # unknown notice period — don't reject on missing data
    s = s.lower()
    if "immediate" in s:
        return 0
    m = re.search(r"(\d+)", s)
    return int(m.group(1)) if m else 999


UNKNOWN = {"", "—", "-", "n/a", "na", "unknown"}


def _is_unknown(v: str) -> bool:
    return (v or "").strip().lower() in UNKNOWN


# Education is a *floor*, not an exact match: a master's satisfies a
# "bachelor's or equivalent" requirement. Levels: 0 none, 1 bachelor, 2 master, 3 doctorate.
DOCTORATE_TOKENS = ["phd", "ph.d", "doctorate", "d.phil"]
MASTERS_TOKENS = ["m.tech", "m.e.", "m.sc", "m.des", "m.a.", "m.com", "mba", "pgdm", "master", "ms "]
BACHELORS_TOKENS = ["b.tech", "b.e.", "b.sc", "b.des", "b.a.", "b.com", "bba", "bachelor"]
TIER1_TOKENS = ["iit", "nit", "iiit", "bits", "iim", "isb", "nid"]
CS_TOKENS = ["b.tech", "b.e.", "m.tech", "cs", "computer", "engineering", "iit", "nit", "iiit", "bits"]


def _education_level(candidate_edu: str) -> int:
    edu = (candidate_edu or "").lower()
    if any(t in edu for t in DOCTORATE_TOKENS):
        return 3
    if any(t in edu for t in MASTERS_TOKENS):
        return 2
    if any(t in edu for t in BACHELORS_TOKENS):
        return 1
    return 0


def _matches_education(candidate_edu: str, pref: str) -> bool:
    if not pref or pref == "No preference":
        return True
    # Never reject on missing data — surface the candidate and let the recruiter judge.
    if _is_unknown(candidate_edu):
        return True
    edu = (candidate_edu or "").lower()
    p = pref.lower()
    level = _education_level(candidate_edu)
    if "tier-1" in p or "tier 1" in p:
        return any(t in edu for t in TIER1_TOKENS)
    if "master" in p:
        return level >= 2
    if "cs" in p or "engineering" in p:
        return level >= 1 and any(t in edu for t in CS_TOKENS)
    if "bachelor" in p:
        return level >= 1
    return True


def _filter_failures(c: dict, filters: dict) -> List[str]:
    """Every reason this candidate fails these filters. Empty list == passes.

    Shared by the live preview and by publish, so "N will pass" and the shortlist
    a published role actually receives can never disagree.
    """
    filters = filters or {}
    min_exp = filters.get("min_experience_years", 0) or 0
    edu_pref = filters.get("education_preference", "No preference")
    max_notice = filters.get("notice_period_max_days", 999) or 999
    must_have = set([s.lower() for s in (filters.get("must_have_skills") or [])])
    locations = set([l.lower() for l in (filters.get("locations") or [])])

    failures = []
    if (c.get("experience_years") or 0) < min_exp:
        failures.append("failed_experience")
    if not _matches_education(c.get("education", ""), edu_pref):
        failures.append("failed_education")
    if _parse_notice_days(c.get("notice_period", "")) > max_notice:
        failures.append("failed_notice")
    if must_have:
        cand_skills = set([s.lower() for s in (c.get("skills") or [])])
        if not must_have.issubset(cand_skills):
            failures.append("failed_must_have")
    if locations:
        cloc = (c.get("location") or "").lower()
        # Each accepted location is matched on its own merits — "Remote" is one of
        # them, not a wildcard that waves every other city through.
        if not _is_unknown(cloc) and not any(l in cloc for l in locations):
            failures.append("failed_location")
    return failures


DEFAULT_WEIGHTS = {"skills": 40, "experience": 25, "education": 15, "notice": 10, "cultural_fit": 10}


def _score_components(c: dict, job: dict) -> dict:
    """Each dimension scored 0-100, independent of how it is weighted."""
    # Skills — share of the role's skill weight the candidate covers.
    job_skills = job.get("skills") or []
    if job_skills:
        cand = set([s.lower() for s in (c.get("skills") or [])])
        total_w = sum(s.get("weight", 1) for s in job_skills) or 1
        got_w = sum(s.get("weight", 1) for s in job_skills if s.get("name", "").lower() in cand)
        skills = round(100 * got_w / total_w)
    else:
        skills = 60

    # Experience — measured against the role's own minimum.
    target = max((job.get("filters") or {}).get("min_experience_years", 0) or 0, 1)
    exp = c.get("experience_years") or 0
    experience = min(100, round(100 * exp / target))

    # Education — a floor, so a higher degree scores at least as well.
    edu_raw = c.get("education", "")
    if _is_unknown(edu_raw):
        education = 50  # unknown, not zero
    else:
        education = {0: 40, 1: 70, 2: 90, 3: 100}[_education_level(edu_raw)]
        if any(t in edu_raw.lower() for t in TIER1_TOKENS):
            education = min(100, education + 10)

    # Notice period — sooner is better. Unknown scores neutral rather than best:
    # missing data must not out-rank a candidate who declared a real notice period.
    if _is_unknown(c.get("notice_period", "")):
        notice = 60
    else:
        notice = max(0, min(100, round(100 - _parse_notice_days(c.get("notice_period", "")) * 0.75)))

    # Cultural fit — the only soft signal we have is prior company.
    preferred = [p.lower() for p in ((job.get("filters") or {}).get("preferred_companies") or [])]
    company = (c.get("current_company") or "").lower()
    if not preferred:
        cultural_fit = 70
    else:
        cultural_fit = 100 if any(p in company for p in preferred) else 55

    return {
        "skills": skills,
        "experience": experience,
        "education": education,
        "notice": notice,
        "cultural_fit": cultural_fit,
    }


def _score_candidate(c: dict, job: dict) -> int:
    """Weighted match score for this candidate *against this role*."""
    weights = {k: v for k, v in (job.get("scoring_weights") or {}).items() if isinstance(v, (int, float))}
    total = sum(weights.values())
    if total <= 0:
        weights, total = DEFAULT_WEIGHTS, sum(DEFAULT_WEIGHTS.values())
    comp = _score_components(c, job)
    score = sum(comp.get(k, 0) * w for k, w in weights.items()) / total
    return max(0, min(100, round(score)))


@app.post("/api/candidates/preview-filter")
async def preview_filter(payload: FilterPreviewRequest, user: dict = Depends(current_user)):
    filters = payload.filters or {}
    cands = await db.candidates.find({"owner_id": user["id"]}).to_list(1000)
    breakdown = {
        "failed_experience": 0,
        "failed_education": 0,
        "failed_notice": 0,
        "failed_must_have": 0,
        "failed_location": 0,
    }
    passing = 0
    for c in cands:
        failures = _filter_failures(c, filters)
        for f in failures:
            breakdown[f] += 1
        if not failures:
            passing += 1

    return {"total": len(cands), "passing": passing, "breakdown": breakdown}


# ---------- Candidates ----------
@app.get("/api/candidates")
async def list_candidates(
    job_id: Optional[str] = None,
    stage: Optional[str] = None,
    q: Optional[str] = None,
    user: dict = Depends(current_user),
):
    query = {"owner_id": user["id"]}
    if job_id:
        query["role_ids"] = job_id
    if stage:
        query["stage"] = stage
    cands = await db.candidates.find(query).sort("match_score", -1).to_list(1000)
    result = [strip_mongo(c) for c in cands]
    if job_id:
        # Scored against this specific role, so the weights the recruiter set actually
        # decide the ranking. Without a role there is no basis for weighting.
        job = await db.jobs.find_one({"id": job_id, "owner_id": user["id"]})
        if job:
            for c in result:
                c["match_score"] = _score_candidate(c, job)
                c["score_breakdown"] = _score_components(c, job)
            result.sort(key=lambda c: c["match_score"], reverse=True)
            if not job.get("unlocked"):
                result = [c if i < FREE_REVEAL else _redact(c, i + 1) for i, c in enumerate(result)]
    else:
        revealed = await _revealed_ids(user["id"])
        result = [c if c["id"] in revealed else _redact(c, i + 1) for i, c in enumerate(result)]
    if q:
        ql = q.lower()
        result = [c for c in result if ql in c["name"].lower() or ql in c["current_company"].lower() or any(ql in s.lower() for s in c["skills"])]
    return result


@app.get("/api/candidates/{cid}")
async def get_candidate(cid: str, user: dict = Depends(current_user)):
    c = await db.candidates.find_one({"id": cid, "owner_id": user["id"]})
    if not c:
        raise HTTPException(404, "Candidate not found")
    c = strip_mongo(c)
    revealed = await _revealed_ids(user["id"])
    if c["id"] not in revealed:
        c = _redact(c, 0)
        c["name"] = "Locked candidate"
    return c


async def _owned_candidate(cid: str, user: dict) -> dict:
    c = await db.candidates.find_one({"id": cid, "owner_id": user["id"]})
    if not c:
        raise HTTPException(404, "Candidate not found")
    return c


CANDIDATE_PATCHABLE_FIELDS = {"notes", "rating", "tags", "stage", "role_ids"}


@app.patch("/api/candidates/{cid}")
async def update_candidate(cid: str, payload: dict, user: dict = Depends(current_user)):
    await _owned_candidate(cid, user)
    changes = {k: v for k, v in payload.items() if k in CANDIDATE_PATCHABLE_FIELDS}
    if not changes:
        raise HTTPException(422, "No editable fields in payload")
    await db.candidates.update_one({"id": cid}, {"$set": changes})
    c = await db.candidates.find_one({"id": cid})
    # update job candidate counts if role_ids changed
    if "role_ids" in changes:
        await _refresh_job_counts(user["id"])
    return strip_mongo(c)


async def _refresh_job_counts(owner_id: str):
    jobs = await db.jobs.find({"owner_id": owner_id}).to_list(1000)
    for j in jobs:
        count = await db.candidates.count_documents({"role_ids": j["id"]})
        await db.jobs.update_one({"id": j["id"]}, {"$set": {"candidates_count": count}})


@app.post("/api/candidates/{cid}/assign-roles")
async def assign_roles(cid: str, payload: RoleAssignment, user: dict = Depends(current_user)):
    await _owned_candidate(cid, user)
    # Only roles in this workspace can be assigned.
    owned = await db.jobs.find({"owner_id": user["id"], "id": {"$in": payload.role_ids}}).to_list(1000)
    role_ids = [j["id"] for j in owned]
    await db.candidates.update_one({"id": cid}, {"$set": {"role_ids": role_ids}})
    await _refresh_job_counts(user["id"])
    c = await db.candidates.find_one({"id": cid})
    return strip_mongo(c)


@app.post("/api/candidates/{cid}/stage")
async def set_stage(cid: str, payload: StageUpdate, user: dict = Depends(current_user)):
    await _owned_candidate(cid, user)
    await db.candidates.update_one({"id": cid}, {"$set": {"stage": payload.stage}})
    c = await db.candidates.find_one({"id": cid})
    return strip_mongo(c)


# ---------- Bulk resume upload (recruiter-side) ----------
# The activation feature: a recruiter already has a pile of resumes; this turns
# that pile into a ranked shortlist in one request, instead of waiting for
# candidates to arrive through the apply link.
MAX_BULK_FILES = 20


async def _ingest_resume_file(file: UploadFile, job: dict) -> dict:
    """One uploaded resume → one ranked candidate. Per-file status, never raises."""
    filename = file.filename or "resume"
    try:
        data = await file.read()
    except Exception:
        return {"filename": filename, "ok": False, "error": "Could not read the file"}
    if len(data) > 5 * 1024 * 1024:
        return {"filename": filename, "ok": False, "error": "Larger than 5 MB"}
    text = llm.extract_text_from_file(filename, data)
    if not text:
        return {"filename": filename, "ok": False, "error": "No readable text (scanned image?)"}

    fields = await llm.parse_resume(text)
    needs_review = False
    if not fields:
        # LLM off or down: keep the pile moving with a stub the recruiter can
        # fix by hand, rather than dropping the file on the floor.
        stem = re.sub(r"\.[A-Za-z0-9]+$", "", filename).replace("_", " ").replace("-", " ").strip() or "Unknown"
        fields = {
            "name": stem[:60].title(),
            "email": "", "phone": "", "current_title": "", "current_company": "",
            "experience_years": 0.0, "location": "", "education": "", "notice_period": "",
            "expected_ctc": 0, "skills": _dictionary_skills(text), "summary": text[:300],
        }
        needs_review = True

    email = (fields.get("email") or "").strip().lower()
    # Same person, second role: attach, don't duplicate.
    if email:
        existing = await db.candidates.find_one({"owner_id": job["owner_id"], "email": email})
        if existing:
            await db.candidates.update_one({"id": existing["id"]}, {"$addToSet": {"role_ids": job["id"]}})
            return {
                "filename": filename, "ok": True, "candidate_id": existing["id"],
                "name": existing["name"], "duplicate": True,
                "match_score": _score_candidate(existing, job),
            }

    c = Candidate(
        owner_id=job["owner_id"],
        name=fields["name"] or "Unknown",
        email=email or f"unknown-{uuid.uuid4().hex[:8]}@needs-review.local",
        phone=fields.get("phone") or "",
        current_title=fields.get("current_title") or "Not extracted",
        current_company=fields.get("current_company") or "Not extracted",
        location=fields.get("location") or "",
        experience_years=fields.get("experience_years") or 0.0,
        expected_ctc=fields.get("expected_ctc") or 0,
        notice_period=fields.get("notice_period") or "",
        skills=fields.get("skills") or ["General"],
        education=fields.get("education") or "",
        resume_summary=fields.get("summary") or text[:400],
        avatar="",
        stage="New",
        role_ids=[job["id"]],
        tags=["uploaded"] + (["needs-review"] if needs_review else []),
        auto_applied=False,
    )
    c.match_score = _score_candidate(c.model_dump(), job)
    await db.candidates.insert_one(c.model_dump())
    return {
        "filename": filename, "ok": True, "candidate_id": c.id, "name": c.name,
        "match_score": c.match_score, "needs_review": needs_review,
    }


@app.post("/api/jobs/{job_id}/upload-resumes")
async def upload_resumes(job_id: str, files: List[UploadFile] = File(...), user: dict = Depends(current_user)):
    job = await _owned_job(job_id, user)
    if len(files) > MAX_BULK_FILES:
        raise HTTPException(413, f"Up to {MAX_BULK_FILES} resumes per batch")
    results = await asyncio.gather(*[_ingest_resume_file(f, job) for f in files])
    created = [r for r in results if r.get("ok")]
    # Parse failure rate is the number that decides whether the LLM tier is
    # good enough. Reasons are enums from _ingest_resume_file, never filenames.
    analytics.capture(
        user["id"],
        "resumes_uploaded",
        job_id=job_id,
        file_count=len(files),
        parsed_count=len(created),
        failed_count=len(files) - len(created),
        failure_reasons=[r.get("error") for r in results if not r.get("ok")],
    )
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"candidates_count": await db.candidates.count_documents({"role_ids": job_id})}},
    )
    return {
        "total": len(files),
        "ranked": len(created),
        "failed": [r for r in results if not r.get("ok")],
        "results": list(results),
    }


# ---------- Shortlist export (paid) ----------
@app.get("/api/jobs/{job_id}/export")
async def export_shortlist(job_id: str, user: dict = Depends(current_user)):
    job = await _owned_job(job_id, user)
    if not job.get("unlocked"):
        raise HTTPException(402, f"Unlock this shortlist (₹{UNLOCK_PRICE_INR}) to export it")
    cands = await db.candidates.find({"role_ids": job_id}).to_list(1000)
    for c in cands:
        c["match_score"] = _score_candidate(c, job)
    cands.sort(key=lambda c: c["match_score"], reverse=True)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "rank", "match_score", "name", "email", "phone", "current_title",
        "current_company", "experience_years", "expected_ctc", "notice_period",
        "location", "education", "skills", "stage", "summary",
    ])
    for i, c in enumerate(cands, 1):
        writer.writerow([
            i, c["match_score"], c["name"], c["email"], c["phone"], c["current_title"],
            c["current_company"], c["experience_years"], c["expected_ctc"], c["notice_period"],
            c["location"], c["education"], "; ".join(c.get("skills") or []), c["stage"],
            (c.get("resume_summary") or "").replace("\n", " "),
        ])
    filename = re.sub(r"[^A-Za-z0-9]+", "-", job["title"]).strip("-").lower() or "shortlist"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}-shortlist.csv"'},
    )


# ---------- Public Apply (auto-apply from shareable link) ----------
@app.post("/api/apply/{slug}/parse-resume")
async def parse_resume(slug: str, file: UploadFile = File(...)):
    """Read the uploaded resume and extract structured fields for the apply
    form. Public — it's part of the candidate flow."""
    job = await db.jobs.find_one({"share_slug": slug})
    if not job:
        raise HTTPException(404, "Job not found")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "Resume file is larger than 5 MB")
    text = llm.extract_text_from_file(file.filename or "", data)
    if not text:
        return {
            "parsed": False,
            "reason": "unreadable",
            "message": "We couldn't read text from this file (scanned image?). Please fill in your details below.",
            "fields": None,
        }
    fields = await llm.parse_resume(text)
    if not fields:
        # LLM off or down — hand back the raw text plus dictionary skills so the
        # candidate still gets a mostly-prefilled form.
        return {
            "parsed": False,
            "reason": "llm_unavailable",
            "message": "Automatic extraction is unavailable right now — please confirm your details below.",
            "fields": {"resume_text": text[:2000], "skills": _dictionary_skills(text)},
        }
    fields["resume_text"] = text[:2000]
    if not fields.get("skills"):
        fields["skills"] = _dictionary_skills(text + " " + fields.get("current_title", ""))
    return {"parsed": True, "fields": fields}


@app.post("/api/apply/{slug}")
async def apply_to_job(slug: str, payload: CandidateApply):
    job = await db.jobs.find_one({"share_slug": slug})
    if not job:
        raise HTTPException(404, "Job not found")
    # Skills come from the LLM parse step; the dictionary is the fallback for
    # manual applications that skipped or failed parsing.
    skills = [s.strip() for s in (payload.skills or []) if s and s.strip()]
    if not skills:
        text = ((payload.resume_text or "") + " " + payload.current_title).lower()
        skills = [v for k, v in SKILL_DICTIONARY.items() if k in text]
        skills = sorted(set(skills))
    c = Candidate(
        owner_id=job.get("owner_id", ""),
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        current_title=payload.current_title,
        current_company=payload.current_company,
        location=payload.location or job.get("location", ""),
        experience_years=payload.experience_years,
        expected_ctc=payload.expected_ctc,
        notice_period=payload.notice_period or "",
        skills=skills or ["General"],
        education=payload.education or "",
        resume_summary=(payload.resume_text or "")[:400] or f"{payload.current_title} at {payload.current_company}",
        # Deterministic across restarts — Python's str hash() is randomised per process.
        avatar=AVATAR_POOL[zlib.crc32(payload.email.encode()) % len(AVATAR_POOL)],
        stage="New",
        role_ids=[job["id"]],
        auto_applied=True,
    )
    # Scored against this role on the same basis as everyone else in the pool.
    c.match_score = _score_candidate(c.model_dump(), job)
    await db.candidates.insert_one(c.model_dump())
    await db.jobs.update_one({"id": job["id"]}, {"$inc": {"candidates_count": 1}})
    return {"ok": True, "candidate_id": c.id, "match_score": c.match_score}


# ---------- Landing-page lead capture (identification, not authentication) ----------
@app.post("/api/visitors")
async def register_visitor(payload: Visitor):
    """Called when someone leaves details at an activation moment.

    Same email twice = a return visit; the original `source` is kept so the
    moment that first converted them isn't overwritten by a later one.
    """
    existing = await db.visitors.find_one({"email": payload.email})
    if existing:
        await db.visitors.update_one(
            {"email": payload.email},
            {"$set": {"last_seen": now_iso(), "name": payload.name, "company": payload.company or existing.get("company", "")},
             "$inc": {"visits": 1}},
        )
        updated = await db.visitors.find_one({"email": payload.email})
        return strip_mongo(updated)
    doc = payload.model_dump()
    await db.visitors.insert_one(doc)
    return payload.model_dump()


@app.get("/api/visitors")
async def list_visitors(x_admin_key: Optional[str] = Header(None)):
    """Lead list — operator only. Requires ADMIN_KEY; disabled if unset."""
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(403, "Not available")
    visitors = await db.visitors.find({}).sort("last_seen", -1).to_list(1000)
    return [strip_mongo(v) for v in visitors]


# ---------- Analytics ----------
@app.get("/api/analytics/summary")
async def analytics_summary(user: dict = Depends(current_user)):
    owner = {"owner_id": user["id"]}
    total_jobs = await db.jobs.count_documents(owner)
    total_candidates = await db.candidates.count_documents(owner)
    stages = ["New", "Shortlisted", "Interview", "Offer", "Rejected"]
    funnel = {}
    for s in stages:
        funnel[s] = await db.candidates.count_documents({**owner, "stage": s})
    auto_applied = await db.candidates.count_documents({**owner, "auto_applied": True})
    return {
        "total_jobs": total_jobs,
        "total_candidates": total_candidates,
        "funnel": funnel,
        "auto_apply_conversion": (auto_applied / total_candidates) if total_candidates else 0.0,
        "unlock_price_inr": UNLOCK_PRICE_INR,
    }
