"""
CRED HR - Backend API
Mock-first API for the redesigned HR candidate evaluation platform.
All data is in-memory + persisted to MongoDB for a light experience.
"""
import io
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

import auth

load_dotenv()



def _required_env(name: str, example: str) -> str:
    """Missing config should say what is missing, not raise a bare KeyError."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"{name} is not set. The API cannot start without it.\n"
            f"  Expected something like: {name}={example}\n"
            f"  See .env.example for every variable this service needs."
        )
    return value


MONGO_URL = _required_env("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = _required_env("DB_NAME", "cred_hr")

# Comma-separated list of allowed browser origins. "*" is the permissive
# default for local development; set this in any deployed environment.
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="CRED HR API")

# Sessions travel in a cookie, and browsers only send cookies cross-origin when
# the server names an exact origin and sets Allow-Credentials. A wildcard is
# therefore unusable for a cross-origin deployment: sign-in fails with what
# looks like a network error. Harmless if the app and API share an origin
# (single domain behind one proxy), so warn rather than refuse to start.
if "*" in CORS_ORIGINS:
    print(
        "\n  CORS_ORIGINS is '*'. Sign-in will FAIL from a browser on a different"
        "\n  origin, because session cookies are not sent to a wildcard origin."
        "\n  Set CORS_ORIGINS to your frontend's exact origin, e.g."
        "\n      CORS_ORIGINS=https://hr.example.com"
        "\n  Ignore this only if the app and API are served from the same origin.\n"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # Never combine credentials with a wildcard: browsers reject it outright,
    # and it would let any site read authenticated responses.
    allow_credentials="*" not in CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models ----------
Stage = Literal["New", "Shortlisted", "Interview", "Offer", "Rejected"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    share_slug: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])


class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=140)
    department: str
    location: str
    employment_type: Optional[str] = "Full-time"
    seniority: Optional[str] = "Mid"
    salary_min: Optional[int] = 1200000
    salary_max: Optional[int] = 2400000
    jd: Optional[str] = ""
    skills: Optional[List[dict]] = []
    screening_questions: Optional[List[str]] = []
    # These must default to {} rather than None: Job requires dicts, so None
    # here turns a documented-optional payload into a 500.
    filters: dict = Field(default_factory=dict)
    scoring_weights: dict = Field(default_factory=dict)

    @field_validator("title")
    @classmethod
    def _title_not_blank(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("Give the role a title.")
        return v

    @field_validator("salary_max")
    @classmethod
    def _salary_sane(cls, v, info):
        lo = info.data.get("salary_min")
        if v is not None and v < 0:
            raise ValueError("Salary cannot be negative.")
        if lo is not None and v is not None and lo > v:
            raise ValueError("Minimum salary is above the maximum.")
        return v

    @field_validator("salary_min")
    @classmethod
    def _salary_min_sane(cls, v):
        if v is not None and v < 0:
            raise ValueError("Salary cannot be negative.")
        return v


class ExtractSkillsRequest(BaseModel):
    jd: str


class FilterPreviewRequest(BaseModel):
    filters: dict
    skills: Optional[List[dict]] = []


class Candidate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    source: str = "seed"  # seed | public_apply | bulk_upload
    source_filename: str = ""


class CandidateApply(BaseModel):
    """A real person filling this in. Anything accepted here lands in a
    recruiter's pipeline, so blank and nonsense values are rejected rather than
    stored — previously an empty name and email produced a blank dashboard row.
    """

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(default="", max_length=32)
    current_title: str = Field(default="", max_length=120)
    current_company: str = Field(default="", max_length=120)
    experience_years: float = Field(ge=0, le=60)
    expected_ctc: int = Field(ge=0, le=1_000_000_000)
    resume_text: Optional[str] = Field(default="", max_length=50_000)

    @field_validator("name", "current_title", "current_company", "phone")
    @classmethod
    def _not_only_whitespace(cls, v: str) -> str:
        v = (v or "").strip()
        return v

    @field_validator("name")
    @classmethod
    def _name_has_letters(cls, v: str) -> str:
        if not re.search(r"[^\W\d_]", v, re.UNICODE):
            raise ValueError("Enter your name.")
        return v


class JobUpdate(BaseModel):
    """Whitelist for PATCH /api/jobs/{id}.

    The previous `payload: dict` was $set verbatim, so `{"id": "spoofed"}`
    rewrote the primary key and orphaned the record. Identity and provenance
    fields are deliberately absent here and cannot be written.
    """

    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    seniority: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    jd: Optional[str] = None
    skills: Optional[List[dict]] = None
    screening_questions: Optional[List[str]] = None
    filters: Optional[dict] = None
    scoring_weights: Optional[dict] = None
    status: Optional[str] = None


class CandidateUpdate(BaseModel):
    """Whitelist for PATCH /api/candidates/{id}. Same reasoning as JobUpdate."""

    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    location: Optional[str] = None
    experience_years: Optional[float] = Field(default=None, ge=0, le=60)
    expected_ctc: Optional[int] = Field(default=None, ge=0)
    notice_period: Optional[str] = None
    skills: Optional[List[str]] = None
    education: Optional[str] = None
    stage: Optional[Stage] = None
    role_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    rating: Optional[int] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = None


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password_hash: str
    role: str = "recruiter"  # recruiter | admin
    created_at: str = Field(default_factory=now_iso)
    last_login_at: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Literal["recruiter", "admin"] = "recruiter"


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class OnboardingPayload(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    company_size: str = Field(default="", max_length=40)
    industry: str = Field(default="", max_length=60)
    role_title: str = Field(default="", max_length=120)
    role_department: str = Field(default="Engineering", max_length=60)
    role_location: str = Field(default="", max_length=120)
    invite_emails: List[EmailStr] = Field(default_factory=list, max_length=50)


class RoleAssignment(BaseModel):
    role_ids: List[str]


class StageUpdate(BaseModel):
    # Free text here let "Banana" through, after which the candidate matched no
    # funnel bucket and no dashboard filter — invisible but still in the database.
    stage: Stage


# ---------- Seed Data ----------
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
        "jd": "Build the platform APIs & event-driven services that power CRED. Golang, PostgreSQL, Kafka, AWS.",
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
        "jd": "Lead qualitative & quantitative research studies for CRED's consumer experiences. Craft insight narratives that drive product decisions.",
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


# ---------- Seeder ----------
@app.on_event("startup")
async def bootstrap_admin():
    """Create the first admin account from the environment, once.

    There is deliberately no default password: an app that ships with known
    credentials is no better protected than one with no login at all. If
    ADMIN_EMAIL/ADMIN_PASSWORD are unset and no users exist, the API starts but
    nobody can sign in — and says so loudly in the logs.
    """
    await db.sessions.create_index("token_fp", unique=True)
    await db.sessions.create_index("expires_at")
    await db.users.create_index("email", unique=True)
    await db.jobs.create_index("share_slug", unique=True)
    await db.candidates.create_index("email")
    await db.events.create_index([("candidate_id", 1), ("at", -1)])
    # Expired sessions are dead weight; clear them on boot.
    await db.sessions.delete_many({"expires_at": {"$lt": now_iso()}})

    if await db.users.count_documents({}) > 0:
        return

    email = os.environ.get("ADMIN_EMAIL", "").lower().strip()
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not email or not password:
        print(
            "\n  No user accounts exist and ADMIN_EMAIL / ADMIN_PASSWORD are not set."
            "\n  Nobody can sign in. Set both and restart to create the first admin.\n"
        )
        return
    problem = auth.password_problem(password)
    if problem:
        print(f"\n  ADMIN_PASSWORD rejected: {problem}\n  No admin account was created.\n")
        return
    admin = User(
        email=email,
        name=os.environ.get("ADMIN_NAME", "").strip() or email.split("@")[0],
        password_hash=auth.hash_password(password),
        role="admin",
    )
    await db.users.insert_one(admin.model_dump())
    print(f"  Created the first admin account: {email}")


# Demo content. Off unless explicitly requested — a real recruiter opening the
# app to 20 fabricated candidates is worse than an empty pipeline.
SEED_DEMO_DATA = os.environ.get("SEED_DEMO_DATA", "").lower() in ("1", "true", "yes")


@app.on_event("startup")
async def seed():
    if not SEED_DEMO_DATA:
        return
    jobs_count = await db.jobs.count_documents({})
    if jobs_count == 0:
        job_docs = []
        for j in SEED_JOBS:
            job = Job(**j)
            job_docs.append(job.model_dump())
        await db.jobs.insert_many(job_docs)
        # candidates
        cand_docs = []
        # map candidates to jobs by role affinity
        role_map = {}
        for jd in job_docs:
            role_map[jd["title"].lower()] = jd["id"]
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
                tags=[],
                rating=(score // 20),
            )
            cand_docs.append(c.model_dump())
        await db.candidates.insert_many(cand_docs)
        # update candidate counts on jobs
        for jd in job_docs:
            count = sum(1 for c in cand_docs if jd["id"] in c["role_ids"])
            await db.jobs.update_one({"id": jd["id"]}, {"$set": {"candidates_count": count}})


async def record_event(candidate_id: str, kind: str, summary: str, actor: str = "system"):
    """Append to a candidate's timeline.

    The Activity tab used to render three hardcoded lines ("Just now",
    "Yesterday", "3 days ago"). On a hiring record that is a fabricated audit
    trail, and it also left analytics with no real timestamps to work from.
    """
    await db.events.insert_one({
        "id": str(uuid.uuid4()),
        "candidate_id": candidate_id,
        "kind": kind,
        "summary": summary,
        "actor": actor,
        "at": now_iso(),
    })


async def _rescore_role(job: dict):
    """Re-run scoring for everyone on a role after its weights/filters change."""
    for c in await db.candidates.find({"role_ids": job["id"]}).to_list(5000):
        new_score = score_candidate(c, job)["score"]
        if new_score != c.get("match_score"):
            await db.candidates.update_one({"id": c["id"]}, {"$set": {"match_score": new_score}})


async def _recount_all_jobs():
    """Refresh candidates_count on every role. Cheap at this scale, and the
    counts drifting from reality is worse than the extra queries."""
    for j in await db.jobs.find({}).to_list(5000):
        count = await db.candidates.count_documents({"role_ids": j["id"]})
        if count != j.get("candidates_count"):
            await db.jobs.update_one({"id": j["id"]}, {"$set": {"candidates_count": count}})


def strip_mongo(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc


# ---------- Authentication ----------
# Everything under /api requires a session except health, the public job page
# and the public apply endpoint — candidates are not logged in.
_login_attempts: dict = {}


def _public_user(doc: dict) -> dict:
    return {k: doc.get(k) for k in ("id", "email", "name", "role", "created_at", "last_login_at")}


async def current_user(request: Request) -> Optional[dict]:
    """Resolve the session cookie to a user, or None. Never raises."""
    token = request.cookies.get(auth.SESSION_COOKIE)
    if not token:
        return None
    session = await db.sessions.find_one({"token_fp": auth.token_fingerprint(token)})
    if not session:
        return None
    if auth.is_expired(session.get("expires_at", "")):
        await db.sessions.delete_one({"token_fp": session["token_fp"]})
        return None
    user = await db.users.find_one({"id": session["user_id"]})
    return user or None


async def require_user(request: Request) -> dict:
    """Dependency for every recruiter-facing route."""
    user = await current_user(request)
    if not user:
        raise HTTPException(401, "Sign in to continue.")
    return user


async def require_admin(user: dict = Depends(require_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "This action needs an admin account.")
    return user


def _throttle_key(request: Request, email: str) -> str:
    return f"{request.client.host if request.client else 'unknown'}:{email.lower()}"


def _check_login_throttle(key: str):
    now = time.time()
    attempts = [t for t in _login_attempts.get(key, []) if now - t < auth.LOGIN_LOCKOUT_SECONDS]
    _login_attempts[key] = attempts
    if len(attempts) >= auth.MAX_LOGIN_ATTEMPTS:
        wait = int(auth.LOGIN_LOCKOUT_SECONDS - (now - attempts[0])) // 60 + 1
        raise HTTPException(429, f"Too many failed sign-in attempts. Try again in {wait} minutes.")


@app.post("/api/auth/login")
async def login(payload: LoginRequest, request: Request, response: Response):
    key = _throttle_key(request, payload.email)
    _check_login_throttle(key)

    user = await db.users.find_one({"email": payload.email.lower().strip()})
    # Same message and comparable timing either way — do not reveal which
    # addresses have accounts.
    ok = user is not None and auth.verify_password(payload.password, user.get("password_hash", ""))
    if not ok:
        _login_attempts.setdefault(key, []).append(time.time())
        raise HTTPException(401, "That email and password don't match.")

    _login_attempts.pop(key, None)
    token = auth.new_session_token()
    await db.sessions.insert_one({
        "token_fp": auth.token_fingerprint(token),
        "user_id": user["id"],
        "created_at": now_iso(),
        "expires_at": auth.session_expiry().isoformat(),
    })
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login_at": now_iso()}})
    response.set_cookie(auth.SESSION_COOKIE, token, **auth.cookie_settings())
    return {"user": _public_user(user)}


@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(auth.SESSION_COOKIE)
    if token:
        await db.sessions.delete_one({"token_fp": auth.token_fingerprint(token)})
    response.delete_cookie(auth.SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/api/auth/me")
async def me(user: dict = Depends(require_user)):
    return _public_user(user)


@app.get("/api/auth/users")
async def list_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}).to_list(1000)
    return [_public_user(u) for u in users]


@app.post("/api/auth/users")
async def create_user(payload: UserCreate, admin: dict = Depends(require_admin)):
    problem = auth.password_problem(payload.password)
    if problem:
        raise HTTPException(400, problem)
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "An account with that email already exists.")
    u = User(email=email, name=payload.name.strip() or email,
             password_hash=auth.hash_password(payload.password), role=payload.role)
    await db.users.insert_one(u.model_dump())
    return _public_user(u.model_dump())


@app.post("/api/auth/change-password")
async def change_password(payload: PasswordChange, request: Request, user: dict = Depends(require_user)):
    if not auth.verify_password(payload.current_password, user.get("password_hash", "")):
        raise HTTPException(401, "Your current password is incorrect.")
    problem = auth.password_problem(payload.new_password)
    if problem:
        raise HTTPException(400, problem)
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": auth.hash_password(payload.new_password)}}
    )
    # Changing a password should end every other session.
    keep = request.cookies.get(auth.SESSION_COOKIE)
    await db.sessions.delete_many({
        "user_id": user["id"],
        "token_fp": {"$ne": auth.token_fingerprint(keep) if keep else ""},
    })
    return {"ok": True}


# ---------- Routes ----------
# PUBLIC — liveness probe, returns no data.
@app.get("/api/health")
async def health():
    return {"status": "ok", "time": now_iso()}


@app.get("/api/jobs")
async def list_jobs(user: dict = Depends(require_user)):
    jobs = await db.jobs.find({}).to_list(1000)
    return [strip_mongo(j) for j in jobs]


@app.post("/api/jobs")
async def create_job(payload: JobCreate, user: dict = Depends(require_user)):
    job = Job(**payload.model_dump())
    await db.jobs.insert_one(job.model_dump())
    return job.model_dump()


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str, user: dict = Depends(require_user)):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")
    return strip_mongo(job)


# PUBLIC — candidates open this from a share link and are not logged in.
@app.get("/api/jobs/share/{slug}")
async def get_job_by_slug(slug: str):
    job = await db.jobs.find_one({"share_slug": slug})
    if not job:
        raise HTTPException(404, "Job not found")
    return strip_mongo(job)


@app.patch("/api/jobs/{job_id}")
async def update_job(job_id: str, payload: JobUpdate, user: dict = Depends(require_user)):
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not changes:
        raise HTTPException(400, "No fields to update.")
    result = await db.jobs.update_one({"id": job_id}, {"$set": changes})
    if result.matched_count == 0:
        raise HTTPException(404, "Job not found")
    job = await db.jobs.find_one({"id": job_id})
    if {"scoring_weights", "filters", "skills"} & set(changes):
        await _rescore_role(job)
        job = await db.jobs.find_one({"id": job_id})
    return strip_mongo(job)


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(require_user)):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")

    # Detach the role from every candidate first. Leaving the id behind made
    # them unreachable: no role page listed them, and their chips silently
    # vanished from the dashboard.
    detached = await db.candidates.update_many(
        {"role_ids": job_id}, {"$pull": {"role_ids": job_id}}
    )
    await db.jobs.delete_one({"id": job_id})
    await _recount_all_jobs()

    # Anyone left with no role at all is still in the pool, reachable through
    # the dashboard's "Unassigned" filter — not deleted behind the recruiter's back.
    unassigned = await db.candidates.count_documents({"role_ids": {"$size": 0}})
    return {
        "ok": True,
        "detached_candidates": detached.modified_count,
        "unassigned_total": unassigned,
    }


# --------- AI Skill Extraction (mocked heuristic) ---------
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


@app.post("/api/extract-skills")
async def extract_skills(payload: ExtractSkillsRequest, user: dict = Depends(require_user)):
    text = (payload.jd or "").lower()
    found = {}
    for k, v in SKILL_DICTIONARY.items():
        if k in text:
            found[v] = found.get(v, 0) + 1
    # sort by count desc, then original order
    skills = []
    for name, count in sorted(found.items(), key=lambda x: -x[1]):
        weight = min(5, max(2, 2 + count))
        skills.append({"name": name, "weight": weight})
    # default suggestions if nothing detected
    if not skills:
        skills = [
            {"name": "Communication", "weight": 4},
            {"name": "Problem Solving", "weight": 4},
            {"name": "Collaboration", "weight": 3},
        ]
    # salary suggestion based on seniority keywords
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

    # Seniority detection for filter defaults
    is_senior = any(k in text for k in ["senior", "lead", "principal", "staff"])
    is_junior = any(k in text for k in ["junior", "entry", "intern"])
    min_exp = 5 if is_senior else (0 if is_junior else 2)

    # Recommended mandatory filters, strictest first. A recommendation that
    # leaves nobody is worse than no recommendation: the previous version took
    # the top three skills and required all of them, which passed 0 of 20
    # candidates on this app's own sample JD.
    def _tier(n_skills: int, exp: int, edu: str, notice: Optional[int]):
        return {
            "min_experience_years": exp,
            "education_preference": edu,
            "notice_period_max_days": notice,
            "must_have_skills": [sk["name"] for sk in skills[:n_skills]],
            "preferred_companies": [],
            "locations": [],
        }

    tiers = [
        _tier(2, min_exp, "Bachelor's degree or equivalent", 90),
        _tier(1, min_exp, "Bachelor's degree or equivalent", 90),
        _tier(1, min_exp, "No preference", 90),
        _tier(1, max(0, min_exp - 2), "No preference", None),
        _tier(0, max(0, min_exp - 2), "No preference", None),
    ]

    pool = await db.candidates.find({}).to_list(10000)
    # Aim to leave the recruiter a workable shortlist rather than an empty one.
    target = max(3, int(len(pool) * 0.15)) if pool else 0
    recommended_filters = tiers[-1]
    filter_impact = None
    for tier in tiers:
        impact = _evaluate_filters(pool, tier)
        if not pool or impact["passing"] >= target:
            recommended_filters, filter_impact = tier, impact
            break
    else:
        filter_impact = _evaluate_filters(pool, recommended_filters)

    # Recommended scoring weights (sum to 100)
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
        # What these defaults do to the current pool, so the UI can say so up
        # front instead of the recruiter discovering it by opening the section.
        "filter_impact": filter_impact,
    }


# --------- Bulk resume upload (recruiter side) ---------
# The recruiter drops a batch of resumes against one role. We cap the batch so a
# single upload can never spike parsing cost or flood the pipeline.
MAX_BULK_FILES = 10
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB per resume
ALLOWED_RESUME_EXTS = {".pdf", ".docx", ".txt", ".md"}

# Batches per client per window. Deliberately in-memory: single-process
# deployment today, and a shared store would be the right call once it isn't.
RATE_LIMIT_BATCHES = 12  # 12 batches x 10 files = 120 resumes per minute
RATE_LIMIT_WINDOW_SECONDS = 60
_upload_history: dict = {}


def _rate_limit_check(client_key: str):
    """Sliding window over recent batches. Raises 429 when the window is full."""
    now = time.time()
    recent = [t for t in _upload_history.get(client_key, []) if now - t < RATE_LIMIT_WINDOW_SECONDS]
    if len(recent) >= RATE_LIMIT_BATCHES:
        retry_after = int(RATE_LIMIT_WINDOW_SECONDS - (now - recent[0])) + 1
        raise HTTPException(
            429,
            detail=f"Too many uploads. Limit is {RATE_LIMIT_BATCHES} batches per minute — try again in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )
    recent.append(now)
    _upload_history[client_key] = recent


def _extract_text(filename: str, data: bytes) -> str:
    """Pull plain text out of a resume. Raises ValueError with a human reason."""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext in (".txt", ".md"):
        return data.decode("utf-8", errors="ignore")
    if ext == ".pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(data))
            pages = [(p.extract_text() or "") for p in reader.pages[:10]]
            text = "\n".join(pages).strip()
        except Exception as exc:
            raise ValueError(f"Could not read the PDF ({type(exc).__name__})")
        if not text:
            raise ValueError("PDF has no extractable text — it may be a scan")
        return text
    if ext == ".docx":
        try:
            import docx

            doc = docx.Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs).strip()
        except Exception as exc:
            raise ValueError(f"Could not read the Word file ({type(exc).__name__})")
    raise ValueError(f"Unsupported file type '{ext or filename}'")


EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?:\+91[\s-]?)?(?:\d[\s-]?){9,12}\d")
EXP_RE = re.compile(r"(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)", re.I)
CTC_RE = re.compile(r"(?:expected|ctc|salary)[^\n]{0,40}?(\d{1,3}(?:\.\d+)?)\s*(lpa|lakh|l\b|cr)", re.I)
TITLE_AT_RE = re.compile(r"^(.{3,60}?)\s+(?:at|@|,)\s+([A-Z][\w&.\- ]{1,40})\s*$", re.M)
# The single-letter forms must keep their trailing dot, otherwise "B.E." happily
# matches the "Be" in "Bengaluru".
DEGREE_RE = re.compile(
    r"\b((?:B\.?Tech|B\.?E\.|B\.?Sc|B\.?Des|B\.?A\.|M\.?Tech|M\.?Sc|M\.?Des|MBA|Ph\.?D|Bachelor|Master)"
    r"[^\n]{0,60})",
    re.I,
)
NOTICE_RE = re.compile(r"notice[^\n]{0,20}?(immediate|\d{1,3})", re.I)
NAME_STOPWORDS = {"resume", "curriculum", "vitae", "cv", "profile", "summary", "contact"}


def _guess_name(text: str, email: str) -> str:
    """Resumes almost always lead with the name. Fall back to the email local part."""
    for line in [l.strip() for l in text.splitlines()[:12] if l.strip()]:
        if len(line) > 50 or any(ch.isdigit() for ch in line) or "@" in line:
            continue
        words = line.replace(",", " ").split()
        if not 2 <= len(words) <= 4:
            continue
        if any(w.lower().strip(".:") in NAME_STOPWORDS for w in words):
            continue
        if all(w[:1].isupper() for w in words):
            return " ".join(words)
    if email:
        local = email.split("@")[0]
        return " ".join(p.capitalize() for p in re.split(r"[._-]+", local) if p)
    return ""


def _parse_resume(text: str) -> dict:
    """Best-effort structured fields from resume text. Never raises."""
    email_m = EMAIL_RE.search(text)
    email = email_m.group(0) if email_m else ""

    phone = ""
    for m in PHONE_RE.finditer(text):
        digits = re.sub(r"\D", "", m.group(0))
        if 10 <= len(digits) <= 12:
            phone = m.group(0).strip()
            break

    exp = 0.0
    exp_m = EXP_RE.search(text)
    if exp_m:
        try:
            exp = min(60.0, float(exp_m.group(1)))
        except ValueError:
            exp = 0.0

    title, company = "", ""
    t_m = TITLE_AT_RE.search(text)
    if t_m:
        title, company = t_m.group(1).strip(), t_m.group(2).strip()

    ctc = 0
    ctc_m = CTC_RE.search(text)
    if ctc_m:
        try:
            amount = float(ctc_m.group(1))
            ctc = int(amount * (10000000 if ctc_m.group(2).lower() == "cr" else 100000))
        except ValueError:
            ctc = 0

    edu_m = DEGREE_RE.search(text)
    education = edu_m.group(1).strip() if edu_m else ""

    notice = ""
    n_m = NOTICE_RE.search(text)
    if n_m:
        token = n_m.group(1).lower()
        notice = "Immediate" if token == "immediate" else f"{token} days"

    lower = text.lower()
    skills = sorted({v for k, v in SKILL_DICTIONARY.items() if k in lower})

    return {
        "name": _guess_name(text, email),
        "email": email,
        "phone": phone,
        "current_title": title,
        "current_company": company,
        "experience_years": exp,
        "expected_ctc": ctc,
        "education": education,
        "notice_period": notice,
        "skills": skills,
    }


DEFAULT_WEIGHTS = {"skills": 40, "experience": 25, "education": 15, "notice": 10, "cultural_fit": 10}

# Neutral rather than zero: a resume that didn't state something should not be
# scored as though it failed. Same principle as the filters.
UNKNOWN_COMPONENT_SCORE = 60


def _skill_component(candidate_skills: List[str], job: dict) -> float:
    """Weighted overlap. A job's 5-weight skill counts for more than a 3."""
    job_skills = job.get("skills") or []
    if not job_skills:
        return UNKNOWN_COMPONENT_SCORE
    have = {s.lower() for s in candidate_skills}
    total = sum(max(1, int(s.get("weight", 3))) for s in job_skills)
    got = sum(max(1, int(s.get("weight", 3))) for s in job_skills
              if str(s.get("name", "")).lower() in have)
    return 100.0 * got / total if total else UNKNOWN_COMPONENT_SCORE


def _experience_component(years: Optional[float], filters: dict) -> float:
    if years is None:
        return UNKNOWN_COMPONENT_SCORE
    minimum = filters.get("min_experience_years") or 0
    if minimum <= 0:
        return min(100.0, 60 + years * 5)
    if years >= minimum:
        # Meeting the bar is full marks; well beyond it is not better, and
        # rewarding it would just bias towards the most expensive candidates.
        return 100.0
    return max(0.0, 100.0 * years / minimum)


def _education_component(education: str, filters: dict) -> float:
    match = _matches_education(education, filters.get("education_preference", "No preference"))
    if match is None:
        return UNKNOWN_COMPONENT_SCORE
    return 100.0 if match else 0.0


def _notice_component(notice: str, filters: dict) -> float:
    days = _parse_notice_days(notice)
    if days is None:
        return UNKNOWN_COMPONENT_SCORE
    limit = filters.get("notice_period_max_days") or 90
    if days <= 0:
        return 100.0
    return max(0.0, 100.0 * (1 - min(1.0, days / max(1, limit))))


def _cultural_component(company: str, filters: dict) -> float:
    preferred = [c.lower() for c in (filters.get("preferred_companies") or [])]
    if not preferred:
        return UNKNOWN_COMPONENT_SCORE
    current = (company or "").lower()
    return 100.0 if any(pc in current for pc in preferred if pc) else 40.0


def score_candidate(candidate: dict, job: dict) -> dict:
    """Match score driven by the role's own scoring weights.

    Those five sliders are labelled "How the match score is calculated" in the
    UI. They were previously stored and never read — the score was pure skill
    overlap, so the whole panel was decorative. This makes them real.

    Returns the score plus its per-component breakdown, so a recruiter can see
    why someone scored what they did.
    """
    weights = {**DEFAULT_WEIGHTS, **(job.get("scoring_weights") or {})}
    filters = job.get("filters") or {}

    components = {
        "skills": _skill_component(candidate.get("skills") or [], job),
        "experience": _experience_component(candidate.get("experience_years"), filters),
        "education": _education_component(candidate.get("education", ""), filters),
        "notice": _notice_component(candidate.get("notice_period", ""), filters),
        "cultural_fit": _cultural_component(candidate.get("current_company", ""), filters),
    }

    total_weight = sum(max(0, weights.get(k, 0)) for k in components)
    if total_weight <= 0:
        # All sliders at zero: fall back to skills rather than returning 0 for
        # everyone, which would silently flatten the whole pipeline.
        return {"score": int(round(components["skills"])),
                "components": {k: round(v) for k, v in components.items()},
                "weights": weights}

    weighted = sum(components[k] * max(0, weights.get(k, 0)) for k in components) / total_weight
    return {
        "score": max(0, min(100, int(round(weighted)))),
        "components": {k: round(v) for k, v in components.items()},
        "weights": weights,
    }


def _score_against_job(candidate_skills: List[str], job: dict, candidate: Optional[dict] = None) -> int:
    """Convenience wrapper for the intake paths."""
    c = dict(candidate or {})
    c.setdefault("skills", candidate_skills)
    return score_candidate(c, job)["score"]


@app.post("/api/jobs/{job_id}/bulk-upload")
async def bulk_upload_resumes(job_id: str, request: Request, files: List[UploadFile] = File(...),
                              user: dict = Depends(require_user)):
    """Recruiter drops up to MAX_BULK_FILES resumes against one role.

    Every file is reported on individually — one unreadable resume never fails
    the batch. Candidates already in this role (matched on email) are skipped
    rather than duplicated.
    """
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")

    if not files:
        raise HTTPException(400, "No files were uploaded.")
    if len(files) > MAX_BULK_FILES:
        raise HTTPException(
            413,
            f"You can upload {MAX_BULK_FILES} resumes at a time — you selected {len(files)}. "
            f"Please split the batch.",
        )

    _rate_limit_check(request.client.host if request.client else "unknown")

    results = []
    created = skipped = failed = 0

    for upload in files:
        filename = upload.filename or "resume"
        try:
            data = await upload.read()
        except Exception:
            data = b""

        if not data:
            failed += 1
            results.append({"filename": filename, "status": "failed", "reason": "File is empty"})
            continue
        if len(data) > MAX_FILE_BYTES:
            failed += 1
            results.append({
                "filename": filename,
                "status": "failed",
                "reason": f"Larger than {MAX_FILE_BYTES // (1024 * 1024)} MB",
            })
            continue
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_RESUME_EXTS:
            failed += 1
            results.append({
                "filename": filename,
                "status": "failed",
                "reason": f"Unsupported type — accepts {', '.join(sorted(ALLOWED_RESUME_EXTS))}",
            })
            continue

        try:
            text = _extract_text(filename, data)
        except ValueError as exc:
            failed += 1
            results.append({"filename": filename, "status": "failed", "reason": str(exc)})
            continue

        parsed = _parse_resume(text)
        if not parsed["name"] and not parsed["email"]:
            failed += 1
            results.append({
                "filename": filename,
                "status": "failed",
                "reason": "Could not find a name or email in this resume",
            })
            continue

        # Same person, same role — attach the role instead of duplicating.
        if parsed["email"]:
            existing = await db.candidates.find_one({"email": parsed["email"]})
            if existing:
                skipped += 1
                if job_id not in (existing.get("role_ids") or []):
                    await db.candidates.update_one(
                        {"id": existing["id"]}, {"$addToSet": {"role_ids": job_id}}
                    )
                    reason = "Already in the system — added to this role"
                else:
                    reason = "Already a candidate for this role"
                results.append({
                    "filename": filename,
                    "status": "duplicate",
                    "candidate_id": existing["id"],
                    "name": existing["name"],
                    "email": existing["email"],
                    "reason": reason,
                })
                continue

        skills = parsed["skills"] or ["General"]
        score = _score_against_job(skills, job, parsed)
        candidate = Candidate(
            name=parsed["name"] or parsed["email"].split("@")[0],
            email=parsed["email"],
            phone=parsed["phone"],
            current_title=parsed["current_title"],
            current_company=parsed["current_company"],
            location="",
            experience_years=parsed["experience_years"],
            expected_ctc=parsed["expected_ctc"],
            notice_period=parsed["notice_period"],
            skills=skills,
            education=parsed["education"],
            resume_summary=text.strip()[:600],
            avatar="",
            match_score=score,
            stage="New",
            role_ids=[job_id],
            source="bulk_upload",
            source_filename=filename,
        )
        await db.candidates.insert_one(candidate.model_dump())
        await record_event(candidate.id, "added",
                           f"Added from {filename} by bulk upload.",
                           user.get("name") or user.get("email", "system"))
        created += 1
        results.append({
            "filename": filename,
            "status": "created",
            "candidate_id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "match_score": score,
            "skills": skills[:6],
        })

    # Duplicates can still attach an existing candidate to this role, so the
    # count has to be recomputed for those too — not just for new records.
    if created or skipped:
        count = await db.candidates.count_documents({"role_ids": job_id})
        await db.jobs.update_one({"id": job_id}, {"$set": {"candidates_count": count}})

    return {
        "job_id": job_id,
        "received": len(files),
        "created": created,
        "duplicates": skipped,
        "failed": failed,
        "limit": MAX_BULK_FILES,
        "results": results,
    }


# --------- Filter Preview: "how many candidates will pass?" ---------
def _parse_notice_days(s: str) -> Optional[int]:
    """Days of notice, or None when the resume didn't say.

    None is not 999 and not 0. Returning 999 auto-rejected anyone whose notice
    period we failed to parse; returning 0 (the old behaviour for the "—"
    placeholder) marked every self-applied candidate an immediate joiner.
    """
    if not s or not s.strip() or s.strip() in {"—", "-", "n/a", "na"}:
        return None
    low = s.lower()
    if "immediate" in low:
        return 0
    m = re.search(r"(\d+)", low)
    if not m:
        return None
    days = int(m.group(1))
    return days * 30 if "month" in low else days


def _edu_has(edu: str, tokens: List[str]) -> bool:
    """Substring matching is wrong here: "mba" sits inside "IIT Bo(mba)y" and
    "b.e." inside "Be(ngaluru)". Require a non-letter on both sides, which also
    works for dotted abbreviations where \\b does not.
    """
    return any(
        re.search(rf"(?<![a-z]){re.escape(t)}(?![a-z])", edu, re.I) for t in tokens
    )


def _matches_education(candidate_edu: str, pref: str) -> Optional[bool]:
    """True / False, or None when we don't know the candidate's education.

    Unknown must not mean rejected. Resume parsing misses education constantly,
    and silently dropping a good candidate over a parsing failure is far more
    expensive than showing the recruiter one extra profile.
    """
    if not pref or pref == "No preference":
        return True
    edu = (candidate_edu or "").strip().lower()
    if not edu or edu in {"—", "-"}:
        return None
    p = pref.lower()
    if "tier-1" in p or "tier 1" in p:
        return _edu_has(edu, ["iit", "nit", "iiit", "bits"])
    if "master" in p:
        return _edu_has(edu, ["m.tech", "m.sc", "m.des", "mba", "master", "isb", "iim", "phd"])
    if "cs" in p or "engineering" in p:
        return _edu_has(edu, ["b.tech", "b.e.", "m.tech", "cs", "engineering", "iit", "nit", "iiit", "bits"])
    if "bachelor" in p:
        return _edu_has(edu, ["b.tech", "b.e.", "b.sc", "b.des", "bachelor", "b.a.",
                              "m.tech", "m.sc", "mba", "master", "phd"])
    return True


def _matches_location(candidate_loc: str, accepted: set) -> Optional[bool]:
    if not accepted:
        return True
    loc = (candidate_loc or "").strip().lower()
    if not loc or loc in {"—", "-"}:
        return None
    if "remote" in loc and "remote" in accepted:
        return True
    return any(a in loc for a in accepted)


def _evaluate_filters(cands: List[dict], filters: dict) -> dict:
    """Apply a filter set to a pool and report who fails, and why.

    Unknown values never reject. They are counted separately so the recruiter
    can see how much of the pool is being taken on trust.
    """
    min_exp = filters.get("min_experience_years") or 0
    edu_pref = filters.get("education_preference", "No preference")
    max_notice = filters.get("notice_period_max_days")
    must_have = {s.lower() for s in (filters.get("must_have_skills") or [])}
    locations = {l.lower() for l in (filters.get("locations") or [])}

    breakdown = dict.fromkeys(
        ["failed_experience", "failed_education", "failed_notice",
         "failed_must_have", "failed_location"], 0)
    unknown = dict.fromkeys(["unknown_education", "unknown_notice", "unknown_location"], 0)
    passing = 0

    for c in cands:
        fail = False
        if (c.get("experience_years") or 0) < min_exp:
            breakdown["failed_experience"] += 1
            fail = True

        edu_ok = _matches_education(c.get("education", ""), edu_pref)
        if edu_ok is None:
            unknown["unknown_education"] += 1
        elif not edu_ok:
            breakdown["failed_education"] += 1
            fail = True

        if max_notice is not None:
            notice = _parse_notice_days(c.get("notice_period", ""))
            if notice is None:
                unknown["unknown_notice"] += 1
            elif notice > max_notice:
                breakdown["failed_notice"] += 1
                fail = True

        if must_have:
            cand_skills = {s.lower() for s in (c.get("skills") or [])}
            if not must_have.issubset(cand_skills):
                breakdown["failed_must_have"] += 1
                fail = True

        loc_ok = _matches_location(c.get("location", ""), locations)
        if loc_ok is None:
            unknown["unknown_location"] += 1
        elif not loc_ok:
            breakdown["failed_location"] += 1
            fail = True

        if not fail:
            passing += 1

    return {"total": len(cands), "passing": passing, "breakdown": breakdown, "unknown": unknown}


@app.post("/api/candidates/preview-filter")
async def preview_filter(payload: FilterPreviewRequest, user: dict = Depends(require_user)):
    cands = await db.candidates.find({}).to_list(10000)
    return _evaluate_filters(cands, payload.filters or {})


# ---------- Candidates ----------
@app.get("/api/candidates")
async def list_candidates(job_id: Optional[str] = None, stage: Optional[str] = None,
                          q: Optional[str] = None, unassigned: bool = False,
                          limit: int = 200, offset: int = 0,
                          user: dict = Depends(require_user)):
    """Paginated. The previous to_list(1000) silently dropped everyone past the
    thousandth candidate, with no indication anything was missing.

    Search is done in the query rather than in Python so it spans the whole
    collection instead of only the current page.
    """
    limit = max(1, min(500, limit))
    offset = max(0, offset)

    query: dict = {}
    if job_id:
        query["role_ids"] = job_id
    if unassigned:
        query["role_ids"] = {"$size": 0}
    if stage:
        query["stage"] = stage
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"current_company": rx},
                        {"current_title": rx}, {"email": rx}, {"skills": rx}]

    total = await db.candidates.count_documents(query)
    cursor = db.candidates.find(query).sort("match_score", -1).skip(offset).limit(limit)
    items = [strip_mongo(c) for c in await cursor.to_list(limit)]
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + len(items) < total,
    }


@app.get("/api/candidates/{cid}")
async def get_candidate(cid: str, user: dict = Depends(require_user)):
    c = await db.candidates.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Candidate not found")
    return strip_mongo(c)


@app.get("/api/candidates/{cid}/score")
async def candidate_score(cid: str, job_id: str, user: dict = Depends(require_user)):
    """Why this candidate scored what they did, against one role."""
    c = await db.candidates.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Candidate not found")
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")
    return {"job_id": job_id, "job_title": job["title"], **score_candidate(c, job)}


@app.patch("/api/candidates/{cid}")
async def update_candidate(cid: str, payload: CandidateUpdate, user: dict = Depends(require_user)):
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not changes:
        raise HTTPException(400, "No fields to update.")
    result = await db.candidates.update_one({"id": cid}, {"$set": changes})
    if result.matched_count == 0:
        raise HTTPException(404, "Candidate not found")
    actor = user.get("name") or user.get("email", "system")
    if "rating" in changes:
        await record_event(cid, "rated", f"Rated {changes['rating']} out of 5.", actor)
    if "notes" in changes:
        await record_event(cid, "note", "Notes updated.", actor)
    c = await db.candidates.find_one({"id": cid})
    # update job candidate counts if role_ids changed
    if "role_ids" in changes:
        await _recount_all_jobs()
    return strip_mongo(c)


@app.post("/api/candidates/{cid}/assign-roles")
async def assign_roles(cid: str, payload: RoleAssignment, user: dict = Depends(require_user)):
    result = await db.candidates.update_one({"id": cid}, {"$set": {"role_ids": payload.role_ids}})
    if result.matched_count == 0:
        raise HTTPException(404, "Candidate not found")
    await record_event(cid, "roles_changed", f"Assigned to {len(payload.role_ids)} role(s).",
                       user.get("name") or user.get("email", "system"))
    await _recount_all_jobs()
    c = await db.candidates.find_one({"id": cid})
    return strip_mongo(c)


@app.post("/api/candidates/{cid}/stage")
async def set_stage(cid: str, payload: StageUpdate, user: dict = Depends(require_user)):
    before = await db.candidates.find_one({"id": cid})
    if not before:
        raise HTTPException(404, "Candidate not found")
    await db.candidates.update_one({"id": cid}, {"$set": {"stage": payload.stage}})
    if before.get("stage") != payload.stage:
        await db.events.insert_one({
            "id": str(uuid.uuid4()), "candidate_id": cid, "kind": "stage_changed",
            "summary": f"Stage moved from {before.get('stage')} to {payload.stage}.",
            "from_stage": before.get("stage"), "to_stage": payload.stage,
            "actor": user.get("name") or user.get("email", "system"), "at": now_iso(),
        })
    c = await db.candidates.find_one({"id": cid})
    return strip_mongo(c)


# ---------- Public Apply (auto-apply from shareable link) ----------
# PUBLIC — candidates parse their own resume before applying. Rate limited by
# IP because it is unauthenticated and does real file work.
PARSE_RATE_LIMIT = 20
_parse_history: dict = {}


@app.post("/api/apply/{slug}/parse-resume")
async def parse_resume_public(slug: str, request: Request, file: UploadFile = File(...)):
    job = await db.jobs.find_one({"share_slug": slug})
    if not job:
        raise HTTPException(404, "Job not found")

    key = request.client.host if request.client else "unknown"
    now = time.time()
    recent = [t for t in _parse_history.get(key, []) if now - t < 60]
    if len(recent) >= PARSE_RATE_LIMIT:
        raise HTTPException(429, "Too many uploads. Please wait a minute and try again.")
    recent.append(now)
    _parse_history[key] = recent

    filename = file.filename or "resume"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_RESUME_EXTS:
        raise HTTPException(400, f"We can read {', '.join(sorted(ALLOWED_RESUME_EXTS))} files.")
    data = await file.read()
    if not data:
        raise HTTPException(400, "That file is empty.")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, f"Please keep your resume under {MAX_FILE_BYTES // (1024 * 1024)} MB.")

    try:
        text = _extract_text(filename, data)
    except ValueError as exc:
        raise HTTPException(422, f"{exc}. You can still fill the form in yourself.")

    parsed = _parse_resume(text)
    # Report which fields we actually found, so the UI can tell the truth about
    # what was extracted rather than animating a fixed list of claims.
    found = [k for k in ("name", "email", "phone", "current_title", "current_company",
                         "experience_years", "expected_ctc", "education")
             if parsed.get(k)]
    return {"parsed": parsed, "found": found, "filename": filename,
            "resume_text": text[:50000]}


# PUBLIC — the candidate-facing application endpoint.
@app.post("/api/apply/{slug}")
async def apply_to_job(slug: str, payload: CandidateApply):
    job = await db.jobs.find_one({"share_slug": slug})
    if not job:
        raise HTTPException(404, "Job not found")

    # mock: derive skills from resume_text using dictionary
    text = ((payload.resume_text or "") + " " + payload.current_title).lower()
    matched_skills = sorted({v for k, v in SKILL_DICTIONARY.items() if k in text})
    score = _score_against_job(matched_skills, job, {
        "experience_years": payload.experience_years,
        "current_company": payload.current_company,
        # A self-applied candidate states neither, so both score neutral rather
        # than as failures.
        "education": "",
        "notice_period": "",
    })
    email = payload.email.lower().strip()

    # Someone re-applying is the same person, not a second candidate. Refresh
    # what they told us this time and attach the role; never create a duplicate,
    # and never overwrite the recruiter's own stage, rating or notes.
    existing = await db.candidates.find_one({"email": email})
    if existing:
        already_on_role = job["id"] in (existing.get("role_ids") or [])
        updates = {
            "name": payload.name,
            "phone": payload.phone or existing.get("phone", ""),
            "current_title": payload.current_title or existing.get("current_title", ""),
            "current_company": payload.current_company or existing.get("current_company", ""),
            "experience_years": payload.experience_years,
            "expected_ctc": payload.expected_ctc,
            "applied_at": now_iso(),
        }
        if matched_skills:
            updates["skills"] = matched_skills
        if payload.resume_text:
            updates["resume_summary"] = payload.resume_text[:600]
        if not already_on_role:
            updates["match_score"] = score
        await db.candidates.update_one(
            {"id": existing["id"]},
            {"$set": updates, "$addToSet": {"role_ids": job["id"]}},
        )
        await _recount_all_jobs()
        await record_event(existing["id"], "applied",
                           f"Re-applied to {job['title']}; details updated.", "candidate")
        return {
            "ok": True,
            "candidate_id": existing["id"],
            "match_score": score if not already_on_role else existing.get("match_score", score),
            "duplicate": True,
            "message": (
                "You've already applied to this role — we've updated your details."
                if already_on_role
                else "Welcome back. We've added you to this role."
            ),
        }

    c = Candidate(
        name=payload.name,
        email=email,
        phone=payload.phone,
        current_title=payload.current_title,
        current_company=payload.current_company,
        # Empty, not an em dash: "—" is a value, and a value that parses as
        # "immediate joiner" and fails every education filter.
        location="",
        experience_years=payload.experience_years,
        expected_ctc=payload.expected_ctc,
        notice_period="",
        skills=matched_skills,
        education="",
        resume_summary=(payload.resume_text or "")[:600]
        or f"{payload.current_title} at {payload.current_company}".strip(" at"),
        avatar="",
        match_score=score,
        stage="New",
        role_ids=[job["id"]],
        auto_applied=True,
        source="public_apply",
    )
    await db.candidates.insert_one(c.model_dump())
    await record_event(c.id, "applied", f"Applied to {job['title']} via the public link.", "candidate")
    await db.jobs.update_one({"id": job["id"]}, {"$inc": {"candidates_count": 1}})
    return {"ok": True, "candidate_id": c.id, "match_score": score, "duplicate": False}


# ---------- Onboarding ----------
@app.get("/api/onboarding")
async def get_onboarding(user: dict = Depends(require_user)):
    doc = await db.workspace.find_one({"id": "workspace"})
    return strip_mongo(doc) if doc else {"completed": False}


@app.post("/api/onboarding")
async def save_onboarding(payload: OnboardingPayload, user: dict = Depends(require_user)):
    """Persist onboarding. All three steps were previously discarded on Finish.

    Creates the first role if one was named, so "your first hire" actually
    produces something instead of dropping the recruiter on an empty form.
    """
    doc = {
        "id": "workspace",
        "company_name": payload.company_name.strip(),
        "company_size": payload.company_size,
        "industry": payload.industry,
        "invite_emails": [e.lower() for e in payload.invite_emails],
        "completed": True,
        "completed_at": now_iso(),
        "completed_by": user.get("email", ""),
    }
    await db.workspace.update_one({"id": "workspace"}, {"$set": doc}, upsert=True)

    created_job = None
    title = payload.role_title.strip()
    if title:
        existing = await db.jobs.find_one({"title": title})
        if existing:
            created_job = strip_mongo(existing)
        else:
            job = Job(title=title, department=payload.role_department,
                      location=payload.role_location or "Remote")
            await db.jobs.insert_one(job.model_dump())
            created_job = job.model_dump()

    return {"ok": True, "workspace": doc, "job": created_job}


# ---------- Analytics ----------
@app.get("/api/analytics/summary")
async def analytics_summary(user: dict = Depends(require_user)):
    total_jobs = await db.jobs.count_documents({})
    total_candidates = await db.candidates.count_documents({})
    stages = ["New", "Shortlisted", "Interview", "Offer", "Rejected"]
    funnel = {st: await db.candidates.count_documents({"stage": st}) for st in stages}

    # These two were hardcoded to 2.4 and 0.68 — fabricated numbers presented on
    # the dashboard as this team's metrics. Both are now computed, and report
    # None when there isn't enough history to say anything honest.
    shortlist_events = await db.events.find(
        {"kind": "stage_changed", "to_stage": {"$in": ["Shortlisted", "Interview", "Offer"]}}
    ).to_list(5000)
    seen, durations = set(), []
    for ev in sorted(shortlist_events, key=lambda e: e.get("at", "")):
        cid = ev.get("candidate_id")
        if cid in seen:
            continue  # first advance only, not every subsequent move
        seen.add(cid)
        cand = await db.candidates.find_one({"id": cid})
        if not cand:
            continue
        try:
            delta = datetime.fromisoformat(ev["at"]) - datetime.fromisoformat(cand["applied_at"])
        except (KeyError, TypeError, ValueError):
            continue
        if delta.total_seconds() >= 0:
            durations.append(delta.total_seconds() / 86400)

    avg_days = round(sum(durations) / len(durations), 1) if durations else None

    self_applied = await db.candidates.count_documents({"source": "public_apply"})
    conversion = round(self_applied / total_candidates, 2) if total_candidates else None

    return {
        "total_jobs": total_jobs,
        "total_candidates": total_candidates,
        "funnel": funnel,
        "avg_time_to_shortlist_days": avg_days,
        "avg_time_to_shortlist_sample": len(durations),
        "self_applied_share": conversion,
        "self_applied_count": self_applied,
        # Kept for compatibility with the existing dashboard tile.
        "auto_apply_conversion": conversion,
    }


@app.get("/api/candidates/{cid}/events")
async def candidate_events(cid: str, user: dict = Depends(require_user)):
    if not await db.candidates.find_one({"id": cid}):
        raise HTTPException(404, "Candidate not found")
    events = await db.events.find({"candidate_id": cid}).sort("at", -1).to_list(200)
    return [strip_mongo(e) for e in events]
